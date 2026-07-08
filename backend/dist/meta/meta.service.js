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
var MetaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const events_gateway_1 = require("../events/events.gateway");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let MetaService = MetaService_1 = class MetaService {
    prisma;
    eventsGateway;
    analyzeMessageQueue;
    extractMergeSignalsQueue;
    logger = new common_1.Logger(MetaService_1.name);
    constructor(prisma, eventsGateway, analyzeMessageQueue, extractMergeSignalsQueue) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
        this.analyzeMessageQueue = analyzeMessageQueue;
        this.extractMergeSignalsQueue = extractMergeSignalsQueue;
    }
    async processIncomingMessage(externalId, displayName, text, rawPayload, channel) {
        this.logger.log(`Processing new ${channel} message from ${displayName} (${externalId}): ${text}`);
        let identity = await this.prisma.channelIdentity.findUnique({
            where: {
                channel_externalId: {
                    channel,
                    externalId,
                }
            },
            include: { person: true }
        });
        if (!identity) {
            const person = await this.prisma.person.create({
                data: {
                    name: displayName,
                }
            });
            identity = await this.prisma.channelIdentity.create({
                data: {
                    channel,
                    externalId,
                    displayName,
                    personId: person.id,
                },
                include: { person: true }
            });
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: { personId: identity.personId, channel, status: 'OPEN' }
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    personId: identity.personId,
                    channel,
                }
            });
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: client_1.Direction.INBOUND,
                channel,
                rawPayload: rawPayload ? rawPayload : client_1.Prisma.JsonNull,
                text,
            }
        });
        this.eventsGateway.server.emit('message:new', {
            id: message.id,
            conversationId: message.conversationId,
            text: message.text,
            direction: message.direction,
            channel: message.channel,
            person: { name: identity.person.name || displayName }
        });
        await this.analyzeMessageQueue.add('analyze', {
            messageId: message.id,
            text: message.text,
        }, { attempts: 1 });
        await this.extractMergeSignalsQueue.add('extract', {
            messageId: message.id,
            text: message.text,
            personId: identity.personId,
        }, { attempts: 1, delay: 35000 });
    }
    async sendInstagramMessage(recipientId, text) {
        const token = process.env.META_ACCESS_TOKEN;
        if (!token) {
            this.logger.error('No META_ACCESS_TOKEN configured');
            return false;
        }
        try {
            const url = `https://graph.facebook.com/v19.0/me/messages`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    message: { text }
                })
            });
            const data = await response.json();
            if (!response.ok) {
                this.logger.error(`Failed to send Instagram message: ${JSON.stringify(data)}`);
                return false;
            }
            else {
                this.logger.log(`Successfully sent Instagram message to ${recipientId}`);
                return true;
            }
        }
        catch (e) {
            this.logger.error(`Error sending Instagram message: ${e.message}`);
            return false;
        }
    }
};
exports.MetaService = MetaService;
exports.MetaService = MetaService = MetaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('analyze-message-v2')),
    __param(3, (0, bullmq_1.InjectQueue)('extract-merge-signals-v2')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway,
        bullmq_2.Queue,
        bullmq_2.Queue])
], MetaService);
//# sourceMappingURL=meta.service.js.map