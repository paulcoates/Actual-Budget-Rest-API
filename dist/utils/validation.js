"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmpty = exports.validateAmount = exports.validateTransaction = exports.transactionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.transactionSchema = joi_1.default.object({
    account_id: joi_1.default.string().required().messages({
        'string.empty': 'Account ID is required',
        'any.required': 'Account ID is required',
    }),
    transaction_date: joi_1.default.string().isoDate().required().messages({
        'string.isoDate': 'Transaction date must be a valid ISO date',
        'any.required': 'Transaction date is required',
    }),
    amount: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().pattern(/^-?\d+(\.\d+)?$/)).required().messages({
        'alternatives.match': 'Amount must be a valid number',
        'any.required': 'Amount is required',
    }),
    payee: joi_1.default.string().required().min(1).messages({
        'string.empty': 'Payee is required',
        'string.min': 'Payee cannot be empty',
        'any.required': 'Payee is required',
    }),
    notes: joi_1.default.string().allow('').optional(),
    imported_id: joi_1.default.string().optional(),
});
const validateTransaction = (data) => {
    const { error, value } = exports.transactionSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return { error: errorMessage };
    }
    return { value };
};
exports.validateTransaction = validateTransaction;
const validateAmount = (amount) => {
    if (typeof amount === 'number') {
        if (isNaN(amount)) {
            throw new Error('Invalid amount format');
        }
        return amount;
    }
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
exports.validateAmount = validateAmount;
const validateEmpty = (fieldName, field) => {
    if (field == null || field === '') {
        throw new Error(`Invalid ${fieldName} value: ${field}`);
    }
    return String(field).trim();
};
exports.validateEmpty = validateEmpty;
//# sourceMappingURL=validation.js.map