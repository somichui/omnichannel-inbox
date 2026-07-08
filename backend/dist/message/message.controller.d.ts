import { MessageService } from './message.service';
export declare class MessageController {
    private messageService;
    constructor(messageService: MessageService);
    deleteMessage(id: string, type: 'FOR_ME' | 'FOR_EVERYONE'): Promise<{
        success: boolean;
        messageId: string;
        deletedForMe: boolean;
        deletedForEveryone?: undefined;
    } | {
        success: boolean;
        messageId: string;
        deletedForEveryone: boolean;
        deletedForMe?: undefined;
    } | undefined>;
}
