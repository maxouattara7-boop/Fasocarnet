import { describe, it, expect } from 'vitest';
import { numberToWordsFrench, getLegalArreteMention } from './numberToWords';

describe('numberToWordsFrench', () => {
  it('should correctly convert units and basic tens with capital first letter', () => {
    expect(numberToWordsFrench(0)).toBe('Zéro');
    expect(numberToWordsFrench(1)).toBe('Un');
    expect(numberToWordsFrench(5)).toBe('Cinq');
    expect(numberToWordsFrench(10)).toBe('Dix');
    expect(numberToWordsFrench(16)).toBe('Seize');
    expect(numberToWordsFrench(21)).toBe('Vingt et un');
    expect(numberToWordsFrench(25)).toBe('Vingt-cinq');
    expect(numberToWordsFrench(71)).toBe('Soixante et onze');
    expect(numberToWordsFrench(75)).toBe('Soixante-quinze');
    expect(numberToWordsFrench(80)).toBe('Quatre-vingts');
    expect(numberToWordsFrench(81)).toBe('Quatre-vingt-un');
    expect(numberToWordsFrench(99)).toBe('Quatre-vingt-dix-neuf');
  });

  it('should correctly convert hundreds, thousands and millions', () => {
    expect(numberToWordsFrench(100)).toBe('Cent');
    expect(numberToWordsFrench(200)).toBe('Deux cents');
    expect(numberToWordsFrench(205)).toBe('Deux cent cinq');
    expect(numberToWordsFrench(1000)).toBe('Mille');
    expect(numberToWordsFrench(2000)).toBe('Deux mille');
    expect(numberToWordsFrench(25000)).toBe('Vingt-cinq mille');
    expect(numberToWordsFrench(1250000)).toBe('Un million deux cent cinquante mille');
  });
});

describe('getLegalArreteMention', () => {
  it('generates the exact legal arrete wording for INVOICE', () => {
    const mention = getLegalArreteMention('INVOICE', 25000);
    expect(mention.fullMention).toContain('Arrêtée la présente facture à la somme de : Vingt-cinq mille');
    expect(mention.fullMention).toContain('Francs CFA TTC.');
  });

  it('generates the exact legal arrete wording for QUOTE (Devis)', () => {
    const mention = getLegalArreteMention('QUOTE', 150000);
    expect(mention.fullMention).toContain('Arrêté le présent devis à la somme de : Cent cinquante mille');
    expect(mention.fullMention).toContain('Francs CFA TTC.');
  });

  it('generates the exact legal arrete wording for PROFORMA', () => {
    const mention = getLegalArreteMention('PROFORMA', 2000);
    expect(mention.fullMention).toContain('Arrêtée la présente facture proforma à la somme de : Deux mille');
    expect(mention.fullMention).toContain('Francs CFA TTC.');
  });
});
