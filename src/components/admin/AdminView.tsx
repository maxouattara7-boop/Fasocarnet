import React, { useState, useEffect } from 'react';
import {
  Store, Crown, Lock, LogOut, Search, Copy, Check, Trash2,
  MessageCircle, ArrowLeft, Eye, EyeOff, RefreshCw,
  BarChart3, Download, Users,
  MapPin, Send, CheckCircle2, Megaphone,
  X, ChevronRight, Calendar, Phone, User, Building, FileText, Clock, Wallet,
  Plus, Edit2, Zap, Sparkles, UserPlus
} from 'lucide-react';
import { adminService, AdminStats, ShopAdminDetails } from '../../db/services/adminService';
import { syncService } from '../../db/services/syncService';
import { 
  ExtendedAdminAnalytics, 
  AdminBroadcastMessage, 
  CommercialAffiliateReport, 
  CommercialTeam, 
  CommercialTeamReport,
  CommercialAgent,
  TeamLeaderAccount
} from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AdminViewProps {
  onClose: () => void;
}

type AdminTab = 'shops' | 'analytics' | 'affiliates' | 'broadcast' | 'whatsapp';

const getInitialAdminTab = (): AdminTab => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('fasocarnet_admin_tab');
    if (saved === 'shops' || saved === 'analytics' || saved === 'affiliates' || saved === 'broadcast' || saved === 'whatsapp') {
      return saved as AdminTab;
    }
  }
  return 'shops';
};

