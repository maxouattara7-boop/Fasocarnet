/**
 * Moteur de calcul d'expression mathématique pour le clavier de caisse TPV (FasoCarnet)
 * Supporte les opérations d'addition (+), de soustraction/remise (-) et de multiplication/lots (× ou *)
 */

export interface Token {
  type: 'NUMBER' | 'OP';
  value: string;
}

/**
 * Tokenize une expression de caisse
 */
export const tokenizeExpression = (expression: string): Token[] => {
  if (!expression) return [];

  // Normalise les symboles (remplace ×, x, X par *)
  const normalized = expression
    .replace(/[×xX]/g, '*')
    .replace(/\s+/g, '');

  const tokens: Token[] = [];
  let currentNum = '';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (/\d/.test(char)) {
      currentNum += char;
    } else if (['+', '-', '*', '/'].includes(char)) {
      if (currentNum !== '') {
        tokens.push({ type: 'NUMBER', value: currentNum });
        currentNum = '';
      }
      tokens.push({ type: 'OP', value: char });
    }
  }

  if (currentNum !== '') {
    tokens.push({ type: 'NUMBER', value: currentNum });
  }

  return tokens;
};

/**
 * Évalue une expression mathématique de manière sécurisée avec respect des priorités (* et / avant + et -)
 * Retourne un entier positif ou nul (0 par défaut)
 */
export const evaluatePosExpression = (expression: string): number => {
  if (!expression || expression.trim() === '' || expression.trim() === '0') {
    return 0;
  }

  const tokens = tokenizeExpression(expression);
  if (tokens.length === 0) return 0;

  // Si l'expression se termine par un opérateur incomplet (ex: "5000 + "), on ignore l'opérateur final
  let validTokens = [...tokens];
  while (validTokens.length > 0 && validTokens[validTokens.length - 1].type === 'OP') {
    validTokens.pop();
  }

  if (validTokens.length === 0) return 0;

  try {
    // Étape 1 : Traitement des multiplications et divisions (prioritaires)
    const afterMulDiv: (number | string)[] = [];
    let i = 0;

    while (i < validTokens.length) {
      const token = validTokens[i];

      if (token.type === 'NUMBER') {
        let val = parseFloat(token.value);

        // Vérifier si suivi d'un * ou /
        while (i + 2 < validTokens.length && (validTokens[i + 1].value === '*' || validTokens[i + 1].value === '/')) {
          const op = validTokens[i + 1].value;
          const nextVal = parseFloat(validTokens[i + 2].value);

          if (op === '*') {
            val = val * nextVal;
          } else if (op === '/') {
            val = nextVal !== 0 ? Math.floor(val / nextVal) : 0;
          }

          i += 2;
        }

        afterMulDiv.push(val);
      } else {
        afterMulDiv.push(token.value);
      }
      i++;
    }

    // Étape 2 : Traitement des additions et soustractions de gauche à droite
    let result = typeof afterMulDiv[0] === 'number' ? afterMulDiv[0] : 0;
    let currOp: '+' | '-' = '+';

    for (let j = 1; j < afterMulDiv.length; j++) {
      const item = afterMulDiv[j];

      if (item === '+' || item === '-') {
        currOp = item;
      } else if (typeof item === 'number') {
        if (currOp === '+') {
          result += item;
        } else if (currOp === '-') {
          result -= item;
        }
      }
    }

    // Un montant de caisse ne peut pas être négatif
    return Math.max(0, Math.round(result));
  } catch (err) {
    console.error('Erreur évaluation calcul caisse:', err);
    return 0;
  }
};

/**
 * Formate l'expression pour un affichage propre et lisible sur le TPV
 * Ex: "1000+2*500-200" -> "1 000 + 2 × 500 - 200"
 */
export const formatPosExpressionDisplay = (expression: string): string => {
  if (!expression || expression === '0') return '0';

  return expression
    .replace(/\s+/g, ' ')
    .replace(/\*/g, ' × ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
