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
    const url = adminService.getWhatsAppCommercialKitUrl(agent, activeTeamLeader.fullName);
    window.open(url, '_blank');
  };

  const handleSendWhatsAppPerformance = (comm: any) => {
    const url = adminService.getWhatsAppAffiliateStatementUrl(comm);
    window.open(url, '_blank');
  };

  const handleSendWhatsAppReminder = (comm: any) => {
    const url = adminService.getWhatsAppCommercialReminderUrl(comm, activeTeamLeader.fullName);
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
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 sm:px-6 sm:py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-display font-black text-white text-sm sm:text-base tracking-tight truncate">
                  FasoCarnet
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-bold shrink-0">
                  Chef d'Équipe
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium leading-tight mt-0.5">
                <span className="truncate max-w-[120px] sm:max-w-none">👑 {activeTeamLeader.fullName}</span>
                <span className="text-slate-600 hidden xs:inline">•</span>
                <span className="text-amber-400 font-bold truncate max-w-[130px] sm:max-w-none">{data?.team.name || activeTeamLeader.teamName}</span>
                {activeTeamLeader.zone && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-slate-400 flex items-center shrink-0">
                      <MapPin className="w-3 h-3 text-slate-500 mr-0.5 inline shrink-0" />
                      {activeTeamLeader.zone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              type="button"
              onClick={loadLeaderData}
              disabled={isLoading}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-700/60"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={logoutMiniAdmin}
              className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-red-300 text-xs font-bold border border-red-800/40 transition-all flex items-center space-x-1.5 cursor-pointer min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPS DU TABLEAU DE BORD */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
        
        {/* Bannière Bienvenue & Action Recrutement */}
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-[11px] font-bold border border-amber-500/30">
              <Building className="w-3.5 h-3.5" />
              <span>{data?.team.name || activeTeamLeader.teamName}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white font-display">
              Gestion de votre Équipe Commerciale
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Suivez les résultats individuels de vos commerciaux, recrutez de nouveaux agents, envoyez les bilans de commissions et relancez votre flotte sur WhatsApp en direct.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenRecruitModal}
            className="w-full sm:w-auto px-5 py-3 sm:py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer font-display shrink-0 min-h-[44px]"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ RECRUTER UN COMMERCIAL</span>
          </button>
        </div>

        {/* Grille des 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Commerciaux</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display truncate">
              {data?.membersCount || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Membres de votre flotte</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Boutiques Inscrites</span>
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display truncate">
              {data?.totalShopsReferred || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Recrutées par votre équipe</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Abonnés Payants</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display truncate">
              {data?.activeSubscribedShops || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Actifs ce mois-ci</p>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 bg-gradient-to-b from-slate-900 to-amber-950/20 p-3.5 sm:p-4 rounded-2xl space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-amber-300 text-xs font-bold">
              <span>Commissions Semaine</span>
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-400 font-display truncate">
              {formatCurrency(data?.currentWeekCommissionTotal || 0)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-200/60 truncate">À verser aux commerciaux (15%)</p>
          </div>
        </div>

        {/* Section Liste des Commerciaux de l'Équipe */}
        <div className="space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-display flex items-center space-x-2">
                <span>Commerciaux de votre Équipe</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-sans">
                  {filteredCommercials.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Suivi individuel, rappels terrain et transmission des relevés de commissions
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
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-center space-y-3">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
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
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center space-x-2 font-display cursor-pointer transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ajouter une première recrue</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all flex flex-col justify-between shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h4 className="font-black text-white text-sm font-display truncate">
                            {comm.name || `Commercial (${comm.code})`}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold">
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
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/30 rounded-lg text-amber-300 font-mono font-black text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                        title="Copier le code d'affiliation"
                      >
                        <span>{comm.code}</span>
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Performances individuelles */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-950/60 p-2 sm:p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">Boutiques</div>
                        <div className="text-xs sm:text-sm font-black text-white font-mono">{comm.totalShopsReferred}</div>
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">Abonnés</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono">{comm.activeSubscribedShops}</div>
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">Commissions</div>
                        <div className="text-xs sm:text-sm font-black text-amber-400 font-mono truncate">
                          {formatCurrency(comm.currentWeekCommissionDue)}
                        </div>
                      </div>
                    </div>

                    {/* Actions WhatsApp Prérogatives Mini-Admin : Relevé Performance, Rappel Terrain & Pack */}
                    <div className="pt-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppPerformance(comm)}
                        className="flex-1 min-w-[120px] py-2 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 active:scale-95 text-emerald-300 text-[11px] font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center space-x-1 transition-all cursor-pointer font-display"
                        title="Envoyer le relevé officiel des commissions et performances sur WhatsApp"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Bilan Hebdo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(comm)}
                        className="flex-1 min-w-[110px] py-2 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 text-[11px] font-bold rounded-xl border border-amber-500/30 flex items-center justify-center space-x-1 transition-all cursor-pointer font-display"
                        title="Envoyer un message de rappel et d'encouragement terrain sur WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rappel WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppKit(agentObj)}
                        className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1 transition-all cursor-pointer font-display"
                        title="Renvoyer le pack commercial et le code d'affiliation"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Pack Code</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm sm:text-base font-display">
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
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
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
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro WhatsApp (8 chiffres) *
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-400 font-mono font-bold">
                    +226
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="70 12 34 56"
                    value={recruitPhone}
                    onChange={(e) => setRecruitPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none font-mono"
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
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer min-h-[40px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecruit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center space-x-1.5 transition-all cursor-pointer font-display disabled:opacity-50 min-h-[40px] active:scale-95"
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 text-center max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-base sm:text-lg font-display">
                Commercial Enregistré avec Succès !
              </h3>
              <p className="text-xs text-slate-400">
                La recrue <strong className="text-white">{recruitSuccessModal.fullName}</strong> est désormais rattachée à votre équipe.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Code commercial unique généré
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-wider">
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
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 active:scale-98 transition-all cursor-pointer font-display min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer le Pack Onboarding par WhatsApp (+226 {recruitSuccessModal.phone})</span>
              </button>

              <button
                type="button"
                onClick={() => setRecruitSuccessModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer min-h-[40px]"
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
