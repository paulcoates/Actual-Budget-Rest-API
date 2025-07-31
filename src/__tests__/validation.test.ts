import { validateTransaction, validateAmount, validateEmpty } from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateTransaction', () => {
    it('should validate a correct transaction', () => {
      const validTransaction = {
        account_id: 'account-123',
        transaction_date: '2024-01-01T00:00:00.000Z',
        amount: 100,
        payee: 'Test Payee',
        notes: 'Test notes',
        imported_id: 'import-123',
      };

      const result = validateTransaction(validTransaction);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validTransaction);
    });

    it('should reject transaction with missing required fields', () => {
      const invalidTransaction = {
        amount: 100,
        payee: 'Test Payee',
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Account ID is required');
      expect(result.error).toContain('Transaction date is required');
    });

    it('should reject transaction with invalid date format', () => {
      const invalidTransaction = {
        account_id: 'account-123',
        transaction_date: 'invalid-date',
        amount: 100,
        payee: 'Test Payee',
      };

      const result = validateTransaction(invalidTransaction);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('must be a valid ISO date');
    });

    it('should accept string amount and convert to number', () => {
      const transactionWithStringAmount = {
        account_id: 'account-123',
        transaction_date: '2024-01-01T00:00:00.000Z',
        amount: '100.50',
        payee: 'Test Payee',
      };

      const result = validateTransaction(transactionWithStringAmount);
      expect(result.error).toBeUndefined();
      // Joi alternatives will pick the first matching type (number in this case)
      expect(result.value?.amount).toBe(100.5);
    });
  });

  describe('validateAmount', () => {
    it('should convert string to number', () => {
      expect(validateAmount('100.50')).toBe(100.50);
      expect(validateAmount('-50')).toBe(-50);
    });

    it('should return number as is', () => {
      expect(validateAmount(100)).toBe(100);
      expect(validateAmount(-50.25)).toBe(-50.25);
    });

    it('should throw error for invalid string', () => {
      expect(() => validateAmount('invalid')).toThrow('Invalid amount format');
      expect(() => validateAmount('100.50.25')).toThrow('Invalid amount format');
      expect(() => validateAmount('not-a-number')).toThrow('Invalid amount format');
    });
  });

  describe('validateEmpty', () => {
    it('should return trimmed string for valid input', () => {
      expect(validateEmpty('test', '  value  ')).toBe('value');
      expect(validateEmpty('test', 'value')).toBe('value');
    });

    it('should throw error for empty values', () => {
      expect(() => validateEmpty('test', '')).toThrow('Invalid test value');
      expect(() => validateEmpty('test', null)).toThrow('Invalid test value');
      expect(() => validateEmpty('test', undefined)).toThrow('Invalid test value');
    });

    it('should convert non-string values to string', () => {
      expect(validateEmpty('test', 123)).toBe('123');
      expect(validateEmpty('test', true)).toBe('true');
    });
  });
});
