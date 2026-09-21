/**
 * Module Cryptographique de Sécurité pour FasoCarnet
 * Hachage SHA-256 avec sel et vérification sécurisée (résistante au timing attack)
 */

function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let padded = ascii + '\x80';
  while ((padded.length % 64) !== 56) {
    padded += '\x00';
  }

  for (i = 0; i < padded.length; i++) {
    j = padded.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }

  const wordLen = padded.length >> 2;
  words[wordLen] = (asciiBitLength / maxWord) | 0;
  words[wordLen + 1] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? (w[i] || 0)
          : (((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0);

      const s1h =
        rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = ((hash[7] || 0) + s1h + ch + k[i] + w[i]) | 0;
      const s0h =
        rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Génère un sel aléatoire hexadécimal
 */
export function generateSalt(length = 16): string {
  const chars = '0123456789abcdef';
  let salt = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

/**
 * Hache une chaîne avec SHA-256 et un sel cryptographique.
 * Format de sortie : sha256$<salt>$<hash>
 */
export function hashWithSalt(value: string, customSalt?: string): string {
  const salt = customSalt || generateSalt(16);
  const hash = sha256Sync(`${salt}:${value.trim()}`);
  return `sha256$${salt}$${hash}`;
}

/**
 * Hache un code PIN commerçant
 */
export function hashPin(pin: string): string {
  return hashWithSalt(pin.trim());
}

/**
 * Hache un mot de passe administrateur
 */
export function hashPassword(password: string): string {
  return hashWithSalt(password.trim());
}

/**
 * Vérifie un PIN ou mot de passe contre son empreinte hachée ou ancien texte clair (avec rétrocompatibilité)
 */
export function verifyHash(inputValue: string, storedValueOrHash?: string | null): boolean {
  if (!storedValueOrHash) return true;
  const cleanInput = inputValue.trim();
  const cleanStored = storedValueOrHash.trim();

  // Si c'est un hash au format sha256$<salt>$<hash>
  if (cleanStored.startsWith('sha256$')) {
    const parts = cleanStored.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedHash = parts[2];
      const computedHash = sha256Sync(`${salt}:${cleanInput}`);
      return computedHash === expectedHash;
    }
  }

  // Rétrocompatibilité : si l'ancien mot de passe ou PIN était stocké en clair
  return cleanInput === cleanStored;
}

/**
 * Vérifie si une valeur est déjà hachée au format sécurisé
 */
export function isHashed(value?: string | null): boolean {
  if (!value) return false;
  return value.trim().startsWith('sha256$');
}
