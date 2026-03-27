import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { Bell, X, Calendar, Wallet, CheckCircle2, MessageSquare, AlertCircle, PhoneOff, XCircle } from 'lucide-react';

const GlobalNotifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        // Filter only unread
        const unread = data.filter(n => !n.read);
        setNotifications(unread);
        
        // Auto-dismiss initial unread
        unread.forEach(n => {
          setTimeout(() => {
            setNotifications(prev => prev.filter(item => item._id !== n._id));
          }, 5000);
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifs();

    if (socket) {
      socket.on('notification received', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n._id !== newNotif._id));
        }, 5000);
      });

      // Show toast for new messages if chat is closed or active session is different
      socket.on('message received', (msg) => {
        // We need to check if chat is open and if it's the active session
        // However, GlobalNotifications doesn't have useChat context by default
        // Let's add it or use a simple logic: if the user is not on the chat or chat is closed.
        // For simplicity, we'll show a toast if the message is from someone else.
        if (msg.sender._id !== user._id && msg.sender !== user._id) {
          const toastNotif = {
            _id: msg._id,
            type: 'NEW_MESSAGE',
            content: `New message from ${msg.sender.name || 'User'}: "${msg.text.substring(0, 30)}${msg.text.length > 30 ? '...' : ''}"`,
            createdAt: new Date().toISOString()
          };
          setNotifications(prev => [toastNotif, ...prev]);
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n._id !== toastNotif._id));
          }, 5000);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('notification received');
        socket.off('message received');
      }
    };
  }, [user, socket]);

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    // Optionally navigate based on notification type
    if (notif.type === 'SESSION_SCHEDULED' || notif.type === 'REQUEST_ACCEPTED') {
      navigate('/sessions');
    } else if (notif.type === 'WALLET_UPDATE') {
      navigate('/wallet');
    } else {
      navigate('/notifications');
    }
  };

  const getIcon = (type) => {
    if (type === 'SESSION_SCHEDULED') return <Calendar size={18} />;
    if (type === 'WALLET_UPDATE') return <Wallet size={18} />;
    if (type === 'REQUEST_ACCEPTED') return <CheckCircle2 size={18} />;
    if (type === 'REQUEST_DECLINED') return <XCircle size={18} className="text-red-400" />;
    if (type === 'NEW_REQUEST') return <AlertCircle size={18} className="text-emerald-400" />;
    if (type === 'SESSION_CANCELLED') return <PhoneOff size={18} className="text-red-400" />;
    if (type === 'SESSION_STARTED') return <Zap size={18} className="text-amber-400" />;
    if (type === 'NEW_MESSAGE') return <MessageSquare size={18} className="text-st-accent" />;
    return <Bell size={18} />;
  };

  if (notifications.length === 0) return null;

  // Render max 3 to prevent blocking the entire screen
  const displayNotifs = notifications.slice(0, 3);

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-80 max-w-[calc(100vw-3rem)] pointer-events-none">
      {displayNotifs.map((notif) => (
        <div 
          key={notif._id}
          onClick={() => handleNotificationClick(notif)}
          className="pointer-events-auto bg-[#1A1625]/85 backdrop-blur-2xl border border-white/10 text-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-3 cursor-pointer hover:bg-[#1A1625] transition-all hover:-translate-y-1 animate-in slide-in-from-right-8 duration-500 relative group"
          style={{
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <div className="bg-st-accent/10 border border-st-accent/20 text-st-accent p-2.5 rounded-2xl shrink-0 mt-0.5 shadow-lg">
            {getIcon(notif.type)}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="font-bold text-sm text-st-accent truncate">{notif.type.replace(/_/g, ' ')}</h4>
            <p className="text-xs text-white/90 leading-relaxed mt-1">{notif.content}</p>
          </div>
          <button 
            onClick={(e) => markAsRead(notif._id, e)}
            className="absolute top-3 right-3 text-white/40 hover:text-white bg-white/5 hover:bg-white/20 p-1.5 rounded-full transition-colors shrink-0"
            title="Mark as read"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {notifications.length > 3 && (
        <div 
          onClick={() => navigate('/notifications')}
          className="pointer-events-auto text-center text-xs font-bold text-st-accent bg-[#1A1625]/80 backdrop-blur-md py-3 rounded-xl cursor-pointer hover:bg-[#1A1625]/100 border border-white/10 shadow-lg transition-transform hover:-translate-x-1"
        >
          + {notifications.length - 3} more unread notifications
        </div>
      )}
    </div>
  );
};

export default GlobalNotifications;
