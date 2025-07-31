export declare class ActualBudgetService {
    private static instance;
    private isInitialized;
    private constructor();
    static getInstance(): ActualBudgetService;
    initialize(): Promise<void>;
    addTransaction(accountId: string, transactionDate: string, amount: number | string, payee: string, notes?: string, importedId?: string): Promise<boolean>;
    getAccounts(): Promise<any[]>;
    shutdown(): Promise<void>;
    isApiInitialized(): boolean;
}
//# sourceMappingURL=actualBudgetService.d.ts.map