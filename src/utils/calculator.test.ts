import { describe, it, expect } from 'vitest';
import { evaluatePosExpression, tokenizeExpression, formatPosExpressionDisplay } from './calculator';

describe('calculator', () => {
  describe('tokenizeExpression', () => {
    it('tokenizes addition and multiplication', () => {
      const tokens = tokenizeExpression('1000 + 2 × 500');
      expect(tokens).toEqual([
        { type: 'NUMBER', value: '1000' },
        { type: 'OP', value: '+' },
        { type: 'NUMBER', value: '2' },
        { type: 'OP', value: '*' },
        { type: 'NUMBER', value: '500' }
      ]);
    });

    it('tokenizes subtraction', () => {
      const tokens = tokenizeExpression('5000 - 500');
      expect(tokens).toEqual([
        { type: 'NUMBER', value: '5000' },
        { type: 'OP', value: '-' },
        { type: 'NUMBER', value: '500' }
      ]);
    });
  });

  describe('evaluatePosExpression', () => {
    it('returns 0 for empty or zero expression', () => {
      expect(evaluatePosExpression('')).toBe(0);
      expect(evaluatePosExpression('0')).toBe(0);
    });

    it('evaluates simple single number', () => {
      expect(evaluatePosExpression('2500')).toBe(2500);
    });

    it('evaluates addition', () => {
      expect(evaluatePosExpression('1000 + 2000 + 500')).toBe(3500);
    });

    it('evaluates subtraction (discounts/remises)', () => {
      expect(evaluatePosExpression('5000 - 500')).toBe(4500);
      expect(evaluatePosExpression('10000 - 1500')).toBe(8500);
    });

    it('clamps negative results to 0', () => {
      expect(evaluatePosExpression('500 - 1000')).toBe(0);
    });

    it('evaluates multiplication (quantities × price)', () => {
      expect(evaluatePosExpression('10 * 250')).toBe(2500);
      expect(evaluatePosExpression('3 × 1500')).toBe(4500);
    });

    it('respects operator precedence (* before + and -)', () => {
      // 1000 + 2 * 500 - 200 = 1000 + 1000 - 200 = 1800
      expect(evaluatePosExpression('1000 + 2 * 500 - 200')).toBe(1800);
      expect(evaluatePosExpression('5000 - 2 * 1000')).toBe(3000);
    });

    it('handles trailing operators gracefully', () => {
      expect(evaluatePosExpression('1000 + ')).toBe(1000);
      expect(evaluatePosExpression('5000 - ')).toBe(5000);
      expect(evaluatePosExpression('10 * ')).toBe(10);
    });
  });

  describe('formatPosExpressionDisplay', () => {
    it('formats operators with spaces', () => {
      expect(formatPosExpressionDisplay('1000+2*500-200')).toBe('1000 + 2 × 500 - 200');
    });
  });
});
