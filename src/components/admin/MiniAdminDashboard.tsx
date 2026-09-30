import React, { useState, useEffect } from 'react';
import {
  Users, Crown, LogOut, Search, Copy, Check, MessageCircle,
  RefreshCw, BarChart3, Building, MapPin, UserPlus,
  TrendingUp, CheckCircle2, AlertCircle, X, Store
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { adminService } from '../../db/services/adminService';
import { TeamLeaderDashboardData, CommercialAgent } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const MiniAdminDashboard: React.FC = () => {
  const { activeTeamLeader, logoutMiniAdmin } = useAppStore();
  
  const [data, setData] = useState<TeamLeaderDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Recrutement
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [recruitFullName, setRecruitFullName] = useState('');
  const [recruitPhone, setRecruitPhone] = useState('');
  const [recruitZone, setRecruitZone] = useState('');
  const [recruitCustomCode, setRecruitCustomCode] = useState('');
  const [recruitAutoCode, setRecruitAutoCode] = useState(true);
  const [recruitNotes, setRecruitNotes] = useState('');
  const [isSavingRecruit, setIsSavingRecruit] = useState(false);
  const [recruitError, setRecruitError] = useState('');
  const [recruitSuccessModal, setRecruitSuccessModal] = useState<CommercialAgent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadLeaderData = async () => {
    if (!activeTeamLeader) return;
    setIsLoading(true);
    try {
      const res = await adminService.getTeamLeaderDashboardData(activeTeamLeader.id);
      setData(res);
    } catch (e) {
      console.error('Erreur chargement dashboard chef d\'équipe:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderData();
  }, [activeTeamLeader]);

  if (!activeTeamLeader) {
    return null;
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenRecruitModal = () => {
    setRecruitFullName('');
    setRecruitPhone('');
    setRecruitZone(activeTeamLeader.zone || '');
    setRecruitCustomCode('');
    setRecruitAutoCode(true);
    setRecruitNotes('');
    setRecruitError('');
    setIsRecruitModalOpen(true);
  };

  const handleSaveRecruit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruitFullName.trim()) {
      setRecruitError('Veuillez saisir le nom complet du commercial.');
      return;
    }
    if (!recruitPhone.trim()) {
      setRecruitError('Veuillez saisir le numéro WhatsApp du commercial.');
      return;
    }

    setIsSavingRecruit(true);
    setRecruitError('');

    try {
      const newAgent = await adminService.saveCommercialAgent({
        fullName: recruitFullName.trim(),
        phone: recruitPhone.trim(),
        code: recruitAutoCode ? undefined : recruitCustomCode.trim(),
        teamId: data?.team.id || activeTeamLeader.teamId,
        teamName: data?.team.name || activeTeamLeader.teamName,
        zone: recruitZone.trim() || activeTeamLeader.zone,
        status: 'active',
        notes: recruitNotes.trim() || undefined
      });

      setIsRecruitModalOpen(false);
      setRecruitSuccessModal(newAgent);
      await loadLeaderData();
    } catch (err: any) {
      setRecruitError(err.message || 'Erreur lors de l\'enregistrement du commercial.');
    } finally {
      setIsSavingRecruit(false);
    }
  };

  const handleSendWhatsAppKit = (agent: CommercialAgent) => {
    const url = adminService.getWhatsAppCommercialKitUrl(agent);
    window.open(url, '_blank');
  };

  const filteredCommercials = (data?.commercials || []).filter(c => {
    const q = searchQuery.toLowerCase();
    const inName = (c.name || '').toLowerCase().includes(q);
    const inCode = (c.code || '').toLowerCase().includes(q);
    const inPhone = (c.phone || '').toLowerCase().includes(q);
    return inName || inCode || inPhone;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================= */}
      {/* EN-TÊTE SUPÉRIEUR MINI-ADMIN */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-white text-base tracking-tight">
                  FasoCarnet
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  Chef d'Équipe
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-1.5 font-medium">
                <span>👑 {activeTeamLeader.fullName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-bold">{data?.team.name || activeTeamLeader.teamName}</span>
                {activeTeamLeader.zone && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 flex items-center">
                      <MapPin className="w-3 h-3 text-slate-500 mr-0.5 inline" />
                      {activeTeamLeader.zone}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={loadLeaderData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={logoutMiniAdmin}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold border border-red-800/40 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPS DU TABLEAU DE BORD */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Bannière Bienvenue & Action Recrutement */}
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
              <Building className="w-3.5 h-3.5" />
              <span>{data?.team.name || activeTeamLeader.teamName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-display">
              Gestion de votre Équipe Commerciale
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Suivez les résultats de vos commerciaux sur le terrain, recrutez de nouveaux agents et générez automatiquement leurs codes d'affiliation en direct.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenRecruitModal}
            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer font-display shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>+ RECRUTER UN COMMERCIAL</span>
          </button>
        </div>

        {/* Grille des 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Commerciaux</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-display">
              {data?.membersCount || 0}
            </div>
            <p className="text-[11px] text-slate-500">Membres de votre flotte</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Boutiques Inscrites</span>
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-display">
              {data?.totalShopsReferred || 0}
            </div>
            <p className="text-[11px] text-slate-500">Recrutées par votre équipe</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Abonnés Payants</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-display">
              {data?.activeSubscribedShops || 0}
            </div>
            <p className="text-[11px] text-slate-500">Actifs ce mois-ci</p>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 bg-gradient-to-b from-slate-900 to-amber-950/20 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-amber-300 text-xs font-bold">
              <span>Commissions Semaine</span>
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-display">
              {formatCurrency(data?.currentWeekCommissionTotal || 0)}
            </div>
            <p className="text-[11px] text-amber-200/60">À verser aux commerciaux (15%)</p>
          </div>
        </div>

        {/* Section Liste des Commerciaux de l'Équipe */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white font-display flex items-center space-x-2">
                <span>Commerciaux de votre Équipe</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-sans">
                  {filteredCommercials.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Suivi individuel des parrainages et commissions de vos recrues
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher commercial, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {filteredCommercials.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-300 text-sm">
                {searchQuery ? 'Aucun commercial ne correspond à votre recherche' : 'Aucun commercial dans votre équipe pour le moment'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Commencez à recruter vos premiers commerciaux pour déployer FasoCarnet dans votre zone.
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenRecruitModal}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center space-x-2 font-display cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ajouter une première recrue</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCommercials.map((comm) => {
                const isCopied = copiedId === comm.code;
                const agentObj: CommercialAgent = {
                  id: `agent_${comm.code}`,
                  code: comm.code,
                  fullName: comm.name || `Commercial ${comm.code}`,
                  phone: comm.phone || '',
                  teamId: data?.team.id,
                  teamName: data?.team.name,
                  zone: activeTeamLeader.zone,
                  status: 'active',
                  createdAt: new Date().toISOString()
                };

                return (
                  <div
                    key={comm.code}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-white text-sm font-display">
                            {comm.name || `Commercial (${comm.code})`}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Actif
                          </span>
                        </div>
                        {comm.phone && (
                          <p className="text-xs text-slate-400 font-mono">
                            📞 +226 {comm.phone}
                          </p>
                        )}
                      </div>

                      {/* Code d'affiliation */}
                      <button
                        type="button"
                        onClick={() => handleCopy(comm.code, comm.code)}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-amber-300 font-mono font-black text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Copier le code d'affiliation"
                      >
                        <span>{comm.code}</span>
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Performances individuelles */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold">Boutiques</div>
                        <div className="text-sm font-black text-white">{comm.totalShopsReferred}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold">Abonnés</div>
                        <div className="text-sm font-black text-emerald-400">{comm.activeSubscribedShops}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold">Commissions</div>
                        <div className="text-sm font-black text-amber-400">
                          {formatCurrency(comm.currentWeekCommissionDue)}
                        </div>
                      </div>
                    </div>

                    {/* Action WhatsApp Pack Onboarding */}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {comm.referredShops.length} boutique(s) inscrite(s)
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppKit(agentObj)}
                        className="px-3 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-bold rounded-xl border border-[#25D366]/30 flex items-center space-x-1.5 transition-all cursor-pointer font-display"
                        title="Renvoyer le kit commercial WhatsApp avec son lien"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Pack WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODALE RECRUTEMENT NOUVEAU COMMERCIAL */}
      {/* ========================================================= */}
      {isRecruitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base font-display">
                    Recruter un Commercial
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rattaché à : <strong className="text-amber-400">{data?.team.name || activeTeamLeader.teamName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecruitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecruit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom et Prénom du commercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Moussa Kaboré"
                  value={recruitFullName}
                  onChange={(e) => setRecruitFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro WhatsApp (8 chiffres) *
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono font-bold">
                    +226
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="70 12 34 56"
                    value={recruitPhone}
                    onChange={(e) => setRecruitPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Zone d'intervention
                </label>
                <input
                  type="text"
                  placeholder="Ex: Grand Marché, Secteur 15..."
                  value={recruitZone}
                  onChange={(e) => setRecruitZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Mode code unique */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Code commercial d'affiliation</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-amber-400 text-[11px] font-semibold">
                    <input
                      type="checkbox"
                      checked={recruitAutoCode}
                      onChange={(e) => setRecruitAutoCode(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Génération auto</span>
                  </label>
                </div>

                {!recruitAutoCode ? (
                  <input
                    type="text"
                    placeholder="Ex: MOUSSA7, ALI226"
                    value={recruitCustomCode}
                    onChange={(e) => setRecruitCustomCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono font-bold uppercase focus:border-amber-500 outline-none"
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Le code sera généré automatiquement à partir de son prénom (ex: <span className="text-amber-400 font-mono font-bold">MOUSSA226</span>).
                  </p>
                )}
              </div>

              {recruitError && (
                <div className="p-2.5 bg-red-950/50 border border-red-800/60 rounded-xl text-xs font-semibold text-red-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{recruitError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecruitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecruit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center space-x-1.5 transition-all cursor-pointer font-display disabled:opacity-50"
                >
                  {isSavingRecruit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>VALIDER ET ENREGISTRER</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE SUCCÈS RECRUTEMENT & PARTAGE PACK WHATSAPP */}
      {/* ========================================================= */}
      {recruitSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-lg font-display">
                Commercial Enregistré avec Succès !
              </h3>
              <p className="text-xs text-slate-400">
                La recrue <strong className="text-white">{recruitSuccessModal.fullName}</strong> est désormais rattachée à votre équipe.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Code commercial unique généré
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-mono font-black text-amber-400 tracking-wider">
                  {recruitSuccessModal.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(recruitSuccessModal.code, 'success_code')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Copier le code"
                >
                  {copiedId === 'success_code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Envoyez-lui immédiatement son pack d'onboarding sur WhatsApp pour qu'il commence à recruter sur le terrain.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendWhatsAppKit(recruitSuccessModal)}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 active:scale-98 transition-all cursor-pointer font-display"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer le Pack Onboarding par WhatsApp (+226 {recruitSuccessModal.phone})</span>
              </button>

              <button
                type="button"
                onClick={() => setRecruitSuccessModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
