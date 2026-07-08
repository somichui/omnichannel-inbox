import React from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { useInboxStore } from '../store/inboxStore';

export default function Sidebar() {
  const { currentView, setCurrentView } = useInboxStore();

  return (
    <div className="w-[80px] h-full glass-panel border-l-0 border-y-0 rounded-none flex flex-col items-center py-6 shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20">
      <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center mb-10 shadow-glow">
        <span className="text-white font-bold text-xl">O</span>
      </div>
      
      <div className="flex flex-col gap-10 w-full items-center flex-1">
        <button 
          onClick={() => setCurrentView('inbox')}
          className={`p-3 rounded-xl transition-all relative ${currentView === 'inbox' ? 'bg-white/10 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <MessageSquare size={24} strokeWidth={currentView === 'inbox' ? 2.5 : 2} />
          {currentView === 'inbox' && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-sky-400 rounded-full border-2 border-[#18181b]"></span>}
        </button>
        <button 
          onClick={() => setCurrentView('customers')}
          className={`p-3 rounded-xl transition-all ${currentView === 'customers' ? 'bg-white/10 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Users size={24} strokeWidth={currentView === 'customers' ? 2.5 : 2} />
        </button>
      </div>
      
      <div className="flex flex-col gap-6 w-full items-center mt-auto">
        <div className="w-10 h-10 rounded-full bg-slate-800 mt-2 border border-white/10 overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
