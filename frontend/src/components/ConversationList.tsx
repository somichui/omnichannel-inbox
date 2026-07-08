import React from 'react';
import { useInboxStore } from '../store/inboxStore';
import { Search, MessageCircle } from 'lucide-react';
import { Message } from '../types';

export default function ConversationList() {
  const { messages, activePersonId, setActivePerson, isLoading } = useInboxStore();

  // Group messages by person ID (Omnichannel approach)
  const grouped = messages.reduce((acc, msg) => {
    const personId = msg.person?.id || msg.conversationId; // fallback
    if (!acc[personId]) {
      acc[personId] = [];
    }
    acc[personId].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  // Get the latest message for each person to display
  const conversationSummaries = Object.values(grouped).map(convoMessages => {
    // Sort to ensure the last one is the latest
    const sorted = [...convoMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const latest = sorted[sorted.length - 1];
    return {
      personId: latest.person?.id || latest.conversationId,
      latestMessage: latest,
      person: latest.person,
      channel: latest.channel,
      unreadCount: sorted.filter(m => m.direction === 'INBOUND').length // Mock unread
    };
  }).sort((a, b) => new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime());

  if (isLoading) {
    return (
      <div className="w-[340px] h-full border-r border-white/5 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-[340px] h-full glass-panel border-y-0 border-l-0 rounded-none flex flex-col z-10 bg-black/20">
      <div className="p-6 pb-6">
        <h2 className="text-xl font-semibold text-white">Inbox</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {conversationSummaries.map((convo) => {
          const isActive = activePersonId === convo.personId;
          const time = new Date(convo.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div 
              key={convo.personId}
              onClick={() => setActivePerson(convo.personId)}
              className={`p-3 rounded-xl cursor-pointer hover-lift flex items-start gap-3 transition-all ${isActive ? 'bg-white/10 border border-white/10' : 'border border-transparent'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.person?.id || convo.personId}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#18181b] flex items-center justify-center">
                  {convo.channel === 'INSTAGRAM' ? 
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> : 
                    <MessageCircle size={12} className="text-green-500" />
                  }
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-sm truncate text-white">{convo.person?.name || 'Unknown User'}</h3>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{time}</span>
                </div>
                <p className="text-xs text-slate-400 truncate w-[180px]">
                  {convo.latestMessage.direction === 'OUTBOUND' ? 'You: ' : ''}{convo.latestMessage.text}
                </p>
                
                {convo.latestMessage.urgencyScore > 0.7 && (
                  <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    Urgent
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {conversationSummaries.length === 0 && (
          <div className="text-center p-6 text-slate-500 text-sm mt-10">
            No active conversations
          </div>
        )}
      </div>
    </div>
  );
}
