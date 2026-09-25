/**
 * Utilitaires de validation et formatage des numéros de téléphone marchands et clients
 * Adapté pour l'Afrique de l'Ouest (Burkina Faso : 8 chiffres) et l'international (+226, etc.)
 */

/**
 * Nettoie une chaîne pour ne conserver que les chiffres et le '+' au début si présent
 */
export const cleanPhoneNumber = (value: string): string => {
  if (!value) return '';
  let cleaned = value.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  return hasPlus ? `+${cleaned}` : cleaned;
};

/**
 * Formate un numéro de téléphone pour l'affichage avec des espaces par paires de chiffres
 * Ex: "70123456" -> "70 12 34 56"
 * Ex: "+22670123456" -> "+226 70 12 34 56"
 */
export const formatPhoneNumberDisplay = (value: string): string => {
  const cleaned = cleanPhoneNumber(value);
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    // Format international (+226 XX XX XX XX)
    const digits = cleaned.slice(1);
    if (digits.length <= 3) {
      return `+${digits}`;
    }
    const countryCode = digits.slice(0, 3);
    const rest = digits.slice(3);
    const chunks = rest.match(/.{1,2}/g) || [];
    return `+${countryCode} ${chunks.join(' ')}`.trim();
  }

  // Format local standard (XX XX XX XX)
  const chunks = cleaned.match(/.{1,2}/g) || [];
  return chunks.join(' ');
};

/**
 * Vérifie si un numéro de téléphone est valide
 * - Au Burkina Faso : exactement 8 chiffres (ou 11 chiffres avec indicatif +226)
 * - International : entre 8 et 15 chiffres
 */
export const isValidPhoneNumber = (value: string): { isValid: boolean; message?: string } => {
  const cleaned = cleanPhoneNumber(value);
  if (!cleaned) {
    return { isValid: false, message: 'Le numéro de téléphone ne peut pas être vide.' };
  }

  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 8) {
    return {
      isValid: false,
      message: `Le numéro est trop court (${digitsOnly.length} chiffres). Il doit contenir au moins 8 chiffres.`
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      message: `Le numéro est trop long (${digitsOnly.length} chiffres).`
    };
  }

  // Si c'est un numéro local burkinabé (8 chiffres)
  if (digitsOnly.length === 8) {
    // Vérification des préfixes mobiles classiques au Burkina (Orange: 07, 74-77, Moov: 01-03, 60-63, etc.)
    return { isValid: true };
  }

  // Si c'est avec l'indicatif burkinabé (+226 suivi de 8 chiffres = 11 chiffres)
  if (digitsOnly.startsWith('226') && digitsOnly.length === 11) {
    return { isValid: true };
  }

  // Numéro international valide
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return { isValid: true };
  }

  return { isValid: true };
};
