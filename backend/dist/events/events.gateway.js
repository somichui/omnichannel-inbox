"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const common_1 = require("@nestjs/common");
let EventsGateway = class EventsGateway {
    prisma;
    server;
    logger = new common_1.Logger('EventsGateway');
    constructor(prisma) {
        this.prisma = prisma;
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway Initialized');
    }
    async handleSendMessage(data) {
        this.logger.log(`Received outbound message for conversation: ${data.conversationId}`);
        const message = await this.prisma.message.create({
            data: {
                conversationId: data.conversationId,
                text: data.text,
                direction: client_1.Direction.OUTBOUND,
                channel: client_1.Channel.TELEGRAM,
                rawPayload: {}
            }
        });
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: data.conversationId },
            include: {
                person: {
                    include: {
                        identities: true
                    }
                }
            }
        });
        if (!conversation)
            return;
        const identity = conversation.person.identities.find((id) => id.channel === client_1.Channel.TELEGRAM);
        if (identity) {
            const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
            try {
                await axios_1.default.post(url, {
                    chat_id: identity.externalId,
                    text: data.text,
                });
                this.logger.log(`Successfully sent to Telegram API for chat_id: ${identity.externalId}`);
            }
            catch (e) {
                this.logger.error('Failed to send to Telegram:', e.message);
            }
        }
        this.server.emit('message:new', {
            id: message.id,
            conversationId: message.conversationId,
            text: message.text,
            direction: message.direction,
            channel: message.channel,
            person: conversation.person
        });
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:send'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleSendMessage", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' } }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map