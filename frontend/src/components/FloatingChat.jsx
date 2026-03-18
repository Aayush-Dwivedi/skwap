import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { 
  MessageSquare, X, Send, ChevronLeft, 
  Play, CheckCircle, Clock, Zap, 
  User as UserIcon, MoreVertical 
} from 'lucide-react';
import { format } from 'date-fns';

const FloatingChat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { 
    isOpen, toggleChat, activeSession, 
    setActiveSession, sessions, unreadCounts 
  } = useChat();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, activeSession]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSession && isOpen) {
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/messages/${activeSession._id}`);
          setMessages(data);
        } catch (err) {
          console.error('Failed to load messages', err);
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
      
      if (socket) {
        socket.emit('join chat', activeSession._id);
      }
    }
  }, [activeSession, isOpen, socket]);

  // Socket listener for new messages
  useEffect(() => {
    if (!socket) return;
    
    socket.on('session updated', (updatedSession) => {
      if (activeSession?._id === updatedSession._id) {
        setActiveSession(prev => ({ ...prev, ...updatedSession }));
      }
    });

    socket.on('message received', (msg) => {
      const msgSessionId = typeof msg.session === 'string' ? msg.session : msg.session?._id;
      if (activeSession?._id === msgSessionId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => socket.off('message received');
  }, [socket, activeSession]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSession) return;

    try {
      const { data } = await api.post('/messages', {
        sessionId: activeSession._id,
        text: newMessage
      });
      socket.emit('new message', data);
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleBegin = async () => {
    if (!activeSession) return;
    try {
      const { data } = await api.put(`/sessions/${activeSession._id}/begin`);
      setActiveSession(data);
    } catch (err) {
      console.error('Failed to begin session', err);
    }
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    try {
      const { data } = await api.put(`/sessions/${activeSession._id}/complete`);
      setActiveSession(data);
    } catch (err) {
      console.error('Failed to complete session', err);
    }
  };

  if (!user) return null;

  const otherUser = activeSession 
    ? (activeSession.learner._id === user._id ? activeSession.teacher : activeSession.learner)
    : null;

  const isPending = activeSession?.status === 'PENDING_START';
  const inProgress = activeSession?.status === 'IN_PROGRESS';
  const isCompleted = activeSession?.status === 'COMPLETED';

  // Check if I have already started/completed
  const iStarted = activeSession 
    ? (activeSession.learner._id === user._id ? activeSession.learnerStarted : activeSession.teacherStarted)
    : false;
  const iCompleted = activeSession
    ? (activeSession.learner._id === user._id ? activeSession.learnerCompleted : activeSession.teacherCompleted)
    : false;

  return (
    <div className="fixed bottom-11 right-14 z-[100] flex flex-col items-end group">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="mb-6 w-[380px] h-[580px] rounded-[32px] overflow-hidden bg-white/[0.03] backdrop-blur-3xl flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.5)] border border-white/10 origin-bottom-right"
          style={{
            boxShadow: '0 40px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            animation: 'chatOpen 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Header */}
          <div className="p-6 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
            {activeSession ? (
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveSession(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <ChevronLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 ring-2 ring-skwap-accent/30">
                  <img 
                    src={otherUser?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.name}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{otherUser?.name}</h4>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${inProgress ? 'bg-emerald-400' : 'bg-amber-400'} shadow-[0_0_8px_rgba(52,211,153,0.4)]`} />
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.15em]">{activeSession.status.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-2">
                <h4 className="text-xl font-black text-white tracking-tight">Messages</h4>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-0.5">Active Workspace</p>
              </div>
            )}
            <button onClick={toggleChat} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
            {activeSession ? (
              <div className="space-y-5">
                {/* Session Controls */}
                <div className="bg-white/[0.05] rounded-3xl p-5 border border-white/10 mb-6 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Protocol Control</span>
                    {inProgress && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">Secured</span>}
                  </div>

                  {isPending && (
                    <button 
                      onClick={handleBegin}
                      disabled={iStarted}
                      className={`w-full py-3.5 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2.5 transition-all ${
                        iStarted 
                          ? 'bg-white/5 text-white/30 border border-white/5 cursor-default opacity-50'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 active:scale-95'
                      }`}
                    >
                      {iStarted ? <Clock size={16} /> : <Play size={16} className="fill-current" />}
                      {iStarted ? 'Awaiting Member...' : 'Start Session'}
                    </button>
                  )}

                  {inProgress && (
                    <button 
                      onClick={handleComplete}
                      disabled={iCompleted}
                      className={`w-full py-3.5 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2.5 transition-all ${
                        iCompleted 
                          ? 'bg-white/5 text-white/30 border border-white/5 cursor-default opacity-50'
                          : 'bg-skwap-accent hover:brightness-110 text-skwap-bgSecondary shadow-xl shadow-skwap-accent/30 active:scale-95'
                      }`}
                    >
                      {iCompleted ? <Clock size={16} /> : <CheckCircle size={16} className="fill-current" />}
                      {iCompleted ? 'Finalizing Sync...' : 'Complete Session'}
                    </button>
                  )}

                  {isCompleted && (
                    <div className="text-center py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                      <p className="text-emerald-400 font-black text-xs flex items-center justify-center gap-2">
                        <CheckCircle size={14} className="fill-current shadow-lg" /> SESSION SYNCED
                      </p>
                    </div>
                  )}

                  {isPending && iStarted && (
                    <p className="mt-3 text-[10px] text-white/40 text-center font-medium leading-relaxed px-4">
                      Protocol initiated. Waiting for the other Skwap member to authorize...
                    </p>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-20 opacity-20"><Zap size={40} className="animate-spin text-skwap-accent" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 opacity-30 text-xs font-bold uppercase tracking-[0.2em]">Zero Transmissions</div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender._id === user._id || m.sender === user._id;
                    return (
                      <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-3xl text-[14px] shadow-sm leading-relaxed ${
                          isMine 
                            ? 'bg-skwap-accent text-skwap-bgSecondary rounded-br-[4px] font-semibold' 
                            : 'bg-white/10 text-white rounded-bl-[4px] border border-white/10'
                        }`}>
                          {m.text}
                          <p className={`text-[9px] mt-2 text-right ${isMine ? 'text-skwap-bgSecondary/60' : 'text-white/40'} font-black`}>
                            {format(new Date(m.createdAt), 'p')}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-28 opacity-20">
                    <MessageSquare size={48} className="mx-auto mb-4 stroke-1 text-white" />
                    <p className="text-xs font-black uppercase tracking-[0.25em]">No Channels Found</p>
                  </div>
                ) : (
                  sessions.map(s => {
                    const partner = s.learner._id === user._id ? s.teacher : s.learner;
                    const unread = unreadCounts[s._id] || 0;
                    return (
                      <button 
                        key={s._id}
                        onClick={() => setActiveSession(s)}
                        className="w-full p-5 rounded-[28px] bg-white/[0.02] hover:bg-white/[0.06] flex items-center gap-4 transition-all border border-white/5 hover:border-white/10 active:scale-[0.97] group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 relative ring-2 ring-transparent group-hover:ring-skwap-accent/40 transition-all duration-300">
                          <img 
                            src={partner.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name}`} 
                            alt="avatar" 
                            className="w-full h-full object-cover"
                          />
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-skwap-accent text-skwap-bgSecondary rounded-full border-[3px] border-skwap-bgPrimary flex items-center justify-center text-[10px] font-black shadow-lg">
                              {unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h5 className="text-[13px] font-bold text-white group-hover:text-skwap-accent transition-colors">{partner.name}</h5>
                          <p className="text-[11px] text-white/40 font-medium line-clamp-1">{s.status.replace('_', ' ')}</p>
                        </div>
                        <div className="text-[10px] text-white/20 font-black uppercase tracking-tight">{format(new Date(s.updatedAt), 'MMM d')}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer Input */}
          {activeSession && !isCompleted && (
            <div className="p-6 bg-white/[0.04] border-t border-white/10">
              <form onSubmit={handleSend} className="relative">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-skwap-accent/50 focus:bg-white/[0.1] transition-all text-white placeholder:text-white/30"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-skwap-accent text-skwap-bgSecondary flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-skwap-accent/20"
                >
                  <Send size={18} className="fill-current" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Floating Toggle Icon */}
      <button 
        onClick={toggleChat}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 relative
          ${isOpen ? 'bg-white/10 rotate-180 scale-90' : 'bg-skwap-accent hover:scale-110 active:scale-95'}
        `}
      >
        {isOpen ? (
          <X size={28} className="text-white" />
        ) : (
          <MessageSquare size={28} className="text-skwap-bgSecondary fill-current/10" />
        )}
        
        {/* Total Unread Badge */}
        {!isOpen && Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-rose-500 text-white rounded-full border-[4px] border-skwap-bgPrimary flex items-center justify-center text-[11px] font-black shadow-2xl animate-bounce">
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
          </span>
        )}

      </button>

      <span className={`absolute right-[70px] bottom-5 px-4 py-2 rounded-2xl bg-skwap-bgSecondary/90 text-white text-[11px] font-black tracking-widest uppercase whitespace-nowrap transition-all duration-300 pointer-events-none shadow-2xl border border-white/10 border-l-4 border-l-skwap-accent backdrop-blur-md
        ${isOpen ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}
      `}>
        chat with session member
      </span>

      <style>{`
        @keyframes chatOpen {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(40px);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(var(--skwap-accent), 0.25);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--skwap-accent), 0.5);
        }
      `}</style>
    </div>
  );
};

export default FloatingChat;
