import React, { useRef, useEffect, useState } from 'react';
import { useInboxStore } from '../store/inboxStore';
import { Send, Image, Smile, Sparkles } from 'lucide-react';

export default function ChatWindow() {
  const { messages, activePersonId, fetchInbox, drafts, setDraft } = useInboxStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const inputText = activePersonId ? (drafts[activePersonId] || '') : '';
  const setInputText = (text: string) => {
    if (activePersonId) setDraft(activePersonId, text);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activePersonId) return;
    
    // Get the conversationId from the active person
    const activeMessages = messages.filter(m => (m.person?.id || m.conversationId) === activePersonId);
    const latestMessage = activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null;
    const conversationId = latestMessage?.conversationId;

    if (!conversationId) return;

    try {
      setIsSending(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: inputText })
      });
      if (res.ok) {
        setInputText('');
        fetchInbox(); // Refresh messages
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const activeMessages = messages.filter(m => (m.person?.id || m.conversationId) === activePersonId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const activePerson = activeMessages.length > 0 ? activeMessages[0].person : null;
  const latestMessage = activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null;
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  if (!activePersonId) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-transparent">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(56,189,248,0.1)]">
          <Sparkles size={32} className="text-sky-400 opacity-50" />
        </div>
        <h2 className="text-xl text-white font-medium mb-2">Omnichannel Inbox</h2>
        <p className="text-slate-400">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative z-0">
      {/* Header */}
      <div className="h-[88px] w-full border-b border-white/5 flex items-center px-8 shrink-0 bg-black/20 backdrop-blur-md">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden mr-4 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activePerson?.id || activePersonId}`} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{activePerson?.name || 'Unknown User'}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <span className="text-xs text-slate-400">Online via {activeMessages[0]?.channel.toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {activeMessages.map((msg, idx) => {
          const isOutgoing = msg.direction === 'OUTBOUND';
          const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Show date separator logic could go here
          
          return (
            <div key={msg.id} className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={`msg-bubble ${isOutgoing ? 'msg-outgoing' : 'msg-incoming'}`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 px-1">{time}</span>
            </div>
          );
        })}

        {/* AI Suggested Reply Bubble */}
        {latestMessage?.suggestedReply && latestMessage.direction === 'INBOUND' && (Date.now() - new Date(latestMessage.createdAt).getTime() < 300000) && (
          <div className="flex flex-col items-start animate-fade-in">
            <div 
              onClick={() => setInputText(latestMessage.suggestedReply)}
              className="inline-flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/20 rounded-2xl rounded-bl-sm p-4 max-w-[75%] backdrop-blur-md cursor-pointer transition-all shadow-[0_4px_16px_rgba(99,102,241,0.15)] group"
            >
              <Sparkles size={18} className="text-indigo-400 shrink-0 mt-0.5 group-hover:animate-pulse" />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mr-1">AI Suggestion</p>
                  {latestMessage.intent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {latestMessage.intent.replace(/_/g, ' ')}
                    </span>
                  )}
                  {latestMessage.sentiment && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      latestMessage.sentiment === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      latestMessage.sentiment === 'NEGATIVE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    }`}>
                      {latestMessage.sentiment}
                    </span>
                  )}
                </div>
                <p className="text-[15px] leading-relaxed text-slate-200">{latestMessage.suggestedReply}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2 shrink-0 bg-gradient-to-t from-[#09090b] to-transparent">
        <div className="glass-panel p-2 flex items-end gap-2 bg-black/40 border-white/10 focus-within:border-sky-400/50 focus-within:shadow-glow transition-all">
          <button className="p-3 text-slate-400 hover:text-white transition-colors shrink-0">
            <Image size={20} />
          </button>
          
          <textarea 
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent border-none text-white text-sm resize-none max-h-32 min-h-[44px] py-3 focus:outline-none placeholder-slate-500"
            rows={1}
            disabled={isSending}
          />
          
          <button className="p-3 text-slate-400 hover:text-white transition-colors shrink-0">
            <Smile size={20} />
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending || !inputText.trim()}
            className="btn-primary w-11 h-11 p-0 flex items-center justify-center shrink-0 rounded-lg ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
