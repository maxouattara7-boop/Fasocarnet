/**
 * Convertit un montant numérique en lettres en français (Standard UEMOA / Francs CFA)
 * Ex: 250000 -> "Deux cent cinquante mille"
 * Ex: 12500 -> "Douze mille cinq cents"
 */
export function numberToWordsFrench(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zéro';

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const particuliers: Record<number, string> = {
    11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze', 15: 'quinze', 16: 'seize',
    71: 'soixante et onze', 72: 'soixante-douze', 73: 'soixante-treize', 74: 'soixante-quatorze',
    75: 'soixante-quinze', 76: 'soixante-seize', 77: 'soixante-dix-sept', 78: 'soixante-dix-huit', 79: 'soixante-dix-neuf',
    81: 'quatre-vingt-un', 82: 'quatre-vingt-deux', 83: 'quatre-vingt-trois', 84: 'quatre-vingt-quatre',
    85: 'quatre-vingt-cinq', 86: 'quatre-vingt-six', 87: 'quatre-vingt-sept', 88: 'quatre-vingt-huit', 89: 'quatre-vingt-neuf',
    91: 'quatre-vingt-onze', 92: 'quatre-vingt-douze', 93: 'quatre-vingt-treize', 94: 'quatre-vingt-quatorze',
    95: 'quatre-vingt-quinze', 96: 'quatre-vingt-seize', 97: 'quatre-vingt-dix-sept', 98: 'quatre-vingt-dix-huit', 99: 'quatre-vingt-dix-neuf'
  };

  function convertHundreds(num: number): string {
    let result = '';

    if (num >= 100) {
      const c = Math.floor(num / 100);
      if (c === 1) {
        result += 'cent ';
      } else {
        result += `${unites[c]} cent${num % 100 === 0 ? 's' : ''} `;
      }
      num %= 100;
    }

    if (num > 0) {
      if (particuliers[num]) {
        result += particuliers[num];
      } else if (num < 10) {
        result += unites[num];
      } else {
        const d = Math.floor(num / 10);
        const u = num % 10;
        if (d === 8 && u === 0) {
          result += 'quatre-vingts';
        } else if (u === 1 && d !== 8) {
          result += `${dizaines[d]} et un`;
        } else if (u > 0) {
          result += `${dizaines[d]}-${unites[u]}`;
        } else {
          result += dizaines[d];
        }
      }
    }

    return result.trim();
  }

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  const parts: string[] = [];

  if (milliards > 0) {
    parts.push(`${convertHundreds(milliards)} milliard${milliards > 1 ? 's' : ''}`);
  }
  if (millions > 0) {
    parts.push(`${convertHundreds(millions)} million${millions > 1 ? 's' : ''}`);
  }
  if (milliers > 0) {
    if (milliers === 1) {
      parts.push('mille');
    } else {
      parts.push(`${convertHundreds(milliers)} mille`);
    }
  }
  if (reste > 0 || parts.length === 0) {
    parts.push(convertHundreds(reste));
  }

  const text = parts.join(' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Génère la mention légale d'arrêté de facture / devis / proforma
 */
export function getLegalArreteMention(
  docType: 'INVOICE' | 'QUOTE' | 'PROFORMA',
  totalAmount: number
): { text: string; words: string; fullMention: string } {
  const isQuote = docType === 'QUOTE';
  const isProforma = docType === 'PROFORMA';
  
  const label = isQuote 
    ? 'le présent devis' 
    : isProforma 
    ? 'la présente facture proforma' 
    : 'la présente facture';

  const prefix = isQuote ? 'Arrêté' : 'Arrêtée';
  const words = numberToWordsFrench(totalAmount);
  const formattedAmount = totalAmount.toLocaleString('fr-FR');

  const fullMention = `${prefix} ${label} à la somme de : ${words} (${formattedAmount}) Francs CFA TTC.`;

  return {
    text: `${prefix} ${label} à la somme de ${formattedAmount} FCFA TTC`,
    words,
    fullMention
  };
}
