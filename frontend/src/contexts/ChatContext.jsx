import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!user) return;
    
    const fetchSessions = async () => {
      try {
        const { data } = await api.get('/sessions');
        setSessions(data);
      } catch (err) {
        console.error('Failed to fetch sessions for chat context', err);
      }
    };

    fetchSessions();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('session created', (newSession) => {
      setSessions(prev => [newSession, ...prev]);
      // Optionally notify user or briefly pulse the chat icon
    });

    socket.on('session updated', (updatedSession) => {
      setSessions(prev => prev.map(s => s._id === updatedSession._id ? { ...s, ...updatedSession } : s));
    });

    socket.on('message received', (newMessage) => {
      const msgSessionId = typeof newMessage.session === 'string' ? newMessage.session : newMessage.session?._id;
      
      // If the chat is closed or it's not the active session, increment unread
      if (!isOpen || activeSession?._id !== msgSessionId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgSessionId]: (prev[msgSessionId] || 0) + 1
        }));
      }
      
      // Update session list if needed (e.g. bring to top)
      setSessions(prev => {
        const index = prev.findIndex(s => s._id === msgSessionId);
        if (index === -1) return prev;
        const updated = [...prev];
        const session = updated.splice(index, 1)[0];
        return [session, ...updated];
      });
    });

    return () => {
      socket.off('session created');
      socket.off('session updated');
      socket.off('message received');
    };
  }, [socket, user, isOpen, activeSession, sessions]);

  const toggleChat = () => setIsOpen(!isOpen);
  
  const openSession = async (sessionOrId) => {
    let session = sessionOrId;
    if (typeof sessionOrId === 'string') {
      session = sessions.find(s => s._id === sessionOrId);
      
      // If not found in list, try fetching it
      if (!session) {
        try {
          const { data } = await api.get('/sessions');
          setSessions(data);
          session = data.find(s => s._id === sessionOrId);
        } catch (err) {
          console.error('Failed to resolve session ID', err);
        }
      }
    }
    
    if (session) {
      setActiveSession(session);
      setIsOpen(true);
      setUnreadCounts(prev => ({ ...prev, [session._id]: 0 }));
    }
  };

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      activeSession,
      setActiveSession,
      sessions,
      setSessions,
      unreadCounts,
      toggleChat,
      openSession
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
