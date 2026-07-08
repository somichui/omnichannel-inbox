export interface Identity {
  id: string;
  personId: string;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER';
  channelId: string;
  channelName: string;
}

export interface Person {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  identities?: Identity[];
}

export interface Conversation {
  id: string;
  personId: string;
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER';
  createdAt: string;
  updatedAt: string;
  person?: Person;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  direction: 'INCOMING' | 'OUTGOING';
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER';
  sentiment: string;
  intent: string;
  urgencyScore: number;
  suggestedReply: string;
  createdAt: string;
  person?: Person;
}

export interface MergeSuggestion {
  id: string;
  personAId: string;
  personBId: string;
  reason: string;
  confidence: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  personA?: Person;
  personB?: Person;
}
