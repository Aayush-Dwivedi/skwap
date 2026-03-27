import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  
  // Persistent State Initializers
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('skwap_chat_open') === 'true';
  });
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Restore Active Session from localStorage on mount (once sessions are loaded)
  useEffect(() => {
    if (sessions.length > 0 && !activeSession) {
      const savedSessionId = localStorage.getItem('skwap_active_session_id');
      if (savedSessionId) {
        const session = sessions.find(s => s._id === savedSessionId);
        if (session) setActiveSession(session);
      }
    }
  }, [sessions]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('skwap_chat_open', isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (activeSession?._id) {
      localStorage.setItem('skwap_active_session_id', activeSession._id);
    }
  }, [activeSession]);

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

  // Navigation listener REMOVED as per user request to keep chat open across pages

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('session created', (newSession) => {
      setSessions(prev => [newSession, ...prev]);
    });

    socket.on('session updated', (updatedSession) => {
      setSessions(prev => prev.map(s => s._id === updatedSession._id ? { ...s, ...updatedSession } : s));
      setActiveSession(prev => (prev?._id === updatedSession._id ? { ...prev, ...updatedSession } : prev));
    });

    socket.on('message received', (newMessage) => {
      const msgSessionId = typeof newMessage.session === 'string' ? newMessage.session : newMessage.session?._id;
      
      // Update sessions list - move updated session to top
      setSessions(prev => {
        const index = prev.findIndex(s => s._id === msgSessionId);
        if (index === -1) {
          // If message is for a session we don't have yet, we can't do much without fetching
          return prev;
        }
        const updated = [...prev];
        const session = { ...updated.splice(index, 1)[0] };
        return [session, ...updated];
      });

      // Handle unread counts
      // We need a ref or another way to check isOpen/activeSession without re-running effect
      // But for now, let's keep it simple.
    });

    return () => {
      socket.off('session created');
      socket.off('session updated');
      socket.off('message received');
    };
  }, [socket, user]); // Minimal dependencies

  // Seperate effect for unread counts which depends on activeSession/isOpen
  useEffect(() => {
    if (!socket || !user) return;

    const handleMessageUnread = (newMessage) => {
      const msgSessionId = typeof newMessage.session === 'string' ? newMessage.session : newMessage.session?._id;
      if (!isOpen || activeSession?._id !== msgSessionId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgSessionId]: (prev[msgSessionId] || 0) + 1
        }));
      }
    };

    socket.on('message received', handleMessageUnread);
    return () => socket.off('message received', handleMessageUnread);
  }, [socket, user, isOpen, activeSession]);

  // Clear unread counts for active session when opened
  useEffect(() => {
    if (isOpen && activeSession) {
      setUnreadCounts(prev => {
        if (prev[activeSession._id] === 0) return prev;
        return { ...prev, [activeSession._id]: 0 };
      });
      
      // Clear general notifications for this session
      api.put(`/notifications/session/${activeSession._id}/read`).catch(err => {
        console.error('Failed to clear session notifications', err);
      });
    }
  }, [isOpen, activeSession]);

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
