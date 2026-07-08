import React, { useEffect } from 'react';
import { useInboxStore } from '../store/inboxStore';
import { Search, Mail, Phone, CalendarDays, MessageSquare } from 'lucide-react';
import { FaWhatsapp, FaInstagram, FaTelegram } from 'react-icons/fa';

export default function CustomersDirectory() {
  const { customers, fetchCustomers, isLoading } = useInboxStore();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const getChannelIcon = (channel: string) => {
    switch (channel.toUpperCase()) {
      case 'WHATSAPP': return <FaWhatsapp className="text-green-500" size={16} />;
      case 'INSTAGRAM': return <FaInstagram className="text-pink-500" size={16} />;
      case 'TELEGRAM': return <FaTelegram className="text-blue-500" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#09090b] relative z-0">
      {/* Header */}
      <div className="h-[88px] w-full border-b border-white/5 flex items-center justify-between px-10 shrink-0 bg-black/20 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your centralized customer records</p>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search customers..." 
            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all w-[300px]"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Channels</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversations</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No customers found.</td>
                </tr>
              ) : (
                customers.map((person) => (
                  <tr key={person.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors">{person.name || 'Unknown User'}</div>
                          <div className="text-xs text-slate-500">ID: {person.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Mail size={12} className="text-slate-500" />
                          {person.email || <span className="text-slate-600 italic">No email</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Phone size={12} className="text-slate-500" />
                          {person.phone || <span className="text-slate-600 italic">No phone</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {person.identities?.map((id: any) => (
                          <div key={id.id} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center tooltip-trigger" title={id.externalId}>
                            {getChannelIcon(id.channel)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium">
                        <MessageSquare size={12} />
                        {person._count?.conversations || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <CalendarDays size={14} className="text-slate-500" />
                        {new Date(person.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
