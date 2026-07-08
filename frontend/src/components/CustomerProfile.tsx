import React, { useEffect } from 'react';
import { useInboxStore } from '../store/inboxStore';
import { User, Tag, AlertTriangle, ShieldCheck, Link2 } from 'lucide-react';

export default function CustomerProfile() {
  const { messages, activePersonId, pendingSuggestion, fetchSuggestions } = useInboxStore();

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  if (!activePersonId) return null;

  const activeMessages = messages.filter(m => (m.person?.id || m.conversationId) === activePersonId);
  const activePerson = activeMessages.length > 0 ? activeMessages[0].person : null;
  const absoluteLatest = activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null;
  const latestMessage = absoluteLatest?.direction === 'INBOUND' ? absoluteLatest : null;

  // Check if current person is involved in a pending merge suggestion
  const activeSuggestion = pendingSuggestion && 
    (pendingSuggestion.personAId === activePerson?.id || pendingSuggestion.personBId === activePerson?.id) 
    ? pendingSuggestion : null;

  const handleMerge = async () => {
    if (!activeSuggestion || !activePerson) return;
    const sourceId = activeSuggestion.personAId === activePerson.id ? activeSuggestion.personBId : activeSuggestion.personAId;
    
    try {
      await fetch(`http://localhost:3001/person/${activePerson.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourcePersonId: sourceId,
          suggestionId: activeSuggestion.id 
        })
      });
      // Refresh UI (a real app would use sockets or re-fetch)
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-[320px] h-full glass-panel border-y-0 border-r-0 rounded-none bg-black/40 overflow-y-auto p-6 z-10 flex flex-col gap-6">
      <div className="text-center pt-4">
        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden mx-auto mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activePerson?.id || activePersonId}`} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{activePerson?.name || 'Unknown User'}</h2>
        <div className="flex items-center justify-center gap-1 text-slate-400 text-sm">
          <User size={14} />
          <span>Customer ID: {activePerson?.id.substring(0, 8)}...</span>
        </div>
      </div>

      <div className="h-[1px] w-full bg-white/5 my-2"></div>

      {/* AI Analysis Section */}
      {latestMessage && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <SparklesIcon /> AI Analysis
          </h3>
          
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Detected Intent</div>
              <div className="text-sm font-medium text-white flex items-center justify-between">
                {latestMessage.intent || 'Unknown'}
                <Tag size={14} className="text-sky-400" />
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-slate-400 mb-1">Sentiment</div>
              <div className="text-sm font-medium text-white flex items-center justify-between">
                <span className={`capitalize ${latestMessage.sentiment === 'positive' ? 'text-green-400' : latestMessage.sentiment === 'negative' ? 'text-red-400' : 'text-slate-300'}`}>
                  {latestMessage.sentiment || 'Neutral'}
                </span>
                <ShieldCheck size={14} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Suggestion Alert */}
      {activeSuggestion && (
        <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-400">Duplicate Detected</h4>
              <p className="text-xs text-orange-300/80 mt-1">{activeSuggestion.reason}</p>
            </div>
          </div>
          <button 
            onClick={handleMerge}
            className="w-full mt-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-orange-500/20 flex items-center justify-center gap-2"
          >
            <Link2 size={14} /> Merge Profiles
          </button>
        </div>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
