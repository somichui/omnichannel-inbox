'use client';

import React, { useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import CustomerProfile from '../components/CustomerProfile';
import CustomersDirectory from '../components/CustomersDirectory';
import { useInboxStore } from '../store/inboxStore';

export default function Home() {
  const { fetchInbox, currentView } = useInboxStore();

  useEffect(() => {
    // Initial fetch
    fetchInbox();

    // In a real app, this would use Socket.io for real-time updates
    // For now, we'll poll every 5 seconds since we just connected the webhook
    const intervalId = setInterval(() => {
      if (currentView === 'inbox') {
        fetchInbox();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchInbox, currentView]);

  return (
    <main className="flex w-full h-full">
      {/* 1. Global Sidebar */}
      <Sidebar />
      
      {currentView === 'inbox' ? (
        <>
          {/* 2. Conversation List (Inbox) */}
          <ConversationList />
          
          {/* 3. Main Chat View */}
          <ChatWindow />
          
          {/* 4. CRM / Customer Profile Sidebar */}
          <CustomerProfile />
        </>
      ) : (
        <CustomersDirectory />
      )}
    </main>
  );
}
