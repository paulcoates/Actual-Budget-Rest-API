import express from 'express';
declare class App {
    private app;
    private actualService;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    start(): Promise<void>;
    getApp(): express.Application;
}
export default App;
//# sourceMappingURL=index.d.ts.map