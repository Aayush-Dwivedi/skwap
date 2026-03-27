import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Robust URL detection: Prefer VITE_SOCKET_URL, fallback to VITE_API_BASE_URL (removing /api), finally localhost
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    const inferredSocketUrl = apiUrl ? apiUrl.replace('/api', '') : 'http://localhost:5000';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || inferredSocketUrl;
    
    console.log('Socket: Connecting to', socketUrl);
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'], // Try websocket first, then polling
    });

    newSocket.on('connect', () => {
      console.log('Socket: Connected to server');
      setIsConnected(true);
      // Join the user's private room for direct notifications
      newSocket.emit('setup', user);
    });

    newSocket.on('connected', () => {
      console.log('Socket: User setup complete');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket: Disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
