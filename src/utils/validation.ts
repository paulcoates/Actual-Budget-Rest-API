import Joi from 'joi';
import { TransactionRequest } from '../types';

export const transactionSchema = Joi.object({
  account_id: Joi.string().required().messages({
    'string.empty': 'Account ID is required',
    'any.required': 'Account ID is required',
  }),
  transaction_date: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Transaction date must be a valid ISO date',
    'any.required': 'Transaction date is required',
  }),
  amount: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^-?\d+(\.\d+)?$/)
  ).required().messages({
    'alternatives.match': 'Amount must be a valid number',
    'any.required': 'Amount is required',
  }),
  payee: Joi.string().required().min(1).messages({
    'string.empty': 'Payee is required',
    'string.min': 'Payee cannot be empty',
    'any.required': 'Payee is required',
  }),
  notes: Joi.string().allow('').optional(),
  imported_id: Joi.string().optional(),
});

export const validateTransaction = (data: unknown): { 
  error?: string; 
  value?: TransactionRequest 
} => {
  const { error, value } = transactionSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage };
  }

  return { value };
};

export const validateAmount = (amount: string | number): number => {
  if (typeof amount === 'number') {
    if (isNaN(amount)) {
      throw new Error('Invalid amount format');
    }
    return amount;
  }
  
  // For strings, use a more strict validation
  const trimmed = amount.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Invalid amount format');
  }
  
  const numAmount = parseFloat(trimmed);
  if (isNaN(numAmount)) {
    throw new Error('Invalid amount format');
  }
  
  return numAmount;
};

export const validateEmpty = (fieldName: string, field: unknown): string => {
  if (field == null || field === '') {
    throw new Error(`Invalid ${fieldName} value: ${field}`);
  }
  return String(field).trim();
};
