import React, { useState } from 'react';
import { 
  X, 
  Search, 
  HelpCircle, 
  ShoppingCart, 
  BookOpen, 
  TrendingDown, 
  Package, 
  ShieldCheck, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  FileText
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badgeColor: string;
  items: {
    question: string;
    answer: React.ReactNode;
  }[];
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleItem = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sections: GuideSection[] = [
    {
      id: 'factures',
      title: 'Factures & Devis Libres',
      icon: FileText,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      items: [
        {
          question: 'Comment créer une facture, un devis ou une facture proforma personnalisée ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans l'en-tête en haut de l'écran, cliquez sur le bouton <strong>📄 Factures</strong> :</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Choisissez le type de document : <strong>Facture de Vente</strong>, <strong>Devis Commercial</strong> ou <strong>Facture Proforma</strong>.</li>
                <li>Le numéro de document (ex: <code className="bg-slate-100 px-1 rounded font-bold">FAC-202609-001</code> ou <code className="bg-slate-100 px-1 rounded font-bold">DEV-202609-001</code>) est généré automatiquement.</li>
                <li>Renseignez les coordonnées du client (Nom, Téléphone, Adresse, IFU) ou sélectionnez un client existant dans votre liste.</li>
                <li>Ajoutez des lignes d'articles depuis votre catalogue ou saisissez des prestations / désignations libres avec leurs prix et quantités.</li>
                <li>Appliquez une remise (% ou montant) et la TVA si applicable.</li>
                <li>Cliquez sur <strong>🖨️ Imprimer A4</strong> pour éditer un PDF/A4 impeccable ou <strong>📱 WhatsApp</strong> pour l'expédier directement à votre client.</li>
              </ol>
            </div>
          )
        },
        {
          question: 'Les devis et factures libres impactent-ils les stocks et la caisse ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Non, ce module vous permet de rédiger des devis, des offres de prix proforma et des factures pour des clients sans impacter immédiatement les stocks ni la trésorerie de votre caisse journalière jusqu'à encaissement réel.</p>
            </div>
          )
        }
      ]
    },
    {
      id: 'caisse',
      title: 'Caisse & Encaissements',
      icon: ShoppingCart,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      items: [
        {
          question: 'Pourquoi la caisse bloque-t-elle l\'ajout si le stock est épuisé ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p><strong className="text-emerald-800">Gestion rigoureuse des stocks :</strong> Pour garantir l'exactitude de votre inventaire, aucun article ne peut être vendu s'il n'y a pas de stock disponible ($\le 0$) ou si la quantité demandée dépasse le stock restant.</p>
              <p>Si un article est en rupture, réapprovisionnez-le simplement dans <em>Paramètres → Catalogue</em> pour débloquer sa vente en caisse.</p>
            </div>
          )
        },
        {
          question: 'Comment annuler ou supprimer une vente en cas d\'erreur ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans l'onglet <strong>Bilan</strong>, retrouvez la vente dans le <em>Journal des Ventes</em> et cliquez sur l'icône d'annulation <strong>(↩️)</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-slate-900">Protection PIN :</strong> Le code PIN secret à 4 chiffres du commerçant est obligatoirement requis pour valider l'annulation.</li>
                <li><strong className="text-emerald-800">Restitution du stock :</strong> Tous les articles de la vente sont réintégrés automatiquement dans votre stock boutique.</li>
                <li><strong className="text-blue-800">Annulation de la dette :</strong> Si la vente avait été faite à crédit ou avec acompte, le montant correspondant est automatiquement déduit du solde du client.</li>
                <li><strong className="text-amber-800">Recalcul financier :</strong> Le CA du jour, la marge et la trésorerie sont recalculés instantanément.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment utiliser le clavier de caisse et les additions (+)',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Le clavier de caisse est optimisé pour des saisies ultra-rapides :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-slate-900">+ (Addition) :</strong> tapez un montant, appuyez sur <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-bold">+</code> puis tapez le suivant (ex: <code className="bg-slate-100 px-1 rounded">2500 + 1000</code>).</li>
                <li><strong className="text-slate-900">Articles & Quantités :</strong> cliquez sur un article pour choisir sa quantité exacte (1, 2, 5, 10...) dans la limite du stock disponible.</li>
                <li><strong className="text-slate-900">00 et 000 :</strong> saisissez les centaines et milliers en un seul geste sans faire d'erreur.</li>
              </ul>
              <p className="text-emerald-700 font-medium">💡 L'écran supérieur calcule le total instantanément au fur et à mesure.</p>
            </div>
          )
        },
        {
          question: 'Comment appliquer une remise et comment apparaît-elle sur la facture ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour accorder un rabais ou une réduction à un client :</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Cliquez sur le bouton <strong>Remise</strong> situé juste au-dessus du clavier.</li>
                <li>Choisissez le type : <strong>En Pourcentage (%)</strong> (ex: 5%, 10%, 20%) ou <strong>Montant Fixe (FCFA)</strong> (ex: 500 F, 1 000 F).</li>
                <li>L'écran calcule le montant net à payer et affiche le sous-total brut ainsi que la remise déduite.</li>
                <li><strong>Sur la facture & le ticket thermique :</strong> le <em>Sous-Total Brut</em>, la <em>Remise accordée</em> et le <em>Net à Payer</em> sont affichés de manière parfaitement claire et transparente.</li>
              </ol>
            </div>
          )
        },
        {
          question: 'Comment faire une vente avec acompte (paiement partiel) ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour un client qui verse une partie du montant et doit régler le reste plus tard :</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Saisissez le montant total de la vente et cliquez sur <strong>Encaisser</strong>.</li>
                <li>Choisissez l'option <strong>Acompte + Dette</strong>.</li>
                <li>Sélectionnez le mode de versement de l'acompte (Cash, OM, Moov, Wave) et saisissez la somme reçue.</li>
                <li>Le <strong>reliquat restant</strong> est calculé automatiquement et ajouté directement dans le carnet de dettes du client sélectionné.</li>
                <li>Une <strong>Facture Commerciale officielle</strong> mentionnant l'acompte, la dette restante, la mention légale d'arrêt et la signature du responsable est générée.</li>
              </ol>
            </div>
          )
        },
        {
          question: 'Comment sécuriser les paiements Mobile Money (Orange Money, Moov, Wave) ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour éviter les fraudes (faux SMS de confirmation présentés par les clients) :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Lorsqu'un moyen Mobile Money est sélectionné, l'application vous rappelle votre numéro marchand configuré.</li>
                <li><strong className="text-amber-800">Règle d'or :</strong> Vérifiez toujours la réception effective du SMS officiel sur votre propre téléphone et contrôlez votre solde avant de remettre la marchandise.</li>
                <li>Vous pouvez saisir l'<strong>ID / Référence de transaction</strong> dans le champ prévu : il sera imprimé sur le ticket pour une traçabilité comptable parfaite.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment imprimer ou envoyer un reçu WhatsApp ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dès qu'une vente est validée, le modal de reçu s'affiche avec 3 options :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>📱 Partager WhatsApp :</strong> ouvre directement une conversation WhatsApp avec le client avec le détail complet du ticket formaté (incluant les remises déduites).</li>
                <li><strong>🖨️ Imprimer Reçu :</strong> imprime instantanément sur imprimante thermique 58mm (Bluetooth, USB ou système).</li>
                <li><strong>💾 Télécharger Image :</strong> enregistre une photo haute définition du reçu dans votre galerie de photos.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'dettes',
      title: 'Carnet de Dettes & Crédits',
      icon: BookOpen,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      items: [
        {
          question: 'Comment accorder un crédit à un client ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour accorder un achat à crédit :</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Sur l'écran de caisse, cliquez sur <strong>Encaisser</strong> puis choisissez <strong>100% Crédit</strong>.</li>
                <li>Sélectionnez le client dans votre carnet ou cliquez sur <strong>+ Nouveau Client</strong> pour renseigner son nom et numéro de téléphone.</li>
                <li>Validez : la dette est créée automatiquement et un reçu portant la mention <em>"FACTURE À CRÉDIT & Reconnaissance de Dette"</em> est généré.</li>
              </ol>
            </div>
          )
        },
        {
          question: 'Comment relancer un client en retard de paiement sur WhatsApp ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Rendez-vous dans l'onglet <strong>Dettes</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Recherchez le client dans la liste.</li>
                <li>Cliquez sur le bouton <strong>Relancer WhatsApp</strong> (icône verte).</li>
                <li>Un message courtois et professionnel contenant le solde exact restant dû et vos numéros de règlement (OM, Moov, Wave) est généré automatiquement.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment enregistrer un remboursement ou acompte sur une dette ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans l'onglet <strong>Dettes</strong>, cliquez sur <strong>Régler / Rembourser</strong> sur la fiche du client. Saisissez le montant versé et le moyen de paiement (Espèces, OM, Moov, Wave). Le solde du client diminue immédiatement et vous pouvez lui envoyer un reçu d'acompte sur WhatsApp.</p>
            </div>
          )
        }
      ]
    },
    {
      id: 'depenses',
      title: 'Bilan, Marges & Bénéfices',
      icon: TrendingDown,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      items: [
        {
          question: 'Comment sont calculés la Marge Commerciale Brute et le Bénéfice Net ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>L'application suit la comptabilité analytique de votre commerce en temps réel :</p>
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800">
                <p><strong>Marge Brute</strong> = Total Ventes (Cash + MM + Crédit) − Coût d'Achat des Marchandises Vendues (CAMV)</p>
                <p><strong>Bénéfice Net</strong> = Marge Brute − Dépenses d'Exploitation payées</p>
              </div>
              <p>Si vous avez renseigné le prix d'achat de vos articles, vous connaissez immédiatement vos bénéfices réels nets de chaque journée et de chaque mois.</p>
            </div>
          )
        },
        {
          question: 'Comment enregistrer une sortie d\'argent ou dépense de la boutique ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans l'onglet <strong>Bilan</strong>, cliquez sur le bouton rouge <strong>+ Nouvelle Dépense</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Saisissez le montant de la dépense.</li>
                <li>Choisissez la catégorie (Achat stock / Marchandises, Transport, Factures SONABEL/ONEA/Loyer, Nourriture, Salaires, Retrait patron, Autre).</li>
                <li>Sélectionnez le compte débité (Caisse Espèces, Orange Money, Moov Money, Wave).</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Qu\'est-ce que le "Flux Net de Trésorerie" sur le Bilan ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Le <strong>Flux Net de Trésorerie</strong> représente l'argent réel entré en caisse et sur vos comptes aujourd'hui :</p>
              <div className="bg-slate-100 p-2 rounded-lg font-mono text-[11px] text-slate-800">
                Trésorerie Réelle = (Ventes encaissées + Dettes recouvrées) − Dépenses
              </div>
              <p>Ce chiffre vous indique les liquidités disponibles immédiatement.</p>
            </div>
          )
        },
        {
          question: 'Comment exporter mes rapports sur Excel ou PDF ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Sur l'écran <strong>Bilan</strong>, vous disposez de boutons pour :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>📊 Exporter Excel :</strong> génère une feuille de calcul complète avec la synthèse de rentabilité (Marge, Bénéfice Net, CAMV), le journal détaillé des ventes et des dépenses.</li>
                <li><strong>📲 Rapport Patron WhatsApp :</strong> envoie en un clic le récapitulatif financier complet (Ventes, Dépenses, Marge Brute et Bénéfice Net) au propriétaire du magasin.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'articles',
      title: 'Catalogue, Stocks & Approvisionnements',
      icon: Package,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      items: [
        {
          question: 'Comment fonctionne la gestion obligatoire des stocks ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans <strong>Paramètres → Catalogue</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Chaque article créé possède obligatoirement une <strong>quantité en stock initiale</strong> ($\ge 0$).</li>
                <li>Il n'y a pas d'article à stock infini. Lors d'une vente en caisse, le stock diminue automatiquement.</li>
                <li>Si le stock atteint 0, l'article passe en rupture et la caisse bloque toute vente jusqu'à nouvel approvisionnement.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment renseigner le Prix d\'Achat, Prix de Vente et calculer la Marge ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans <strong>Paramètres → Catalogue</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Renseignez le <strong>Prix d'achat unitaire (FCFA)</strong> et le <strong>Prix de vente (FCFA)</strong>.</li>
                <li>La <strong>Marge unitaire</strong> en FCFA et en pourcentage (%) est calculée et affichée instantanément en temps réel (ex: <em>+2 500 F (+25%)</em>).</li>
                <li>Cette marge alimente automatiquement le calcul du bénéfice net sur le Bilan.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment consulter et exporter l\'historique des arrivages groupés par date ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour suivre tous les réapprovisionnements et entrées de stock reçus :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cliquez sur le bouton <strong>📦 Approvisionnements</strong> dans <em>Paramètres → Catalogue</em> ou directement depuis l'onglet <em>Bilan</em>.</li>
                <li>Les approvisionnements sont <strong>groupés par session/date d'arrivage</strong> (ex: <em>Arrivage du 26 Septembre 2026</em>).</li>
                <li>Au clic sur une session, découvrez le détail de tous les articles reçus ce jour-là, leur fournisseur, prix d'achat et marges.</li>
                <li>Cliquez sur <strong>Exporter Excel (CSV)</strong> pour télécharger le registre complet d'approvisionnement.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment scanner des articles avec la caméra ou une douchette ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Sur l'écran de Caisse :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Caméra smartphone :</strong> cliquez sur le bouton <strong>Scanner</strong> pour ouvrir la caméra et viser le code-barres.</li>
                <li><strong>Douchette Code-barres (USB / Bluetooth) :</strong> il suffit de biper l'article à n'importe quel moment sur l'écran de caisse. L'application le détecte automatiquement et l'ajoute au panier sans toucher l'écran.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'securite',
      title: 'Sécurité, Sauvegarde & Hors-ligne',
      icon: ShieldCheck,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      items: [
        {
          question: 'L\'application fonctionne-t-elle sans connexion Internet ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p><strong className="text-emerald-700">Oui, à 100% !</strong> FasoCarnet est conçu pour les réalités locales :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Toutes vos ventes, dettes, clients et dépenses sont enregistrés instantanément dans la mémoire locale de votre appareil (IndexedDB sécurisée).</li>
                <li>Vous pouvez encaisser, imprimer et gérer votre boutique sans aucune coupure, même en zone blanche ou sans forfait data.</li>
                <li>Dès qu'une connexion Internet est disponible, l'indicateur dans le haut de l'écran se synchronise automatiquement avec le Cloud sécurisé.</li>
              </ul>
            </div>
          )
        },
        {
          question: 'Comment protéger ma caisse avec un Code PIN ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans <strong>Paramètres → Mon Commerce → Code PIN de sécurité</strong>, définissez un code secret à 4 chiffres. Vous pourrez verrouiller la caisse d'un clic sur l'icône de cadenas pour empêcher les accès non autorisés lorsque vous vous éloignez.</p>
            </div>
          )
        },
        {
          question: 'Pourquoi un code PIN est demandé pour modifier les numéros Mobile Money ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Pour protéger le commerçant contre toute tentative malveillante (ex: un employé ou un tiers qui remplacerait le numéro marchand par le sien), toute modification des numéros Orange Money, Moov Money ou Wave exige obligatoirement la confirmation par le code PIN du propriétaire.</p>
            </div>
          )
        },
        {
          question: 'Comment vérifier et installer les mises à jour de l\'application ?',
          answer: (
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>Dans <strong>Paramètres → Mise à Jour de l'Application</strong>, vous disposez d'un bouton dédié <strong>Vérifier les Mises à Jour</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>L'application interroge directement les serveurs pour détecter toute nouvelle version publiée.</li>
                <li>Si une mise à jour est disponible, un bouton <strong>Télécharger & Mettre à jour</strong> apparaît avec le journal des nouveautés.</li>
                <li>Le téléchargement de l'APK ou du paquet démarre instantanément en un clic.</li>
              </ul>
            </div>
          )
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => {
    const matchesCategory = activeCategory === 'all' || activeCategory === section.id;
    if (!matchesCategory) return null;

    const filteredItems = section.items.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        section.title.toLowerCase().includes(q)
      );
    });

    if (filteredItems.length === 0) return null;

    return {
      ...section,
      items: filteredItems
    };
  }).filter(Boolean) as GuideSection[];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200">
        {/* Header modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-display">
                Guide d'Utilisation & Centre d'Aide
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                Conseils, astuces et réponses aux questions fréquentes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de recherche et filtre de catégories */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une fonction (calculatrice, acompte, dette, dépense, bluetooth)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Filtres par catégories */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🌟 Tout voir
            </button>
            {sections.map(s => {
              const IconComp = s.icon;
              const isActive = activeCategory === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveCategory(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Corps avec accordéons */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {filteredSections.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <p className="text-sm font-bold text-slate-700">Aucun résultat trouvé pour "{searchQuery}"</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Essayez d'autres mots-clés comme "vente", "acompte", "crédit", "imprimante" ou "dépense".
              </p>
            </div>
          ) : (
            filteredSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <SectionIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider font-display">
                      {section.title}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item, idx) => {
                      const itemKey = `${section.id}-${idx}`;
                      const isExpanded = expandedItems[itemKey] !== false; // Ouvert par défaut pour clarté
                      return (
                        <div
                          key={itemKey}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition-all shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleItem(itemKey)}
                            className="w-full px-4 py-3 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer"
                          >
                            <span className="pr-2">{item.question}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/40">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer avec bouton WhatsApp Support */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            Besoin d'aide supplémentaire ou d'une formation personnalisée ?
          </div>
          <a
            href="https://wa.me/22670000000?text=Bonjour%20Support%20FasoCarnet,%20j'ai%20besoin%20d'aide%20sur%20l'application"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contacter le Support WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
