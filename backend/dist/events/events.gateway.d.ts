import { OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
export declare class EventsGateway implements OnGatewayInit {
    private prisma;
    server: Server;
    private logger;
    constructor(prisma: PrismaService);
    afterInit(server: Server): void;
    handleSendMessage(data: {
        conversationId: string;
        text: string;
    }): Promise<void>;
}