export const AdminView: React.FC<AdminViewProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialAdminTab);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const setActiveTab = (tab: AdminTab) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fasocarnet_admin_tab', tab);
    }
    setActiveTabState(tab);
  };

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<ExtendedAdminAnalytics | null>(null);
  const [shops, setShops] = useState<ShopAdminDetails[]>([]);
  const [affiliates, setAffiliates] = useState<CommercialAffiliateReport[]>([]);
  const [teamsReports, setTeamsReports] = useState<CommercialTeamReport[]>([]);
  const [unassignedCommercials, setUnassignedCommercials] = useState<CommercialAffiliateReport[]>([]);
  const [commercialAgents, setCommercialAgents] = useState<CommercialAgent[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderAccount[]>([]);
  const [affiliateSubTab, setAffiliateSubTab] = useState<'agents' | 'teams' | 'leaders' | 'individual'>('agents');

  // Modale création / édition de Chef d'équipe (Mini-Admin)
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<TeamLeaderAccount | null>(null);
  const [leaderFormFullName, setLeaderFormFullName] = useState('');
  const [leaderFormPhone, setLeaderFormPhone] = useState('');
  const [leaderFormPin, setLeaderFormPin] = useState('');
  const [leaderFormTeamId, setLeaderFormTeamId] = useState('');
  const [leaderFormZone, setLeaderFormZone] = useState('');
  const [leaderFormStatus, setLeaderFormStatus] = useState<'active' | 'inactive'>('active');
  const [isSavingLeader, setIsSavingLeader] = useState(false);
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
  const [leaderSuccessMsg, setLeaderSuccessMsg] = useState('');
  const [leaderWelcomeModal, setLeaderWelcomeModal] = useState<{ leader: TeamLeaderAccount; rawPin?: string } | null>(null);

  // Modale création / édition de commercial
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CommercialAgent | null>(null);
  const [agentFormFullName, setAgentFormFullName] = useState('');
  const [agentFormPhone, setAgentFormPhone] = useState('');
  const [agentFormCode, setAgentFormCode] = useState('');
  const [agentFormTeamId, setAgentFormTeamId] = useState('');
  const [agentFormZone, setAgentFormZone] = useState('');
  const [agentFormStatus, setAgentFormStatus] = useState<'active' | 'inactive'>('active');
  const [agentFormNotes, setAgentFormNotes] = useState('');
  const [agentFormAutoCode, setAgentFormAutoCode] = useState(true);
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [agentSuccessModal, setAgentSuccessModal] = useState<CommercialAgent | null>(null);
  const [agentCopiedId, setAgentCopiedId] = useState<string | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentFilterTeam, setAgentFilterTeam] = useState('all');
  const [agentFilterStatus, setAgentFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modale création / édition d'équipe
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<CommercialTeam | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormLeaderName, setTeamFormLeaderName] = useState('');
  const [teamFormLeaderPhone, setTeamFormLeaderPhone] = useState('');
  const [teamFormZone, setTeamFormZone] = useState('');
  const [teamFormDescription, setTeamFormDescription] = useState('');
  const [teamFormCodes, setTeamFormCodes] = useState<string[]>([]);
  const [teamFormNewCodeInput, setTeamFormNewCodeInput] = useState('');
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<CommercialTeamReport | null>(null);
  const [teamSuccessMsg, setTeamSuccessMsg] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  const [selectedAffiliate, setSelectedAffiliate] = useState<CommercialAffiliateReport | null>(null);
  const [settleModalCommercial, setSettleModalCommercial] = useState<CommercialAffiliateReport | null>(null);
  const [settleMethod, setSettleMethod] = useState<'ORANGE_MONEY' | 'MOOV_MONEY' | 'WAVE' | 'CASH'>('ORANGE_MONEY');
  const [settleTxRef, setSettleTxRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState<'all' | 'due' | 'settled'>('all');
  const [affiliateSuccessMsg, setAffiliateSuccessMsg] = useState('');

  const [broadcast, setBroadcast] = useState<AdminBroadcastMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [selectedShop, setSelectedShop] = useState<ShopAdminDetails | null>(null);
  const [shopActionFeedback, setShopActionFeedback] = useState<string>('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'promo'>('info');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const handleExportAllShopsJson = () => {
    const allData = syncService.getCloudDatabase();
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasocarnet_base_complete_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Listes de Relance & Diffusion Groupée WhatsApp
  const [trialRelanceMessage, setTrialRelanceMessage] = useState(
    "Bonjour cher commerçant,\nVotre période d'essai gratuite sur l'application FasoCarnet arrive à terme.\nPour continuer à gérer votre caisse, imprimer vos reçus et sécuriser vos ventes en toute sérénité, activez votre abonnement :\n- 1 Mois : 2 000 FCFA\n- 6 Mois : 10 000 FCFA\n- 1 An : 20 000 FCFA\nPaiement Mobile Money (Orange Money / Moov / Wave) au 72990310.\nL'équipe FasoCarnet reste à votre service !"
  );
  const [paidRelanceMessage, setPaidRelanceMessage] = useState(
    "Bonjour cher abonné FasoCarnet,\nMerci pour votre confiance et votre fidélité !\nUne question, un besoin d'assistance ou une suggestion pour améliorer votre commerce ? Toute notre équipe reste à votre écoute au 72990310.\nBonnes ventes avec FasoCarnet !"
  );
  const [relanceFeedback, setRelanceFeedback] = useState('');

  // Groupes de boutiques pour diffusion groupée
  const trialShops = shops.filter(s => s.statusType === 'trial' || s.statusType === 'expired' || s.daysRemaining <= 0);
  const paidShops = shops.filter(s => s.statusType === 'active' && s.daysRemaining > 0);

  const getShopPhones = (shopList: ShopAdminDetails[]) => {
    const phones: string[] = [];
    shopList.forEach(s => {
      const cleanMain = s.phone.replace(/\D/g, '');
      if (cleanMain) {
        phones.push(cleanMain.startsWith('226') ? `+${cleanMain}` : `+226${cleanMain}`);
      }
      if (s.ownerPhone) {
        const cleanOwner = s.ownerPhone.replace(/\D/g, '');
        if (cleanOwner) {
          phones.push(cleanOwner.startsWith('226') ? `+${cleanOwner}` : `+226${cleanOwner}`);
        }
      }
    });
    return Array.from(new Set(phones));
  };

  const handleCopyGroupPhones = (groupName: string, shopList: ShopAdminDetails[]) => {
    const phones = getShopPhones(shopList);
    if (phones.length === 0) {
      setRelanceFeedback(`Aucun numéro trouvé pour la liste "${groupName}".`);
      setTimeout(() => setRelanceFeedback(''), 3000);
      return;
    }
    navigator.clipboard.writeText(phones.join(', '));
    setRelanceFeedback(`${phones.length} numéro(s) de la liste "${groupName}" copiés !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleCopyGroupMessage = (message: string, groupName: string) => {
    navigator.clipboard.writeText(message);
    setRelanceFeedback(`Message pour la liste "${groupName}" copié !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleExportGroupVCard = (groupName: string, shopList: ShopAdminDetails[]) => {
    if (shopList.length === 0) {
      setRelanceFeedback(`Aucun contact dans la liste "${groupName}".`);
      setTimeout(() => setRelanceFeedback(''), 3000);
      return;
    }
    const vcf = adminService.generateVCard(shopList);
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fasocarnet_contacts_${groupName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setRelanceFeedback(`Fichier Contacts VCF (${groupName}) téléchargé !`);
    setTimeout(() => setRelanceFeedback(''), 3000);
  };

  const handleOpenWhatsAppGroup = (message: string, groupName: string) => {
    navigator.clipboard.writeText(message);
    setRelanceFeedback(`Message pour "${groupName}" copié ! Ouverture de WhatsApp...`);
    setTimeout(() => setRelanceFeedback(''), 3000);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [s, an, sh, bc, aff, teamsData, ags, lds] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getExtendedAnalytics(),
        adminService.getAllShopsWithDetails(),
        adminService.getBroadcastMessage(),
        adminService.getAffiliatesReports(),
        adminService.getCommercialTeamsReports(),
        adminService.getAllCommercialAgents(),
        adminService.getAllTeamLeaders()
      ]);
      setStats(s);
      setAnalytics(an);
      setShops(sh);
      setBroadcast(bc);
      setAffiliates(aff);
      setTeamsReports(teamsData.teamsReports);
      setUnassignedCommercials(teamsData.unassignedCommercials);
      setCommercialAgents(ags);
      setTeamLeaders(lds);

      if (bc) {
        setBroadcastTitle(bc.title);
        setBroadcastMessage(bc.message);
        setBroadcastType(bc.type === 'promo' ? 'promo' : 'info');
      }
      // Mettre à jour selectedShop si modal ouverte
      if (selectedShop) {
        const updatedSelected = sh.find(item => item.id === selectedShop.id);
        if (updatedSelected) setSelectedShop(updatedSelected);
      }
      // Mettre à jour selectedAffiliate si modal ouverte
      if (selectedAffiliate) {
        const updatedAff = aff.find(item => item.code === selectedAffiliate.code);
        if (updatedAff) setSelectedAffiliate(updatedAff);
      }
      // Mettre à jour selectedTeam si modal ouverte
      if (selectedTeam) {
        const updatedTeam = teamsData.teamsReports.find(t => t.team.id === selectedTeam.team.id);
        if (updatedTeam) setSelectedTeam(updatedTeam);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // =========================================================
  // GESTION DES COMMERCIAUX DE FLOTTE / TERRAIN
  // =========================================================
  const handleOpenCreateAgentModal = () => {
    setEditingAgent(null);
    setAgentFormFullName('');
    setAgentFormPhone('');
    setAgentFormCode('');
    setAgentFormTeamId('');
    setAgentFormZone('');
    setAgentFormStatus('active');
    setAgentFormNotes('');
    setAgentFormAutoCode(true);
    setIsAgentModalOpen(true);
  };

  const handleOpenEditAgentModal = (agent: CommercialAgent) => {
    setEditingAgent(agent);
    setAgentFormFullName(agent.fullName);
    setAgentFormPhone(agent.phone);
    setAgentFormCode(agent.code);
    setAgentFormTeamId(agent.teamId || '');
    setAgentFormZone(agent.zone || '');
    setAgentFormStatus(agent.status);
    setAgentFormNotes(agent.notes || '');
    setAgentFormAutoCode(false);
    setIsAgentModalOpen(true);
  };

  const handleFullNameChange = (name: string) => {
    setAgentFormFullName(name);
    if (agentFormAutoCode && name.trim().length >= 2) {
      const existingCodes = commercialAgents
        .filter(a => a.id !== editingAgent?.id)
        .map(a => a.code);
      const generated = adminService.generateUniqueCommercialCode(name, existingCodes);
      setAgentFormCode(generated);
    }
  };

  const handleCodeChange = (code: string) => {
    setAgentFormCode(code.toUpperCase());
    setAgentFormAutoCode(false);
  };

  const handleRegenerateCode = () => {
    const existingCodes = commercialAgents
      .filter(a => a.id !== editingAgent?.id)
      .map(a => a.code);
    const generated = adminService.generateUniqueCommercialCode(agentFormFullName || 'COMMERCIAL', existingCodes);
    setAgentFormCode(generated);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentFormFullName.trim()) {
      alert('Veuillez renseigner le nom complet du commercial.');
      return;
    }
    if (!agentFormPhone.trim()) {
      alert('Veuillez renseigner le numéro de téléphone / WhatsApp du commercial.');
      return;
    }

    setIsSavingAgent(true);
    try {
      const existingCodes = commercialAgents
        .filter(a => a.id !== editingAgent?.id)
        .map(a => a.code);

      const finalCode = agentFormCode.trim().toUpperCase() || adminService.generateUniqueCommercialCode(agentFormFullName, existingCodes);
      const assignedTeam = teamsReports.find(tr => tr.team.id === agentFormTeamId);

      const saved = await adminService.saveCommercialAgent({
        id: editingAgent?.id,
        fullName: agentFormFullName.trim(),
        phone: agentFormPhone.trim(),
        code: finalCode,
        teamId: agentFormTeamId || undefined,
        teamName: assignedTeam ? assignedTeam.team.name : undefined,
        zone: agentFormZone.trim() || undefined,
        status: agentFormStatus,
        notes: agentFormNotes.trim() || undefined
      });

      setIsAgentModalOpen(false);
      await loadData();
      setAgentSuccessModal(saved);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement du commercial.");
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (confirm(`Voulez-vous vraiment supprimer le commercial « ${agentName} » ?\n\nSon code commercial ne sera plus attribué à une équipe.`)) {
      try {
        await adminService.deleteCommercialAgent(agentId);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression.');
      }
    }
  };

  const handleOpenCommercialWhatsApp = (agent: CommercialAgent) => {
    const url = adminService.getWhatsAppCommercialWelcomeUrl(agent);
    window.open(url, '_blank');
  };

  const handleCopyCommercialWelcome = (agent: CommercialAgent) => {
    const effectiveTeam = agent.teamName || 'Flotte Commerciale';
    const effectiveZone = agent.zone || '';
    const message = `🇧🇫 *BIENVENUE DANS L'ÉQUIPE COMMERCIALE FASOCARNET* 🇧🇫\n\n` +
      `Bonjour *${agent.fullName}*,\n` +
      `Voici tes accès officiels pour ton travail de prospection sur le terrain :\n\n` +
      `🎯 *Ton Code Commercial Unique* : 👉 *${agent.code}* 👈\n` +
      `🏢 *Équipe* : *${effectiveTeam}* ${effectiveZone ? `(📍 ${effectiveZone})` : ''}\n` +
      `💰 *Ta Rémunération* : *300 FCFA par abonnement validé* (15%)\n\n` +
      `📲 *INSTRUCTIONS TERRAIN (IMPORTANT)* :\n` +
      `1. Présente et installe Faso Carnet sur le téléphone du commerçant.\n` +
      `2. Lors de l'inscription de sa boutique, renseigne impérativement ton code : *${agent.code}* dans la case « Code Commercial / Parrainage ».\n` +
      `3. Dès que le commerçant active son abonnement, ta commission t'est automatiquement créditée chaque dimanche !\n\n` +
      `🚀 *Bonne prospection et plein succès sur le terrain !*\n` +
      `Direction FasoCarnet.`;

    navigator.clipboard.writeText(message);
    setAgentCopiedId(agent.id);
    setTimeout(() => setAgentCopiedId(null), 3000);
  };

  const handleOpenCreateTeamModal = () => {
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormLeaderName('');
    setTeamFormLeaderPhone('');
    setTeamFormZone('');
    setTeamFormDescription('');
    setTeamFormCodes([]);
    setTeamFormNewCodeInput('');
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = (team: CommercialTeam) => {
    setEditingTeam(team);
    setTeamFormName(team.name);
    setTeamFormLeaderName(team.leaderName || '');
    setTeamFormLeaderPhone(team.leaderPhone || '');
    setTeamFormZone(team.zone || '');
    setTeamFormDescription(team.description || '');
    setTeamFormCodes([...team.affiliateCodes]);
    setTeamFormNewCodeInput('');
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) {
      alert('Le nom de l\'équipe est obligatoire.');
      return;
    }
    setIsSavingTeam(true);
    try {
      let finalCodes = [...teamFormCodes];
      if (teamFormNewCodeInput.trim()) {
        const extra = teamFormNewCodeInput.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        finalCodes = Array.from(new Set([...finalCodes, ...extra]));
      }
      await adminService.saveCommercialTeam({
        id: editingTeam?.id,
        name: teamFormName.trim(),
        leaderName: teamFormLeaderName.trim() || undefined,
        leaderPhone: teamFormLeaderPhone.trim() || undefined,
        zone: teamFormZone.trim() || undefined,
        description: teamFormDescription.trim() || undefined,
        affiliateCodes: finalCodes
      });
      setTeamSuccessMsg(editingTeam ? `Équipe « ${teamFormName} » modifiée avec succès !` : `Équipe « ${teamFormName} » créée avec succès !`);
      setIsTeamModalOpen(false);
      await loadData();
      setTimeout(() => setTeamSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de l\'équipe.');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (confirm(`Voulez-vous vraiment supprimer l'équipe "${teamName}" ?\n\nLes commerciaux rattachés ne seront pas supprimés : ils redeviendront des commerciaux indépendants.`)) {
      try {
        await adminService.deleteCommercialTeam(teamId);
        setTeamSuccessMsg(`Équipe « ${teamName} » supprimée.`);
        await loadData();
        setTimeout(() => setTeamSuccessMsg(''), 3000);
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression de l\'équipe.');
      }
    }
  };

  const handleOpenTeamWhatsApp = (teamReport: CommercialTeamReport) => {
    const url = adminService.getWhatsAppTeamStatementUrl(teamReport);
    window.open(url, '_blank');
  };

  // =========================================================================
  // ACTIONS CHEFS D'ÉQUIPE (MINI-ADMINS)
  // =========================================================================

  const handleOpenCreateLeaderModal = () => {
    setEditingLeader(null);
    setLeaderFormFullName('');
    setLeaderFormPhone('');
    setLeaderFormPin('');
    setLeaderFormTeamId('');
    setLeaderFormZone('');
    setLeaderFormStatus('active');
    setIsLeaderModalOpen(true);
  };

  const handleOpenEditLeaderModal = (leader: TeamLeaderAccount) => {
    setEditingLeader(leader);
    setLeaderFormFullName(leader.fullName);
    setLeaderFormPhone(leader.phone);
    setLeaderFormPin(''); // Laisser vide si inchangé
    setLeaderFormTeamId(leader.teamId || '');
    setLeaderFormZone(leader.zone || '');
    setLeaderFormStatus(leader.status);
    setIsLeaderModalOpen(true);
  };

  const handleSaveLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderFormFullName.trim()) {
      alert('Le nom complet du chef d\'équipe est obligatoire.');
      return;
    }
    if (!leaderFormPhone.trim()) {
      alert('Le numéro WhatsApp du chef d\'équipe est obligatoire.');
      return;
    }
    if (!editingLeader && (!leaderFormPin.trim() || leaderFormPin.trim().length < 4)) {
      alert('Veuillez définir un code PIN d\'au moins 4 chiffres pour ce chef d\'équipe.');
      return;
    }

    setIsSavingLeader(true);
    try {
      const saved = await adminService.saveTeamLeader({
        id: editingLeader?.id,
        fullName: leaderFormFullName.trim(),
        phone: leaderFormPhone.trim(),
        pinCode: leaderFormPin.trim() || undefined,
        teamId: leaderFormTeamId || undefined,
        zone: leaderFormZone.trim() || undefined,
        status: leaderFormStatus
      });

      setIsLeaderModalOpen(false);
      setLeaderSuccessMsg(editingLeader ? `Chef d'équipe « ${saved.fullName} » mis à jour !` : `Compte Chef d'équipe « ${saved.fullName} » créé avec succès !`);
      if (!editingLeader) {
        setLeaderWelcomeModal({ leader: saved, rawPin: leaderFormPin.trim() });
      }
      await loadData();
      setTimeout(() => setLeaderSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement du chef d\'équipe.');
    } finally {
      setIsSavingLeader(false);
    }
  };

  const handleToggleLeaderStatus = async (leader: TeamLeaderAccount) => {
    const nextStatus = leader.status === 'active' ? 'inactive' : 'active';
    try {
      await adminService.saveTeamLeader({
        ...leader,
        status: nextStatus
      });
      await loadData();
    } catch (err: any) {
      alert('Erreur modification statut : ' + err.message);
    }
  };

  const handleDeleteLeader = async (leaderId: string, fullName: string) => {
    if (confirm(`Supprimer définitivement le compte chef d'équipe de "${fullName}" ?\n\nSon accès Mini-Administrateur sera immédiatement révoqué.`)) {
      try {
        await adminService.deleteTeamLeader(leaderId);
        setLeaderSuccessMsg(`Chef d'équipe « ${fullName} » supprimé.`);
        await loadData();
        setTimeout(() => setLeaderSuccessMsg(''), 3000);
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression.');
      }
    }
  };

  const handleSendLeaderWhatsApp = (leader: TeamLeaderAccount, rawPin?: string) => {
    const url = adminService.getWhatsAppTeamLeaderWelcomeUrl(leader, rawPin);
    window.open(url, '_blank');
  };

  const handleManualActivation = async (shopId: string, months: number = 1) => {
    try {
      const updated = await adminService.activateShopManually(shopId, months);
      const planLabel = months >= 12 ? '1 an' : months >= 6 ? '6 mois' : months >= 3 ? '3 mois' : '1 mois';
      setShopActionFeedback(`⚡ Abonnement de « ${updated.name} » activé manuellement avec succès pour ${planLabel} !`);
      setTimeout(() => setShopActionFeedback(''), 4500);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'activation manuelle.');
    }
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalCommercial) return;
    setIsSettling(true);
    try {
      const currentSunday = adminService.getCurrentWeekSundayIso();
      await adminService.settleAffiliateWeek(
        settleModalCommercial.code,
        currentSunday,
        settleModalCommercial.currentWeekCommissionDue,
        settleModalCommercial.currentWeekPaidCount,
        settleModalCommercial.currentWeekRevenue,
        settleMethod,
        settleTxRef,
        settleNotes
      );
      setAffiliateSuccessMsg(`Règlement de ${settleModalCommercial.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA validé pour « ${settleModalCommercial.code} » !`);
      setSettleModalCommercial(null);
      setSettleTxRef('');
      setSettleNotes('');
      await loadData();
      setTimeout(() => setAffiliateSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation du règlement.');
    } finally {
      setIsSettling(false);
    }
  };

  const handleOpenAffiliateWhatsApp = (commercial: CommercialAffiliateReport) => {
    const url = adminService.getWhatsAppAffiliateStatementUrl(commercial);
    window.open(url, '_blank');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminService.verifyPassword(passwordInput)) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Mot de passe administrateur incorrect.');
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (confirm(`⚠️ ATTENTION ACTION IRRÉVERSIBLE ⚠️\n\nVoulez-vous vraiment supprimer définitivement le compte de la boutique "${shopName}" ?\n\nToutes les données (ventes, dettes, clients, profil) seront définitivement effacées du serveur Cloud.`)) {
      try {
        await adminService.deleteShop(shopId);
        setSelectedShop(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la suppression de la boutique.');
      }
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await adminService.exportShopsCsv();
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fasocarnet_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erreur lors de l\'exportation : ' + err.message);
    }
  };

  const handleSaveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert('Veuillez remplir le titre et le message de l\'annonce.');
      return;
    }
    setIsSavingBroadcast(true);
    try {
      const messageObj: AdminBroadcastMessage = {
        id: `bc_${Date.now()}`,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await adminService.setBroadcastMessage(messageObj);
      setBroadcast(messageObj);
      setBroadcastSuccess('Annonce diffusée avec succès à tous les commerçants !');
      setTimeout(() => setBroadcastSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la diffusion.');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleDisableBroadcast = async () => {
    if (confirm('Arrêter la diffusion de cette annonce ?')) {
      await adminService.setBroadcastMessage(null);
      setBroadcast(null);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastSuccess('Annonce retirée.');
      setTimeout(() => setBroadcastSuccess(''), 3000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    try {
      adminService.setPassword(newPassword.trim());
      setPasswordSuccess('Mot de passe administrateur modifié avec succès !');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredShops = shops.filter(shop => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      shop.name.toLowerCase().includes(q) ||
      (shop.ownerName && shop.ownerName.toLowerCase().includes(q)) ||
      shop.phone.includes(q) ||
      (shop.city && shop.city.toLowerCase().includes(q)) ||
      (shop.ownerPhone && shop.ownerPhone.includes(q));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return shop.statusType === filterStatus;
  });

  const getShopBadge = (shop: ShopAdminDetails) => {
    if (shop.statusType === 'active') {
      return {
        style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        label: 'Payant'
      };
    }
    if (shop.statusType === 'trial') {
      return {
        style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        label: 'Gratuit'
      };
    }
    return {
      style: 'bg-red-500/15 text-red-300 border-red-500/30',
      label: 'Expiré'
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
              <Crown className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Espace Super-Admin</h2>
            <p className="text-xs text-slate-400">
              Contrôle total des boutiques, abonnements et licences FasoCarnet.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Mot de Passe Administrateur
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Code d'accès admin"
                  className="w-full pl-3 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-semibold bg-red-950/40 p-2.5 rounded-xl border border-red-800/50">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Accéder au Tableau de Bord</span>
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'application</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto flex flex-col">
      {/* Header Admin Responsif */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-white leading-tight font-display truncate">
              FasoCarnet Admin Master
            </h1>
            <span className="text-[9px] sm:text-[11px] text-emerald-400 font-bold tracking-wider uppercase font-display block truncate">
              Super-Administrateur • Contrôle Réseau
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all disabled:opacity-50 cursor-pointer min-h-[36px] min-w-[36px]"
            title="Actualiser les données du réseau"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllShopsJson}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-h-[36px] min-w-[36px]"
            title="Télécharger une sauvegarde complète de toutes les boutiques au format JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Sauvegarde JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-h-[36px] min-w-[36px]"
            title="Modifier le mot de passe Super-Admin"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">PIN Admin</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 sm:px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-red-300 text-xs font-bold rounded-xl border border-red-800/40 flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-h-[36px]"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Quitter Admin</span>
            <span className="sm:hidden">Quitter</span>
          </button>
        </div>
      </header>

      {/* Navigation tabs responsives (5 Onglets Optimisés) */}
      <div className="max-w-6xl w-full mx-auto p-3 sm:p-5 md:p-6 space-y-4 flex-1 pb-16">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur p-1.5 rounded-2xl border border-slate-800 shadow-lg overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => setActiveTab('shops')}
            className={`flex-1 min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
              activeTab === 'shops'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Boutiques ({shops.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 min-w-[95px] sm:min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
              activeTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
            <span className="truncate">Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('affiliates')}
            className={`flex-1 min-w-[125px] sm:min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
              activeTab === 'affiliates'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
            <span className="truncate">Commerciaux ({affiliates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 min-w-[100px] sm:min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
              activeTab === 'broadcast'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Megaphone className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${broadcast?.isActive ? 'text-amber-400 animate-pulse' : ''}`} />
            <span className="truncate">Annonces {broadcast?.isActive ? '•' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 min-w-[95px] sm:min-w-0 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 sm:shrink ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Relances</span>
          </button>
        </div>

        {/* TAB 1 : BOUTIQUES (AFFICHAGE MINIMALISTE + MODALE DÉTAILS) */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Total Boutiques</span>
                  <div className="text-xl sm:text-2xl font-black text-white font-display">{stats.totalShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Abonnements Actifs</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">{stats.activeShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">En Essai (10j)</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-display">{stats.trialShops}</div>
                </div>

                <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-wider font-display">Expirées / Relances</span>
                  <div className="text-xl sm:text-2xl font-black text-red-400 font-display">{stats.expiredShops}</div>
                </div>
              </div>
            )}

            {/* Barre de recherche et filtres */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par boutique, nom, téléphone ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="flex space-x-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                {(['all', 'active', 'trial', 'expired'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                      filterStatus === st
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'Tous' : st === 'active' ? 'Actifs' : st === 'trial' ? 'Essai' : 'Expirés'}
                  </button>
                ))}
              </div>
            </div>

            {/* Message de succès d'action boutique */}
            {shopActionFeedback && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-in fade-in shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{shopActionFeedback}</span>
              </div>
            )}

            {/* Liste épurée des boutiques (Nom, Date de création, Forfait en cours) */}
            {filteredShops.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-2 border border-slate-800">
                <Store className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="font-bold text-sm text-slate-300">Aucune boutique trouvée</h3>
                <p className="text-xs text-slate-500">Aucun profil ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredShops.map((shop) => {
                  const createdDate = shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue';
                  const badge = getShopBadge(shop);

                  return (
                    <div
                      key={shop.id}
                      onClick={() => setSelectedShop(shop)}
                      className="cursor-pointer bg-slate-900/90 hover:bg-slate-800/80 active:scale-[0.99] p-3 sm:p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between gap-3 group shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-white text-sm sm:text-base group-hover:text-emerald-300 transition-colors break-words">
                            {shop.name}
                          </h4>
                          {shop.referralCode && (
                            <span className="px-2 py-0.2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-mono font-bold">
                              🤝 {shop.referralCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Créée le {createdDate}</span>
                          {shop.city && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">{shop.city}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Bouton d'activation manuelle rapide */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManualActivation(shop.id, 1);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-[10px] sm:text-xs font-black border border-emerald-500/30 transition-all flex items-center space-x-1 cursor-pointer font-display active:scale-95"
                          title="Activer manuellement l'abonnement (+1 mois)"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span className="hidden sm:inline">Activer</span>
                          <span>+1m</span>
                        </button>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${badge.style}`}>
                          {badge.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 : ANALYTICS & TÉLÉMÉTRIE (SIMPLIFIÉ : APPAREILS, RATIO PAYANTS/ESSAI, PROVENANCE) */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Analytics avec Export CSV */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white font-display">Télémétrie Globale & Démographie</h3>
                <p className="text-xs text-slate-400 mt-0.5">Suivi en temps réel des installations et de l'adoption</p>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl sm:rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all font-display cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exporter Données (CSV / Excel)</span>
              </button>
            </div>

            {/* 1. Métriques Clés : Installations & Abonnements */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-display">Appareils / Installs</span>
                <div className="text-xl sm:text-2xl font-black text-white font-display">{analytics.totalInstalls}</div>
                <span className="text-[10px] text-emerald-400 font-bold block">{analytics.activeInstallsToday} actif(s) aujourd'hui</span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-display">Abonnés Payants</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
                  {paidShops.length}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {analytics.totalInstalls > 0 ? Math.round((paidShops.length / analytics.totalInstalls) * 100) : 0}% du réseau
                </span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-display">Versions d'Essai</span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-display">
                  {trialShops.filter(s => s.statusType === 'trial').length}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {analytics.totalInstalls > 0 ? Math.round((trialShops.filter(s => s.statusType === 'trial').length / analytics.totalInstalls) * 100) : 0}% du réseau
                </span>
              </div>

              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-1 shadow-sm">
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider font-display">Actifs (7 Derniers Jours)</span>
                <div className="text-xl sm:text-2xl font-black text-sky-400 font-display">{analytics.activeInstallsThisWeek}</div>
                <span className="text-[10px] text-slate-400 block">Sur {analytics.totalInstalls} terminaux</span>
              </div>
            </div>

            {/* 2. Répartition Abonnements Payants vs Versions d'Essai (Visual Bar) */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm font-display">Répartition des Abonnements</h4>
                    <p className="text-[11px] text-slate-400">Ratio abonnés actifs payants vs commerçants en essai</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Payants : {paidShops.length} ({shops.length > 0 ? Math.round((paidShops.length / shops.length) * 100) : 0}%)</span>
                  </span>
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Essai / Expirés : {trialShops.length} ({shops.length > 0 ? Math.round((trialShops.length / shops.length) * 100) : 0}%)</span>
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${shops.length > 0 ? (paidShops.length / shops.length) * 100 : 0}%` }}
                    title={`Payants: ${paidShops.length}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${shops.length > 0 ? (trialShops.length / shops.length) * 100 : 0}%` }}
                    title={`Essai: ${trialShops.length}`}
                  />
                </div>
              </div>
            </div>

            {/* 3. Provenance Géographique des Commerçants */}
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-white">
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm font-display">Provenance Géographique des Commerçants</h4>
                    <p className="text-[11px] text-slate-400">Répartition par ville et localité au Burkina Faso</p>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {analytics.cityStats.length} ville(s)
                </span>
              </div>

              {analytics.cityStats.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  Aucune ville renseignée pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {analytics.cityStats.map((c) => {
                    const percentage = analytics.totalInstalls > 0 ? Math.round((c.count / analytics.totalInstalls) * 100) : 0;
                    return (
                      <div key={c.city} className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-2 hover:border-slate-600 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                            <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">{c.city}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono">
                              {c.count} {c.count > 1 ? 'boutiques' : 'boutique'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 font-bold">
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Barre de progression */}
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB AFFILIATION : GESTION DES COMMERCIAUX, ÉQUIPES & COMMISSIONS (15% / 300 F) */}
        {activeTab === 'affiliates' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Bannière Récapitulative du Dimanche */}
            {(() => {
              const currentSunday = adminService.getCurrentWeekSundayIso();
              const currentMonday = adminService.getWeekMondayIso(currentSunday);
              const totalDueThisSunday = affiliates
                .filter(a => !a.currentWeekIsSettled)
                .reduce((sum, a) => sum + a.currentWeekCommissionDue, 0);
              const totalWeekPaidSubs = affiliates.reduce((sum, a) => sum + a.currentWeekPaidCount, 0);
              const totalWeekRevenue = affiliates.reduce((sum, a) => sum + a.currentWeekRevenue, 0);
              const totalAllTimeCommission = affiliates.reduce((sum, a) => sum + a.totalCommissionAllTime, 0);

              return (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-500/30 shadow-lg space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-amber-400" />
                          <h3 className="text-sm sm:text-base font-black text-white font-display">
                            Programme d'Affiliation & Commerciaux (15%)
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Clôture hebdomadaire : <strong className="text-amber-300">Chaque Dimanche ({currentSunday})</strong> • 300 FCFA reversés par abonnement mensuel
                        </p>
                      </div>

                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-black rounded-full text-xs border border-amber-400/30 self-start sm:self-auto font-mono">
                        Semaine du {currentMonday} au {currentSunday}
                      </span>
                    </div>

                    {/* Grille des 4 indicateurs clés */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="bg-slate-850/80 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Commerciaux</span>
                        <span className="text-lg sm:text-xl font-black text-white font-mono">{affiliates.length}</span>
                        <span className="text-[10px] text-slate-500 block">codes actifs</span>
                      </div>

                      <div className="bg-slate-850/80 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Validés cette semaine</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{totalWeekPaidSubs}</span>
                        <span className="text-[10px] text-emerald-500/80 block">{totalWeekRevenue.toLocaleString('fr-FR')} F encaissés</span>
                      </div>

                      <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 p-3 rounded-xl border border-amber-500/40 shadow-inner">
                        <span className="text-[10px] text-amber-300 uppercase font-black block">À verser ce Dimanche (15%)</span>
                        <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">{totalDueThisSunday.toLocaleString('fr-FR')} FCFA</span>
                        <span className="text-[10px] text-amber-300/80 block">300 F / abonnement</span>
                      </div>

                      <div className="bg-slate-850/80 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Commissions à vie</span>
                        <span className="text-lg sm:text-xl font-black text-slate-200 font-mono">{totalAllTimeCommission.toLocaleString('fr-FR')} FCFA</span>
                        <span className="text-[10px] text-slate-500 block">cumul historique</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Messages de retour */}
            {teamSuccessMsg && (
              <div className="p-3 bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{teamSuccessMsg}</span>
              </div>
            )}
            {affiliateSuccessMsg && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{affiliateSuccessMsg}</span>
              </div>
            )}

            {/* SOUS-ONGLETS : COMMERCIAUX VS ÉQUIPES VS CHEFS D'ÉQUIPE VS INDIVIDUELS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setAffiliateSubTab('agents')}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 sm:space-x-2 cursor-pointer font-display shrink-0 whitespace-nowrap ${
                    affiliateSubTab === 'agents'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Commerciaux ({commercialAgents.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAffiliateSubTab('teams')}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 sm:space-x-2 cursor-pointer font-display shrink-0 whitespace-nowrap ${
                    affiliateSubTab === 'teams'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Équipes ({teamsReports.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAffiliateSubTab('leaders')}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 sm:space-x-2 cursor-pointer font-display shrink-0 whitespace-nowrap ${
                    affiliateSubTab === 'leaders'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Chefs d'Équipe ({teamLeaders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAffiliateSubTab('individual')}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 sm:space-x-2 cursor-pointer font-display shrink-0 whitespace-nowrap ${
                    affiliateSubTab === 'individual'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Rapports ({affiliates.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                {affiliateSubTab === 'leaders' ? (
                  <button
                    type="button"
                    onClick={handleOpenCreateLeaderModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer font-display active:scale-95 min-h-[38px]"
                  >
                    <Crown className="w-4 h-4" />
                    <span>+ Chef d'Équipe</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenCreateAgentModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer font-display active:scale-95 min-h-[38px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Commercial</span>
                  </button>
                )}

                {affiliateSubTab === 'teams' && (
                  <button
                    type="button"
                    onClick={handleOpenCreateTeamModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-slate-700 shadow-sm transition-all cursor-pointer font-display active:scale-95 min-h-[38px]"
                  >
                    <Building className="w-4 h-4" />
                    <span>+ Équipe</span>
                  </button>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* VUE 0 : LISTE DES COMMERCIAUX DE FLOTTE & PACKS WHATSAPP */}
            {/* ========================================================= */}
            {affiliateSubTab === 'agents' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Barre de Recherche & Filtres Commerciaux */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, code (ex: MOUSSA226), téléphone, équipe ou zone..."
                      value={agentSearchQuery}
                      onChange={(e) => setAgentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Filtre Équipe */}
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <select
                      value={agentFilterTeam}
                      onChange={(e) => setAgentFilterTeam(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold outline-none focus:border-amber-500"
                    >
                      <option value="all">Toutes les équipes ({commercialAgents.length})</option>
                      <option value="unassigned">Indépendants / Sans équipe</option>
                      {teamsReports.map(tr => (
                        <option key={tr.team.id} value={tr.team.id}>
                          🏢 {tr.team.name}
                        </option>
                      ))}
                    </select>

                    {/* Filtre Statut */}
                    <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAgentFilterStatus('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          agentFilterStatus === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentFilterStatus('active')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          agentFilterStatus === 'active'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Actifs
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentFilterStatus('inactive')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          agentFilterStatus === 'inactive'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Inactifs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Liste des Commerciaux Enregistrés */}
                {(() => {
                  const filteredAgents = commercialAgents.filter(agent => {
                    const q = agentSearchQuery.toLowerCase();
                    const inName = (agent.fullName || '').toLowerCase().includes(q);
                    const inCode = (agent.code || '').toLowerCase().includes(q);
                    const inPhone = (agent.phone || '').toLowerCase().includes(q);
                    const inZone = (agent.zone || '').toLowerCase().includes(q);
                    const inTeam = (agent.teamName || '').toLowerCase().includes(q);
                    const matchesQuery = inName || inCode || inPhone || inZone || inTeam;

                    if (!matchesQuery) return false;
                    if (agentFilterTeam === 'unassigned' && agent.teamId) return false;
                    if (agentFilterTeam !== 'all' && agentFilterTeam !== 'unassigned' && agent.teamId !== agentFilterTeam) return false;
                    if (agentFilterStatus !== 'all' && agent.status !== agentFilterStatus) return false;

                    return true;
                  });

                  if (commercialAgents.length === 0) {
                    return (
                      <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-3 border border-slate-800">
                        <Users className="w-12 h-12 text-slate-600 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-300">Aucun commercial enregistré pour l'instant</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Enregistrez les membres de vos équipes commerciales pour leur attribuer un code unique (ex: <code className="text-amber-400">MOUSSA226</code>) et leur envoyer directement leur fiche d'instructions par WhatsApp.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateAgentModal}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center space-x-2 font-display cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Enregistrer le premier commercial</span>
                        </button>
                      </div>
                    );
                  }

                  if (filteredAgents.length === 0) {
                    return (
                      <div className="bg-slate-900 p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                        Aucun commercial ne correspond aux filtres actuels.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredAgents.map((agent) => {
                        const affReport = affiliates.find(a => a.code.toUpperCase() === agent.code.toUpperCase());
                        const totalReferred = affReport ? affReport.totalShopsReferred : 0;
                        const activeSubscribed = affReport ? affReport.activeSubscribedShops : 0;
                        const dueThisSunday = affReport ? affReport.currentWeekCommissionDue : 0;
                        const isCopied = agentCopiedId === agent.id;

                        return (
                          <div
                            key={agent.id}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 space-y-3.5 transition-all shadow-lg flex flex-col justify-between"
                          >
                            {/* En-tête de la carte */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-slate-950 font-black text-base flex items-center justify-center shadow-md font-display shrink-0">
                                  {agent.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <h4 className="font-extrabold text-white text-sm truncate font-display">
                                      {agent.fullName}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                      agent.status === 'active'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                        : 'bg-red-500/20 text-red-300 border border-red-400/40'
                                    }`}>
                                      {agent.status === 'active' ? '✓ Actif' : 'Inactif'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-slate-400 pt-0.5">
                                    <span className="font-mono font-bold text-emerald-400">📞 {agent.phone}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions modifier / supprimer */}
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAgentModal(agent)}
                                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Modifier le commercial"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAgent(agent.id, agent.fullName)}
                                  className="p-2 text-red-400 hover:text-red-200 rounded-xl hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Supprimer le commercial"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Badge Code Commercial Unique & Équipe */}
                            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                                  Code Commercial Unique
                                </span>
                                <span className="font-mono font-black text-amber-400 text-base tracking-widest block">
                                  {agent.code}
                                </span>
                              </div>
                              <div className="text-right space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                                  Équipe & Zone
                                </span>
                                <span className="text-xs font-bold text-slate-200 block truncate max-w-[150px]">
                                  {agent.teamName ? `🏢 ${agent.teamName}` : 'Indépendant'}
                                </span>
                                {agent.zone && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                    📍 {agent.zone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Métriques de performance */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Boutiques</span>
                                <span className="text-sm font-black text-white font-mono">{totalReferred}</span>
                              </div>
                              <div className="p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Abonnés</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">{activeSubscribed}</span>
                              </div>
                              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/30">
                                <span className="text-[9px] uppercase font-bold text-amber-300 block">Dimanche</span>
                                <span className="text-sm font-black text-amber-400 font-mono">{dueThisSunday} F</span>
                              </div>
                            </div>

                            {agent.notes && (
                              <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-xl border border-slate-850">
                                📝 {agent.notes}
                              </p>
                            )}

                            {/* Actions WhatsApp & Copie Pack */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleOpenCommercialWhatsApp(agent)}
                                className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-[#25D366]/20 active:scale-98 transition-all cursor-pointer font-display"
                                title="Envoyer le message d'accès et le code sur WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp 1-Clic</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyCommercialWelcome(agent)}
                                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition-all cursor-pointer font-display"
                                title="Copier le pack d'onboarding complet"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-bold">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copier Pack</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* VUE 1 : GESTION DES ÉQUIPES COMMERCIALES & PERFORMANCES */}
            {/* ========================================================= */}
            {affiliateSubTab === 'teams' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Barre de Recherche Équipes */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Rechercher une équipe par nom, zone, responsable ou code..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Liste des Équipes */}
                {(() => {
                  const filteredTeams = teamsReports.filter(tr => {
                    const q = teamSearchQuery.toLowerCase();
                    const inName = tr.team.name.toLowerCase().includes(q);
                    const inLeader = (tr.team.leaderName || '').toLowerCase().includes(q);
                    const inZone = (tr.team.zone || '').toLowerCase().includes(q);
                    const inCodes = tr.team.affiliateCodes.some(c => c.toLowerCase().includes(q));
                    return inName || inLeader || inZone || inCodes;
                  });

                  if (teamsReports.length === 0) {
                    return (
                      <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-3 border border-slate-800">
                        <Building className="w-12 h-12 text-slate-600 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-300">Aucune équipe commerciale créée</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Regroupez vos commerciaux en équipes (ex: Équipe Ouaga Nord, Bobo Centre) pour suivre leur performance collective et envoyer les relevés hebdomadaires aux chefs d'équipe.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateTeamModal}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center space-x-2 font-display cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Créer la première équipe</span>
                        </button>
                      </div>
                    );
                  }

                  if (filteredTeams.length === 0) {
                    return (
                      <div className="bg-slate-900 p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                        Aucune équipe ne correspond à votre recherche « {teamSearchQuery} ».
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredTeams.map((teamReport) => {
                        const { team } = teamReport;
                        const isExpanded = selectedTeam?.team.id === team.id;
                        const isDue = teamReport.currentWeekCommissionDue > 0 && !teamReport.currentWeekIsSettled;

                        return (
                          <div
                            key={team.id}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 space-y-3.5 transition-all shadow-sm"
                          >
                            {/* En-tête de la carte Équipe */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-500/30">
                                    <Building className="w-4 h-4" />
                                  </div>
                                  <h4 className="font-black text-white text-base font-display">
                                    {team.name}
                                  </h4>
                                  {team.zone && (
                                    <span className="px-2.5 py-0.5 bg-slate-800 text-amber-300 border border-slate-700 rounded-full text-[10px] font-bold flex items-center space-x-1">
                                      <MapPin className="w-3 h-3 text-amber-400" />
                                      <span>{team.zone}</span>
                                    </span>
                                  )}
                                  {isDue ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                      À verser Dimanche
                                    </span>
                                  ) : teamReport.currentWeekIsSettled ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                                      ✓ Réglé
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">
                                      0 F cette semaine
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2">
                                  <span>👑 Responsable : <strong className="text-slate-200">{team.leaderName || 'Non assigné'}</strong></span>
                                  {team.leaderPhone && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-emerald-400 font-mono">📞 {team.leaderPhone}</span>
                                    </>
                                  )}
                                  {team.description && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span className="text-slate-400 italic">« {team.description} »</span>
                                    </>
                                  )}
                                </p>
                              </div>

                              {/* Actions rapides sur l'équipe */}
                              <div className="flex items-center space-x-2 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTeamWhatsApp(teamReport)}
                                  className="px-3 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-xl text-xs font-bold border border-[#25D366]/30 transition-all flex items-center space-x-1.5 cursor-pointer font-display"
                                  title="Envoyer le relevé de l'équipe au Chef d'équipe sur WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">WhatsApp Chef</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTeamModal(team)}
                                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                                  title="Modifier l'équipe"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeam(team.id, team.name)}
                                  className="p-2 bg-red-950/40 hover:bg-red-900/80 text-red-400 hover:text-red-200 rounded-xl transition-all cursor-pointer"
                                  title="Supprimer l'équipe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Codes des commerciaux rattachés */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">
                                Membres ({teamReport.membersCount}) :
                              </span>
                              {team.affiliateCodes.length === 0 ? (
                                <span className="text-[11px] text-amber-400/80 italic">
                                  Aucun commercial assigné. Cliquez sur Modifier pour ajouter des codes.
                                </span>
                              ) : (
                                team.affiliateCodes.map(code => (
                                  <span
                                    key={code}
                                    className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[11px] font-bold"
                                  >
                                    {code}
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Grille KPIs de performance de l'équipe */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <span className="text-[10px] text-slate-400 font-bold block">Boutiques Rattachées</span>
                                <span className="text-base font-black text-white font-mono">{teamReport.totalShopsReferred}</span>
                                <span className="text-[9px] text-emerald-400 block">{teamReport.activeSubscribedShops} abonnés actifs</span>
                              </div>

                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <span className="text-[10px] text-slate-400 font-bold block">Abonnements Semaine</span>
                                <span className="text-base font-black text-emerald-400 font-mono">{teamReport.currentWeekPaidCount}</span>
                                <span className="text-[9px] text-slate-400 block">{teamReport.currentWeekRevenue.toLocaleString('fr-FR')} F CA</span>
                              </div>

                              <div className="bg-gradient-to-br from-amber-950/40 to-slate-800 p-2.5 rounded-xl border border-amber-500/40 shadow-inner">
                                <span className="text-[10px] text-amber-300 font-black block uppercase">Commission Dimanche (15%)</span>
                                <span className="text-base font-black text-amber-400 font-mono">{teamReport.currentWeekCommissionDue.toLocaleString('fr-FR')} F</span>
                                <span className="text-[9px] text-amber-300/80 block">300 F / abonnement</span>
                              </div>

                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <span className="text-[10px] text-slate-400 font-bold block">CA Total Historique</span>
                                <span className="text-base font-black text-slate-200 font-mono">{teamReport.totalRevenueGenerated.toLocaleString('fr-FR')} F</span>
                                <span className="text-[9px] text-slate-500 block">Commissions : {teamReport.totalCommissionAllTime.toLocaleString('fr-FR')} F</span>
                              </div>
                            </div>

                            {/* Accordéon pour voir le détail de chaque commercial dans l'équipe */}
                            <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs">
                              <button
                                type="button"
                                onClick={() => setSelectedTeam(isExpanded ? null : teamReport)}
                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1.5 cursor-pointer font-display"
                              >
                                <span>{isExpanded ? 'Masquer les performances des membres' : `Voir le détail des ${teamReport.commercials.length} commercial(aux)`}</span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            </div>

                            {/* Détail déroulant des membres de l'équipe */}
                            {isExpanded && (
                              <div className="space-y-2 pt-2 border-t border-slate-800 animate-in fade-in">
                                {teamReport.commercials.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic text-center py-2">
                                    Aucun commercial actif dans cette équipe.
                                  </p>
                                ) : (
                                  teamReport.commercials.map((comm) => (
                                    <div
                                      key={comm.code}
                                      className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            {comm.code}
                                          </span>
                                          <span className="text-[11px] text-slate-400">
                                            {comm.totalShopsReferred} boutique(s) • {comm.activeSubscribedShops} abonné(s)
                                          </span>
                                        </div>

                                        <div className="text-right font-mono text-xs">
                                          <span className="text-amber-400 font-black">
                                            {comm.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA
                                          </span>
                                          <span className="text-[10px] text-slate-500 block">
                                            ({comm.currentWeekPaidCount} cette semaine)
                                          </span>
                                        </div>
                                      </div>

                                      {/* Boutiques du commercial */}
                                      {comm.referredShops.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-slate-900">
                                          {comm.referredShops.map(sh => (
                                            <div key={sh.id} className="flex items-center justify-between text-[10px] text-slate-300 pl-2">
                                              <span>• {sh.name} {sh.city ? `(${sh.city})` : ''}</span>
                                              <span className={sh.isSubscribed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                                {sh.isSubscribed ? `Abonné (+${sh.commissionAmount} F)` : 'Essai / Inactif'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Section Commerciaux Indépendants (Sans Équipe) */}
                {unassignedCommercials.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <User className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-xs sm:text-sm font-display">
                          Commerciaux Indépendants / Sans Équipe ({unassignedCommercials.length})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenCreateTeamModal}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                      >
                        + Créer une équipe pour ces codes
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {unassignedCommercials.map(comm => (
                        <div
                          key={comm.code}
                          className="p-2 bg-slate-800/80 border border-slate-700/80 rounded-xl flex items-center space-x-2 text-xs"
                        >
                          <span className="font-mono font-black text-white">{comm.code}</span>
                          <span className="text-[10px] text-slate-400">({comm.totalShopsReferred} bq.)</span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {comm.currentWeekCommissionDue > 0 ? `${comm.currentWeekCommissionDue} F` : '0 F'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* ========================================================= */}
            {/* VUE 1.BIS : GESTION DES CHEFS D'ÉQUIPE (MINI-ADMINS) */}
            {/* ========================================================= */}
            {affiliateSubTab === 'leaders' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Barre de Recherche Chefs d'Équipe */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom du chef, téléphone (+226...), équipe ou zone..."
                      value={leaderSearchQuery}
                      onChange={(e) => setLeaderSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {leaderSuccessMsg && (
                  <div className="p-3 bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{leaderSuccessMsg}</span>
                  </div>
                )}

                {/* Liste des Chefs d'Équipe */}
                {(() => {
                  const filteredLeaders = teamLeaders.filter(leader => {
                    const q = leaderSearchQuery.toLowerCase();
                    const inName = leader.fullName.toLowerCase().includes(q);
                    const inPhone = leader.phone.toLowerCase().includes(q);
                    const inTeam = (leader.teamName || '').toLowerCase().includes(q);
                    const inZone = (leader.zone || '').toLowerCase().includes(q);
                    return inName || inPhone || inTeam || inZone;
                  });

                  if (teamLeaders.length === 0) {
                    return (
                      <div className="bg-slate-900 p-8 rounded-3xl text-center space-y-3 border border-slate-800">
                        <Crown className="w-12 h-12 text-slate-600 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-300">Aucun Chef d'Équipe (Mini-Admin) créé</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Déléguez le management de vos commerciaux sur le terrain en créant des comptes Mini-Administrateurs pour vos chefs d'équipe (connexion avec leur téléphone + PIN).
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateLeaderModal}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center space-x-2 font-display cursor-pointer transition-all"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Créer le premier compte Chef d'Équipe</span>
                        </button>
                      </div>
                    );
                  }

                  if (filteredLeaders.length === 0) {
                    return (
                      <div className="bg-slate-900 p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-800">
                        Aucun chef d'équipe ne correspond à votre recherche « {leaderSearchQuery} ».
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredLeaders.map((leader) => {
                        const isActive = leader.status === 'active';

                        return (
                          <div
                            key={leader.id}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3.5 transition-all shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-500/30">
                                  <Crown className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-black text-white text-sm font-display">
                                      {leader.fullName}
                                    </h4>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                        isActive
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}
                                    >
                                      {isActive ? 'Actif' : 'Inactif'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 font-mono">
                                    📞 +226 {leader.phone}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditLeaderModal(leader)}
                                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                                  title="Modifier le compte ou réinitialiser le PIN"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLeader(leader.id, leader.fullName)}
                                  className="p-2 bg-red-950/40 hover:bg-red-900/80 text-red-400 hover:text-red-200 rounded-xl transition-colors cursor-pointer"
                                  title="Supprimer le compte Chef d'Équipe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Équipe et Zone */}
                            <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-1.5 text-slate-300">
                                <Building className="w-3.5 h-3.5 text-amber-400" />
                                <span>Équipe : <strong className="text-white">{leader.teamName}</strong></span>
                              </div>
                              {leader.zone && (
                                <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>{leader.zone}</span>
                                </div>
                              )}
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                              <button
                                type="button"
                                onClick={() => handleToggleLeaderStatus(leader)}
                                className={`text-[11px] font-bold hover:underline cursor-pointer ${
                                  isActive ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              >
                                {isActive ? 'Désactiver le compte' : 'Activer le compte'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendLeaderWhatsApp(leader)}
                                className="px-3 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-xl text-xs font-bold border border-[#25D366]/30 transition-all flex items-center space-x-1.5 cursor-pointer font-display"
                                title="Envoyer le kit d'accès Chef d'équipe sur WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Accès</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* VUE 2 : LISTE INDIVIDUELLE DES COMMERCIAUX & RÈGLEMENTS */}
            {/* ========================================================= */}
            {affiliateSubTab === 'individual' && (
              <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher par code commercial (ex: ALI226)..."
                      value={affiliateSearch}
                      onChange={(e) => setAffiliateSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Filtre d'état */}
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAffiliateFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        affiliateFilter === 'all'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tous ({affiliates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAffiliateFilter('due')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        affiliateFilter === 'due'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      À verser ({affiliates.filter(a => !a.currentWeekIsSettled && a.currentWeekCommissionDue > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAffiliateFilter('settled')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        affiliateFilter === 'settled'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Réglés ({affiliates.filter(a => a.currentWeekIsSettled).length})
                    </button>
                  </div>
                </div>

                {/* Liste des Commerciaux */}
                {(() => {
                  const filteredAffiliates = affiliates.filter(a => {
                    const matchQuery = a.code.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
                      (a.name && a.name.toLowerCase().includes(affiliateSearch.toLowerCase()));
                    if (!matchQuery) return false;
                    if (affiliateFilter === 'due') return !a.currentWeekIsSettled && a.currentWeekCommissionDue > 0;
                    if (affiliateFilter === 'settled') return a.currentWeekIsSettled;
                    return true;
                  });

                  if (filteredAffiliates.length === 0) {
                    return (
                      <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-1">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-1 opacity-50" />
                        <span className="font-bold text-slate-400 block">Aucun commercial trouvé</span>
                        <p className="text-[11px]">
                          Les commerçants qui s'inscrivent avec un code commercial (ex: <code>ALI226</code>) s'afficheront automatiquement ici.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 pt-1">
                      {filteredAffiliates.map((commercial) => {
                        const isDue = !commercial.currentWeekIsSettled && commercial.currentWeekCommissionDue > 0;
                        const isExpanded = selectedAffiliate?.code === commercial.code;
                        const assignedTeam = teamsReports.find(tr => tr.team.affiliateCodes.includes(commercial.code));

                        return (
                          <div
                            key={commercial.code}
                            className="bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all shadow-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {/* Titre / Code du commercial */}
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-sm flex items-center justify-center font-mono shadow-xs shrink-0">
                                  {commercial.code.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-extrabold text-white text-sm font-mono tracking-wider">
                                      {commercial.code}
                                    </h4>
                                    {assignedTeam ? (
                                      <span className="px-2 py-0.2 bg-slate-900 border border-slate-700 text-amber-300 rounded text-[9px] font-bold">
                                        🏢 {assignedTeam.team.name}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.2 bg-slate-900 border border-slate-700 text-slate-400 rounded text-[9px]">
                                        Indépendant
                                      </span>
                                    )}
                                    {isDue ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                        À verser ce Dimanche
                                      </span>
                                    ) : commercial.currentWeekIsSettled ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                                        ✓ Réglé
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-700 text-slate-400">
                                        0 F cette semaine
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400">
                                    {commercial.totalShopsReferred} boutique(s) rattachée(s) • {commercial.activeSubscribedShops} abonnement(s) actif(s)
                                  </span>
                                </div>
                              </div>

                              {/* Montant de la commission pour la semaine */}
                              <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Commission Dimanche</span>
                                  <span className={`text-base sm:text-lg font-black font-mono block ${isDue ? 'text-amber-400' : 'text-slate-300'}`}>
                                    {commercial.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>

                                {/* Bouton Action WhatsApp Relevé */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAffiliateWhatsApp(commercial)}
                                  className="p-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-xl border border-[#25D366]/30 transition-all cursor-pointer"
                                  title="Envoyer le relevé de la semaine sur WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>

                                {/* Bouton Régler ce dimanche */}
                                {isDue && (
                                  <button
                                    type="button"
                                    onClick={() => setSettleModalCommercial(commercial)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer font-display"
                                  >
                                    Régler ➔
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Accordéon Boutiques Rattachées */}
                            <div className="border-t border-slate-700/60 pt-2.5 flex items-center justify-between text-xs">
                              <button
                                type="button"
                                onClick={() => setSelectedAffiliate(isExpanded ? null : commercial)}
                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Masquer les boutiques' : `Voir les ${commercial.referredShops.length} boutique(s)`}</span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>

                              <span className="text-[11px] text-slate-400">
                                Total historique gagné : <strong className="text-white font-mono">{commercial.totalCommissionAllTime.toLocaleString('fr-FR')} F</strong>
                              </span>
                            </div>

                            {/* Détails déroulants des boutiques parrainées */}
                            {isExpanded && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-700/40 animate-in fade-in">
                                {commercial.referredShops.map((shop) => (
                                  <div
                                    key={shop.id}
                                    className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-bold text-white truncate">{shop.name}</span>
                                        {shop.isSubscribed ? (
                                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-black uppercase font-mono">
                                            Abonné (+{shop.commissionAmount} F)
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[9px] font-medium">
                                            Essai / Inactif
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 block font-mono">
                                        📞 {shop.phone} {shop.city ? `• 📍 ${shop.city}` : ''}
                                      </span>
                                    </div>

                                    <div className="text-right shrink-0 font-mono text-[11px]">
                                      <span className={shop.isSubscribed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                        {shop.isSubscribed ? `+${shop.commissionAmount} F (15%)` : '0 F'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* MODALE DE CRÉATION / MODIFICATION DE COMMERCIAL */}
            {/* ========================================================= */}
            {isAgentModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto text-white">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <UserPlus className="w-5 h-5" />
                      <h3 className="font-black text-white text-sm sm:text-base font-display">
                        {editingAgent ? 'Modifier le Commercial' : 'Nouveau Commercial de Terrain'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAgentModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAgent} className="space-y-3.5">
                    {/* Nom Complet */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Nom & Prénom(s) du Commercial *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Moussa SAWADOGO, Ali KABORE..."
                        value={agentFormFullName}
                        onChange={(e) => handleFullNameChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* Téléphone WhatsApp */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Téléphone / WhatsApp du Commercial *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 70 12 34 56"
                        value={agentFormPhone}
                        onChange={(e) => setAgentFormPhone(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Utilisé pour lui envoyer sa fiche et son code commercial directement par WhatsApp.
                      </span>
                    </div>

                    {/* Code Commercial Unique */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Code Commercial Unique *
                        </label>
                        <button
                          type="button"
                          onClick={handleRegenerateCode}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Régénérer</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ex: MOUSSA226, ALI226..."
                        value={agentFormCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border-2 border-amber-500/50 rounded-xl text-sm font-mono font-black text-amber-400 tracking-wider placeholder:text-slate-600 focus:border-amber-500 outline-none uppercase"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Ce code sera renseigné par les commerçants lors de l'inscription pour lui reverser 15% (300 F / mois).
                      </span>
                    </div>

                    {/* Équipe & Zone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Équipe Rattachée
                        </label>
                        <select
                          value={agentFormTeamId}
                          onChange={(e) => setAgentFormTeamId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-amber-500"
                        >
                          <option value="">Indépendant / Aucune équipe</option>
                          {teamsReports.map(tr => (
                            <option key={tr.team.id} value={tr.team.id}>
                              🏢 {tr.team.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Zone de Prospection
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Grand Marché, Ouaga Nord, Bobo..."
                          value={agentFormZone}
                          onChange={(e) => setAgentFormZone(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Statut & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Statut d'Activité
                        </label>
                        <select
                          value={agentFormStatus}
                          onChange={(e) => setAgentFormStatus(e.target.value as 'active' | 'inactive')}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-amber-500"
                        >
                          <option value="active">✓ Actif (En mission terrain)</option>
                          <option value="inactive">Inactif / Suspendu</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Notes / Remarques (Optionnel)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Commercial leader, moto fournie..."
                          value={agentFormNotes}
                          onChange={(e) => setAgentFormNotes(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Bouton de sauvegarde */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSavingAgent}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer font-display disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {isSavingAgent ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Enregistrement en cours...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{editingAgent ? 'Enregistrer les Modifications' : 'Créer et Générer le Code Commercial'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODALE DE SUCCÈS : COMMERCIAL CRÉÉ & TRANSMISSION 1-CLIC */}
            {/* ========================================================= */}
            {agentSuccessModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 text-white">
                  {/* En-tête */}
                  <div className="text-center space-y-1.5 pb-1">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black font-display text-white">
                      Commercial Prêt pour le Terrain !
                    </h3>
                    <p className="text-xs text-slate-400">
                      Le code commercial unique a été généré avec succès.
                    </p>
                  </div>

                  {/* Fiche récapitulative */}
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Commercial :</span>
                      <strong className="text-xs text-white font-display">{agentSuccessModal.fullName}</strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Téléphone WhatsApp :</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">📞 {agentSuccessModal.phone}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Équipe & Zone :</span>
                      <span className="text-xs font-bold text-slate-200">
                        {agentSuccessModal.teamName || 'Indépendant'} {agentSuccessModal.zone ? `(📍 ${agentSuccessModal.zone})` : ''}
                      </span>
                    </div>

                    {/* Grand Badge Code */}
                    <div className="pt-1 text-center space-y-1">
                      <span className="text-[10px] uppercase font-black text-amber-300/90 tracking-wider">
                        Code Commercial à Renseigner par les Commerçants
                      </span>
                      <div className="p-2.5 bg-amber-500/15 border-2 border-amber-500/60 rounded-xl">
                        <span className="font-mono font-black text-xl text-amber-400 tracking-widest">
                          {agentSuccessModal.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action : WhatsApp 1-Clic & Copier */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenCommercialWhatsApp(agentSuccessModal)}
                      className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 active:scale-98 transition-all cursor-pointer font-display"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Envoyer la Fiche & Code sur WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyCommercialWelcome(agentSuccessModal)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition-all cursor-pointer font-display"
                    >
                      {agentCopiedId === agentSuccessModal.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Pack d'Onboarding Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copier le Pack & Instructions</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAgentSuccessModal(null)}
                      className="w-full py-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODALE DE CRÉATION / MODIFICATION D'ÉQUIPE */}
            {isTeamModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Building className="w-5 h-5" />
                      <h3 className="font-black text-white text-sm sm:text-base font-display">
                        {editingTeam ? 'Modifier l\'Équipe Commerciale' : 'Créer une Nouvelle Équipe Commerciale'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTeamModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTeam} className="space-y-3.5">
                    {/* Nom de l'équipe */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Nom de l'équipe *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Équipe Ouaga Nord, Équipe Bobo Espoir"
                        value={teamFormName}
                        onChange={(e) => setTeamFormName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* Responsable & Téléphone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Nom du Responsable / Chef
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Moussa SAWADOGO"
                          value={teamFormLeaderName}
                          onChange={(e) => setTeamFormLeaderName(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Téléphone WhatsApp du Responsable
                        </label>
                        <input
                          type="tel"
                          placeholder="Ex: 70 12 34 56"
                          value={teamFormLeaderPhone}
                          onChange={(e) => setTeamFormLeaderPhone(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Zone & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Zone / Ville d'intervention
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Ouagadougou, Bobo, Koudougou"
                          value={teamFormZone}
                          onChange={(e) => setTeamFormZone(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Description / Objectifs
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Marché central, Rood-Woko..."
                          value={teamFormDescription}
                          onChange={(e) => setTeamFormDescription(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Codes d'affiliation assignés */}
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Codes Commerciaux Rattachés à cette Équipe
                      </label>

                      {/* Tags des codes déjà ajoutés */}
                      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-950 rounded-xl border border-slate-800">
                        {teamFormCodes.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">
                            Aucun code rattaché. Ajoutez-en ci-dessous ou cliquez sur les suggestions.
                          </span>
                        ) : (
                          teamFormCodes.map(code => (
                            <span
                              key={code}
                              className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-bold flex items-center space-x-1"
                            >
                              <span>{code}</span>
                              <button
                                type="button"
                                onClick={() => setTeamFormCodes(teamFormCodes.filter(c => c !== code))}
                                className="hover:text-red-400 ml-1 cursor-pointer"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Saisie d'un nouveau code */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Code commercial (ex: ALI226)"
                          value={teamFormNewCodeInput}
                          onChange={(e) => setTeamFormNewCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!teamFormNewCodeInput.trim()) return;
                            const clean = teamFormNewCodeInput.trim().toUpperCase();
                            if (!teamFormCodes.includes(clean)) {
                              setTeamFormCodes([...teamFormCodes, clean]);
                            }
                            setTeamFormNewCodeInput('');
                          }}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                        >
                          + Ajouter
                        </button>
                      </div>

                      {/* Suggestions des codes existants */}
                      {affiliates.filter(a => !teamFormCodes.includes(a.code)).length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold block">
                            Codes existants disponibles (cliquez pour ajouter) :
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {affiliates
                              .filter(a => !teamFormCodes.includes(a.code))
                              .map(a => (
                                <button
                                  key={a.code}
                                  type="button"
                                  onClick={() => setTeamFormCodes([...teamFormCodes, a.code])}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-amber-600/30 hover:text-amber-200 text-slate-300 rounded text-[10px] font-mono border border-slate-700 cursor-pointer transition-colors"
                                >
                                  + {a.code}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsTeamModalOpen(false)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingTeam}
                        className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer font-display disabled:opacity-50"
                      >
                        {isSavingTeam ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>{editingTeam ? 'Enregistrer Modifications' : 'Créer l\'Équipe'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODALE DE RÈGLEMENT DU DIMANCHE */}
            {settleModalCommercial && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Wallet className="w-5 h-5" />
                      <h3 className="font-black text-white text-sm sm:text-base font-display">
                        Valider le Règlement du Dimanche
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettleModalCommercial(null)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmSettle} className="space-y-3.5">
                    {/* Récapitulatif montant */}
                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 space-y-1 text-center">
                      <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider block">
                        Commission à verser à « {settleModalCommercial.code} »
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono block">
                        {settleModalCommercial.currentWeekCommissionDue.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Correspondant à {settleModalCommercial.currentWeekPaidCount} abonnement(s) validé(s) cette semaine (15%)
                      </span>
                    </div>

                    {/* Mode de règlement */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Mode de versement Mobile Money
                      </label>
                      <select
                        value={settleMethod}
                        onChange={(e) => setSettleMethod(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-amber-500 outline-none"
                      >
                        <option value="ORANGE_MONEY">🟠 Orange Money Burkina</option>
                        <option value="MOOV_MONEY">🔵 Moov Money Burkina</option>
                        <option value="WAVE">🌊 Wave</option>
                        <option value="CASH">💵 Espèces (Remise directe)</option>
                      </select>
                    </div>

                    {/* Référence ou numéro du transfert */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Numéro de transaction / Référence du dépôt (Optionnel)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: TXN_OM_12345678"
                        value={settleTxRef}
                        onChange={(e) => setSettleTxRef(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* Notes libres */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Notes & Remarques (Optionnel)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Virement envoyé sur le numéro 70123456"
                        value={settleNotes}
                        onChange={(e) => setSettleNotes(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 outline-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSettleModalCommercial(null)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isSettling}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-900/40 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSettling ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Confirmer le Règlement</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4 : ANNONCES & BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleSaveBroadcast} className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Megaphone className="w-5 h-5" />
                  <h3 className="font-bold text-xs sm:text-sm text-white font-display">Diffusion de Message Broadcast aux Commerçants</h3>
                </div>
                {broadcast?.isActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase font-display border border-emerald-500/30 self-start sm:self-auto">
                    En Ligne sur les Téléphones
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Titre de l'Annonce *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 🚀 Mise à jour disponible / 🎁 Promo Annuelle"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-bold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Type d'Annonce & Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'info', label: 'ℹ️ Information', color: 'border-blue-500 bg-blue-500/20 text-blue-300' },
                      { id: 'promo', label: '🎁 Promotion Flash', color: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBroadcastType(m.id as any)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                          broadcastType === m.id ? m.color : 'border-slate-800 text-slate-400 bg-slate-800/40 hover:text-white'
                        }`}
                      >
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-display">
                    Message Complet à Afficher *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ex: Profitez dès aujourd'hui du forfait annuel à 20 000 FCFA avec assistance 24/7..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
                  ></textarea>
                </div>
              </div>

              {broadcastSuccess && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/50 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{broadcastSuccess}</span>
                </p>
              )}

              {/* Aperçu en direct */}
              <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-display">Aperçu pour le commerçant :</span>
                <div className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 ${
                  broadcastType === 'promo'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                    : 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
                }`}>
                  <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">{broadcastTitle || 'Titre de votre annonce'}</strong>
                    <span>{broadcastMessage || 'Le texte du message apparaîtra ici directement sur tous les téléphones des commerçants.'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {broadcast?.isActive && (
                  <button
                    type="button"
                    onClick={handleDisableBroadcast}
                    className="w-full sm:w-1/3 py-3 sm:py-3.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 font-bold rounded-xl sm:rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer"
                  >
                    Désactiver l'Annonce
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingBroadcast}
                  className={`${broadcast?.isActive ? 'w-full sm:w-2/3' : 'w-full'} py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl sm:rounded-2xl text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 font-display cursor-pointer disabled:opacity-50`}
                >
                  <Send className="w-4 h-4" />
                  <span>{isSavingBroadcast ? 'Diffusion...' : 'Diffuser sur Tous les Téléphones'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5 : RELANCES & DIFFUSION GROUPÉE WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center space-x-2.5 text-emerald-400">
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white font-display">Listes de Diffusion & Relances WhatsApp</h3>
                  <p className="text-xs text-slate-400">Relancez vos commerçants par groupe ciblé en un seul clic</p>
                </div>
              </div>

              {relanceFeedback && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-300 animate-in fade-in duration-150 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{relanceFeedback}</span>
                </div>
              )}
            </div>

            {/* LISTE 1 : ABONNÉS EN VERSION D'ESSAI */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-900/40 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-white font-display">
                      Liste 1 : Abonnés en Version d'Essai
                    </h4>
                    <p className="text-[11px] text-slate-400">Commerçants en période d'essai de 10 jours ou arrivant à expiration</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black font-mono">
                    {trialShops.length} boutique(s) • {getShopPhones(trialShops).length} contact(s)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider font-display">
                  Message de relance (Version d'Essai)
                </label>
                <textarea
                  rows={5}
                  value={trialRelanceMessage}
                  onChange={(e) => setTrialRelanceMessage(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
                  placeholder="Rédigez le message pour les abonnés en version d'essai..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyGroupPhones("Abonnés Essai", trialShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier tous les numéros pour créer une liste de diffusion WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Copier Numéros</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyGroupMessage(trialRelanceMessage, "Abonnés Essai")}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier le texte du message"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Message</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportGroupVCard("Abonnes_Essai", trialShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Télécharger le carnet de contacts .VCF pour votre téléphone"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Carnet (.VCF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppGroup(trialRelanceMessage, "Abonnés Essai")}
                  className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer font-display"
                  title="Copier le message et ouvrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Relancer WhatsApp</span>
                </button>
              </div>
            </div>

            {/* LISTE 2 : ABONNÉS EN VERSION PAYANTE */}
            <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-900/40 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-white font-display">
                      Liste 2 : Abonnés en Version Payante
                    </h4>
                    <p className="text-[11px] text-slate-400">Commerçants avec une licence active (1 mois, 6 mois, 1 an)</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-mono">
                    {paidShops.length} boutique(s) • {getShopPhones(paidShops).length} contact(s)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider font-display">
                  Message pour les Abonnés Payants
                </label>
                <textarea
                  rows={5}
                  value={paidRelanceMessage}
                  onChange={(e) => setPaidRelanceMessage(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                  placeholder="Rédigez le message pour les abonnés payants..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyGroupPhones("Abonnés Payants", paidShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier tous les numéros pour créer une liste de diffusion WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Numéros</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyGroupMessage(paidRelanceMessage, "Abonnés Payants")}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Copier le texte du message"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copier Message</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportGroupVCard("Abonnes_Payants", paidShops)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-display"
                  title="Télécharger le carnet de contacts .VCF pour votre téléphone"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Carnet (.VCF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppGroup(paidRelanceMessage, "Abonnés Payants")}
                  className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer font-display"
                  title="Copier le message et ouvrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Envoyer WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CHANGEMENT DE PIN ADMIN */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white font-display">Modifier le PIN Super-Admin</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordSuccess('');
                    setNewPassword('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 font-display">
                    Nouveau Mot de Passe / Code PIN
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Entrez le nouveau PIN administrateur"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {passwordSuccess && (
                  <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/50 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordModalOpen(false);
                      setPasswordSuccess('');
                      setNewPassword('');
                    }}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all font-display cursor-pointer"
                  >
                    Enregistrer PIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* MODALE DE DÉTAILS COMPLETS DE LA BOUTIQUE */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header Modale */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white font-display break-words">
                    {selectedShop.name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getShopBadge(selectedShop).style}`}>
                    {getShopBadge(selectedShop).label}
                  </span>
                </div>
                {selectedShop.description && (
                  <p className="text-xs text-emerald-400 italic">
                    « {selectedShop.description} »
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification de feedback d'action */}
            {shopActionFeedback && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-300 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{shopActionFeedback}</span>
              </div>
            )}

            {/* Grille d'informations complètes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Téléphone Boutique</span>
                </span>
                <span className="text-sm font-bold text-white block font-mono">{selectedShop.phone}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <User className="w-3 h-3 text-emerald-400" />
                  <span>Gérant / Propriétaire</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.ownerName || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3 text-emerald-400" />
                  <span>WhatsApp Gérant</span>
                </span>
                <span className="text-sm font-bold text-white block font-mono">{selectedShop.ownerPhone || 'Identique'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Ville & Localité</span>
                </span>
                <span className="text-sm font-bold text-white block">{selectedShop.city || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Building className="w-3 h-3 text-sky-400" />
                  <span>Numéro IFU</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">{selectedShop.ifu || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <FileText className="w-3 h-3 text-sky-400" />
                  <span>Registre RCCM</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">{selectedShop.rccm || 'Non renseigné'}</span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Échéance de l'Abonnement</span>
                </span>
                <span className="text-xs font-bold text-amber-300 block">
                  {selectedShop.formattedExpiresAt} ({selectedShop.daysRemaining} jour(s) restants)
                </span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>Commercial / Parrain</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 block">
                  {selectedShop.referralCode ? `🤝 ${selectedShop.referralCode}` : 'Inscription directe'}
                </span>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Date de Création</span>
                </span>
                <span className="text-xs font-bold text-slate-200 block">
                  {selectedShop.createdAt ? new Date(selectedShop.createdAt).toLocaleDateString('fr-FR') : 'Inconnue'}
                </span>
              </div>
            </div>

            {/* Statistiques d'activité */}
            <div className="bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-display">
                Activité Commerciale Enregistrée
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Ventes</span>
                  <span className="text-sm font-black text-white font-mono">{selectedShop.salesCount}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-emerald-400 block font-bold">Chiffre d'Affaires</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono truncate">{formatCurrency(selectedShop.totalSalesVolume)}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Clients</span>
                  <span className="text-sm font-black text-white font-mono">{selectedShop.customersCount}</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 block font-bold">Dettes en cours</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 font-mono truncate">{formatCurrency(selectedShop.totalDebtsAmount)}</span>
                </div>
              </div>
            </div>

            {/* BLOC ACTIVATION MANUELLE EN CAS DE PROBLÈME TECHNIQUE OU PAIEMENT DIRECT */}
            <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-500/40 shadow-inner space-y-3">
              <div className="flex items-start space-x-2.5 text-emerald-300">
                <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-white font-display">
                    Activation Manuelle Immédiate (Super-Admin)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Débloque ou active instantanément l'abonnement du commerçant en cas de difficulté technique après paiement ou pour un accord direct.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleManualActivation(selectedShop.id, 1)}
                  className="p-2.5 bg-slate-800/90 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 hover:border-emerald-500 transition-all text-center cursor-pointer font-display shadow-xs min-h-[44px]"
                >
                  <span className="block font-black text-amber-300">+1 Mois</span>
                  <span className="text-[10px] text-slate-400 block font-normal">2 000 FCFA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManualActivation(selectedShop.id, 3)}
                  className="p-2.5 bg-slate-800/90 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 hover:border-emerald-500 transition-all text-center cursor-pointer font-display shadow-xs min-h-[44px]"
                >
                  <span className="block font-black text-amber-300">+3 Mois</span>
                  <span className="text-[10px] text-slate-400 block font-normal">6 000 FCFA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManualActivation(selectedShop.id, 6)}
                  className="p-2.5 bg-slate-800/90 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 hover:border-emerald-500 transition-all text-center cursor-pointer font-display shadow-xs min-h-[44px]"
                >
                  <span className="block font-black text-amber-300">+6 Mois</span>
                  <span className="text-[10px] text-slate-400 block font-normal">10 000 FCFA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManualActivation(selectedShop.id, 12)}
                  className="p-2.5 bg-slate-800/90 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl border border-slate-700 hover:border-emerald-500 transition-all text-center cursor-pointer font-display shadow-xs min-h-[44px]"
                >
                  <span className="block font-black text-emerald-300">+1 An (Promo)</span>
                  <span className="text-[10px] text-slate-400 block font-normal">20 000 FCFA</span>
                </button>
              </div>
            </div>

            {/* Actions complémentaires sur la boutique */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <a
                  href={adminService.getWhatsAppReminderUrl(selectedShop)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer font-display min-h-[40px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contacter sur WhatsApp</span>
                </a>

                {/* Bouton de Suppression Définitive */}
                <button
                  type="button"
                  onClick={() => handleDeleteShop(selectedShop.id, selectedShop.name)}
                  className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/80 active:scale-95 text-red-300 hover:text-red-100 text-xs font-bold rounded-xl border border-red-800/60 flex items-center justify-center space-x-2 transition-all cursor-pointer font-display min-h-[40px]"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Supprimer définitivement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE CRÉATION / MODIFICATION CHEF D'ÉQUIPE (MINI-ADMIN) */}
      {/* ========================================================= */}
      {isLeaderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm sm:text-base font-display">
                    {editingLeader ? 'Modifier le Chef d\'Équipe' : 'Créer un Compte Chef d\'Équipe'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Accès Mini-Administrateur pour piloter une équipe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeader} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom et Prénom du Chef d'équipe *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Oumar Traoré"
                  value={leaderFormFullName}
                  onChange={(e) => setLeaderFormFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro de téléphone WhatsApp (8 chiffres) *
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-400 font-mono font-bold">
                    +226
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="70 11 22 33"
                    value={leaderFormPhone}
                    onChange={(e) => setLeaderFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {editingLeader ? 'Nouveau Code PIN d\'accès (laisser vide pour ne pas changer)' : 'Code PIN d\'accès (4 à 6 chiffres) *'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required={!editingLeader}
                  placeholder={editingLeader ? 'Laisser vide pour conserver' : 'Ex: 1234'}
                  value={leaderFormPin}
                  onChange={(e) => setLeaderFormPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Équipe Commerciale rattachée
                </label>
                <select
                  value={leaderFormTeamId}
                  onChange={(e) => setLeaderFormTeamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:border-amber-500 outline-none"
                >
                  <option value="">Sélectionner une équipe existante...</option>
                  {teamsReports.map(tr => (
                    <option key={tr.team.id} value={tr.team.id}>
                      🏢 {tr.team.name} {tr.team.zone ? `(📍 ${tr.team.zone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Zone d'intervention
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bobo-Dioulasso, Ouaga Centre..."
                  value={leaderFormZone}
                  onChange={(e) => setLeaderFormZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Statut du compte
                </label>
                <select
                  value={leaderFormStatus}
                  onChange={(e) => setLeaderFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:border-amber-500 outline-none"
                >
                  <option value="active">Actif (Accès autorisé)</option>
                  <option value="inactive">Inactif (Accès suspendu)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLeaderModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer min-h-[40px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeader}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center space-x-1.5 transition-all cursor-pointer font-display disabled:opacity-50 min-h-[40px] active:scale-95"
                >
                  {isSavingLeader ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{editingLeader ? 'METTRE À JOUR' : 'CRÉER LE COMPTE CHEF'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE SUCCÈS CHEF D'ÉQUIPE & ENVOI ACCÈS WHATSAPP */}
      {/* ========================================================= */}
      {leaderWelcomeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 text-center max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-base sm:text-lg font-display">
                Compte Chef d'Équipe Créé !
              </h3>
              <p className="text-xs text-slate-400">
                <strong className="text-white">{leaderWelcomeModal.leader.fullName}</strong> peut désormais se connecter sur l'espace Mini-Administrateur.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2 text-left text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Numéro de connexion :</span>
                <span className="font-mono font-bold text-white">+226 {leaderWelcomeModal.leader.phone}</span>
              </div>
              {leaderWelcomeModal.rawPin && (
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Code PIN défini :</span>
                  <span className="font-mono font-bold text-amber-400">{leaderWelcomeModal.rawPin}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Équipe assignée :</span>
                <span className="font-bold text-slate-200">{leaderWelcomeModal.leader.teamName}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendLeaderWhatsApp(leaderWelcomeModal.leader, leaderWelcomeModal.rawPin)}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 active:scale-98 transition-all cursor-pointer font-display min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer les accès sur WhatsApp (+226 {leaderWelcomeModal.leader.phone})</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaderWelcomeModal(null)}
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

