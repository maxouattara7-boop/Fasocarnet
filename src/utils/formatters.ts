/**
 * Formate un montant en FCFA (XOF) avec séparateur de milliers
 * Exemple: 15000 -> "15 000 FCFA"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

/**
 * Nettoie et formate un numéro de téléphone ouest-africain (ex: Burkina +226)
 */
export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 8) {
    // Numéro burkinabè à 8 chiffres (ex: 70123456)
    return `226${digits}`;
  }
  if (digits.startsWith('00226')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Calcule la monnaie à rendre
 */
export function calculateChange(totalAmount: number, receivedAmount: number): number {
  if (!receivedAmount || receivedAmount < totalAmount) {
    return 0;
  }
  return Math.max(0, receivedAmount - totalAmount);
}

/**
 * Formate une date en français pour l'affichage (ex: "17 Sept 2026 à 14:30")
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}
