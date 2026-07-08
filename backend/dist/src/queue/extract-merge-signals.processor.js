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
var ExtractMergeSignalsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractMergeSignalsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("../events/events.gateway");
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
let ExtractMergeSignalsProcessor = ExtractMergeSignalsProcessor_1 = class ExtractMergeSignalsProcessor extends bullmq_1.WorkerHost {
    prisma;
    eventsGateway;
    logger = new common_1.Logger(ExtractMergeSignalsProcessor_1.name);
    constructor(prisma, eventsGateway) {
        super();
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async process(job) {
        const { messageId, text, personId } = job.data;
        this.logger.log(`Extracting merge signals from message ${messageId} via Claude...`);
        let extracted = { email: null, phone: null, orderNumber: null };
        try {
            const result = await (0, ai_1.generateText)({
                model: (0, google_1.google)('gemini-flash-latest'),
                prompt: `Extract any email, phone number, or order number from this message. Message: "${text}"
Respond ONLY with a valid JSON object matching exactly this schema:
{
  "email": string | null,
  "phone": string | null,
  "orderNumber": string | null
}`
            });
            extracted = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());
        }
        catch (error) {
            this.logger.error(`Gemini Error: ${error.message || error}`);
            const orderMatch = text.match(/#(\d+)/);
            if (orderMatch) {
                extracted.orderNumber = orderMatch[1];
            }
        }
        this.logger.log(`Extracted signals: ${JSON.stringify(extracted)}`);
        const signals = extracted;
        if (signals.email || signals.phone || signals.orderNumber) {
            const person = await this.prisma.person.findUnique({ where: { id: personId } });
            if (person) {
                const existingAttributes = person.attributes || {};
                const orderNumbers = new Set(existingAttributes.orderNumbers || []);
                if (signals.orderNumber)
                    orderNumbers.add(signals.orderNumber);
                await this.prisma.person.update({
                    where: { id: personId },
                    data: {
                        email: signals.email || person.email,
                        phone: signals.phone || person.phone,
                        attributes: {
                            ...existingAttributes,
                            orderNumbers: Array.from(orderNumbers)
                        }
                    }
                });
                const OR_CONDITIONS = [];
                if (signals.email)
                    OR_CONDITIONS.push({ email: signals.email });
                if (signals.phone)
                    OR_CONDITIONS.push({ phone: signals.phone });
                if (signals.orderNumber) {
                    OR_CONDITIONS.push({
                        attributes: {
                            path: ['orderNumbers'],
                            array_contains: signals.orderNumber
                        }
                    });
                }
                if (OR_CONDITIONS.length > 0) {
                    const matches = await this.prisma.person.findMany({
                        where: {
                            OR: OR_CONDITIONS,
                            id: { not: personId }
                        }
                    });
                    for (const match of matches) {
                        const existingSuggestion = await this.prisma.mergeSuggestion.findFirst({
                            where: {
                                OR: [
                                    { personAId: personId, personBId: match.id },
                                    { personAId: match.id, personBId: personId }
                                ],
                                status: 'PENDING'
                            }
                        });
                        if (!existingSuggestion) {
                            const suggestion = await this.prisma.mergeSuggestion.create({
                                data: {
                                    personAId: match.id,
                                    personBId: personId,
                                    reason: `Shared contact details detected via AI text extraction`,
                                    confidence: 0.5,
                                }
                            });
                            this.eventsGateway.server.emit('merge:suggestion', {
                                id: suggestion.id,
                                personAId: match.id,
                                personBId: personId,
                                reason: suggestion.reason,
                                confidence: suggestion.confidence,
                                personA: match,
                                personB: person
                            });
                        }
                    }
                }
            }
        }
    }
};
exports.ExtractMergeSignalsProcessor = ExtractMergeSignalsProcessor;
exports.ExtractMergeSignalsProcessor = ExtractMergeSignalsProcessor = ExtractMergeSignalsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('extract-merge-signals-v2'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], ExtractMergeSignalsProcessor);
//# sourceMappingURL=extract-merge-signals.processor.js.map