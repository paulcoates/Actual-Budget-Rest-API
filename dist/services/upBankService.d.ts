import { UpBankWebhook, TransactionRequest } from '../types';
export declare class UpBankService {
    private static instance;
    private constructor();
    static getInstance(): UpBankService;
    processWebhook(webhook: UpBankWebhook): Promise<TransactionRequest | null>;
    private getTransaction;
    private convertUpBankToActualTransaction;
    validateWebhookSignature(_payload: string, _signature: string): boolean;
}
//# sourceMappingURL=upBankService.d.ts.map