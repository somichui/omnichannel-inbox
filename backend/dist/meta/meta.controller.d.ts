import type { Response } from 'express';
import { MetaService } from './meta.service';
export declare class MetaController {
    private metaService;
    constructor(metaService: MetaService);
    verifyWebhook(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    handleWebhook(body: any, res: Response): Promise<void>;
    simulateWhatsApp(body: {
        from: string;
        name: string;
        text: string;
    }, res: Response): Promise<void>;
    simulateInstagram(body: {
        from: string;
        name: string;
        text: string;
    }, res: Response): Promise<void>;
}
