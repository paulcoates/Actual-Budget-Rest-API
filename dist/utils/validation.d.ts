import Joi from 'joi';
import { TransactionRequest } from '../types';
export declare const transactionSchema: Joi.ObjectSchema<any>;
export declare const validateTransaction: (data: unknown) => {
    error?: string;
    value?: TransactionRequest;
};
export declare const validateAmount: (amount: string | number) => number;
export declare const validateEmpty: (fieldName: string, field: unknown) => string;
//# sourceMappingURL=validation.d.ts.map