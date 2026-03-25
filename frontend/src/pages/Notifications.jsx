import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Check, X, Clock, Zap, BookOpen, MessageSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useSocket } from '../contexts/SocketContext';
import { useChat } from '../contexts/ChatContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { openSession } = useChat();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('notification received', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
      });
    }

    return () => {
      if (socket) socket.off('notification received');
    };
  }, [socket]);

  const handleAction = async (notifId, requestId, status) => {
    try {
      await api.put(`/requests/${requestId}/status`, { status });
      toast.success(`Request ${status.toLowerCase()} successfully!`);
      // After action, mark notification as read
      await handleMarkRead(notifId);
      // Refresh list
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking as read', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/readall');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'NEW_REQUEST': return <Clock className="text-amber-400" size={18} />;
      case 'REQUEST_ACCEPTED': return <Check className="text-emerald-400" size={18} />;
      case 'REQUEST_DECLINED': return <X className="text-rose-400" size={18} />;
      case 'NEW_MESSAGE': return <MessageSquare className="text-st-accent" size={18} />;
      case 'CREDITS_RECEIVED': return <Zap className="text-yellow-400" size={18} />;
      default: return <Bell className="text-white/40" size={18} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Notifications</h1>
          <p className="text-st-textSecondary text-sm">Stay updated on your session requests and skill swaps.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllRead}
            className="text-xs font-bold text-st-accent hover:text-white transition-colors uppercase tracking-widest glass px-4 py-2 rounded-xl border border-white/10"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 glass animate-pulse rounded-[1.5rem]" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 glass rounded-[2.5rem] border-white/10 border-dashed">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={24} className="text-white/20" />
          </div>
          <p className="text-st-textSecondary font-medium">No notifications yet!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif._id}
              className={`group relative p-5 rounded-[1.5rem] border transition-all duration-300 ${
                notif.read ? 'glass opacity-60 border-white/5' : 'glass-card shadow-lg ring-1 ring-white/5'
              }`}
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
                  notif.read ? 'glass' : 'glass-strong shadow-inner'
                }`}>
                  {notif.type === 'NEW_REQUEST' || notif.type === 'REQUEST_ACCEPTED' ? (
                    <img 
                      src={notif.sender?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.sender?.name || 'User'}`} 
                      className="w-full h-full object-cover rounded-xl" 
                      alt="avatar" 
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.sender?.name || 'User'}`; }}
                    />
                  ) : getNotifIcon(notif.type)}
                  <div className="absolute -bottom-1 -right-1 bg-st-card rounded-full p-0.5 border border-white/10 shadow-lg">
                    {getNotifIcon(notif.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${notif.read ? 'text-white/70' : 'text-white'}`}>
                        {notif.content?.replace(/undefined/g, 'User')}
                      </p>
                      {notif.type === 'NEW_REQUEST' && !notif.read && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-tighter">Action Required</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/30 uppercase font-bold whitespace-nowrap pt-0.5">
                      {format(new Date(notif.createdAt), 'MMM d, p')}
                    </span>
                  </div>

                  {/* Actionable content for NEW_REQUEST */}
                  {notif.type === 'NEW_REQUEST' && !notif.read && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleAction(notif._id, notif.relatedId, 'ACCEPTED')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 px-6 rounded-xl border border-emerald-500/20 transition-all"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleAction(notif._id, notif.relatedId, 'DECLINED')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold py-2.5 px-6 rounded-xl border border-rose-500/20 transition-all"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}
                  
                  {/* Actionable content for REQUEST_ACCEPTED (Learner side) */}
                  {notif.type === 'REQUEST_ACCEPTED' && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => {
                          handleMarkRead(notif._id);
                          openSession(notif.relatedId);
                        }}
                        className="flex items-center gap-2 bg-st-accent hover:bg-st-accent/90 text-[#0f1715] text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <MessageSquare size={14} className="fill-[#0f1715]/20" /> Open Chat
                      </button>
                    </div>
                  )}

                  {!notif.read && notif.type !== 'NEW_REQUEST' && notif.type !== 'REQUEST_ACCEPTED' && (
                    <button 
                      onClick={() => handleMarkRead(notif._id)}
                      className="mt-2 text-[10px] text-st-accent font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
