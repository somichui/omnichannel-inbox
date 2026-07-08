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
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("../events/events.gateway");
const client_1 = require("@prisma/client");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
let TelegramService = TelegramService_1 = class TelegramService {
    prisma;
    eventsGateway;
    analyzeMessageQueue;
    extractMergeSignalsQueue;
    logger = new common_1.Logger(TelegramService_1.name);
    bot;
    constructor(prisma, eventsGateway, analyzeMessageQueue, extractMergeSignalsQueue) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
        this.analyzeMessageQueue = analyzeMessageQueue;
        this.extractMergeSignalsQueue = extractMergeSignalsQueue;
        this.bot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    }
    async handleIncomingMessage(payload) {
        const message = payload.message;
        if (!message || !message.text)
            return;
        const externalId = message.from.id.toString();
        const displayName = message.from.username || message.from.first_name || 'Unknown User';
        const text = message.text;
        this.logger.log(`Processing new message from ${displayName} (${externalId}): ${text}`);
        const identity = await this.prisma.channelIdentity.upsert({
            where: {
                channel_externalId: {
                    channel: client_1.Channel.TELEGRAM,
                    externalId: externalId
                }
            },
            update: { displayName },
            create: {
                channel: client_1.Channel.TELEGRAM,
                externalId: externalId,
                displayName,
                person: {
                    create: {
                        name: displayName
                    }
                }
            },
            include: { person: true }
        });
        let conversation = await this.prisma.conversation.findFirst({
            where: { personId: identity.personId, channel: client_1.Channel.TELEGRAM, status: 'OPEN' }
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    personId: identity.personId,
                    channel: client_1.Channel.TELEGRAM,
                }
            });
        }
        const savedMessage = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: client_1.Direction.INBOUND,
                channel: client_1.Channel.TELEGRAM,
                rawPayload: payload,
                text: text
            }
        });
        this.eventsGateway.server.emit('message:new', {
            ...savedMessage,
            person: identity.person
        });
        await this.analyzeMessageQueue.add('analyze', {
            messageId: savedMessage.id,
            text: savedMessage.text,
            conversationId: savedMessage.conversationId
        }, { attempts: 1 });
        await this.extractMergeSignalsQueue.add('extract', {
            messageId: savedMessage.id,
            text: savedMessage.text,
            personId: identity.personId,
        }, { attempts: 1, delay: 35000 });
        this.logger.log('Message saved, emitted, and queued for AI analysis');
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('analyze-message-v2')),
    __param(3, (0, bullmq_1.InjectQueue)('extract-merge-signals-v2')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway,
        bullmq_2.Queue,
        bullmq_2.Queue])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map