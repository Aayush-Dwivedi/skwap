import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { 
  MessageSquare, X, Send, ChevronLeft, 
  Play, CheckCircle, Clock, Zap, 
  User as UserIcon, MoreVertical, Star 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [proposedCreditsInput, setProposedCreditsInput] = useState('');
  const [negotiating, setNegotiating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
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

  const handleProposeCredits = async () => {
    if (!activeSession || !proposedCreditsInput) return;
    
    const credits = parseInt(proposedCreditsInput);
    if (isNaN(credits) || credits <= 0) {
      alert('Please enter a valid credit amount greater than 0');
      return;
    }

    setNegotiating(true);
    try {
      const { data } = await api.put(`/sessions/${activeSession._id}/propose-credits`, {
        credits: parseInt(proposedCreditsInput)
      });
      setActiveSession(data);
      setProposedCreditsInput('');
    } catch (err) {
      console.error('Failed to propose credits', err);
    } finally {
      setNegotiating(false);
    }
  };

  const handleAcceptCredits = async () => {
    if (!activeSession) return;
    setNegotiating(true);
    try {
      const { data } = await api.put(`/sessions/${activeSession._id}/accept-credits`);
      setActiveSession(data);
    } catch (err) {
      console.error('Failed to accept credits', err);
      alert(err.response?.data?.message || 'Failed to accept credits');
    } finally {
      setNegotiating(false);
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

  const handleCancel = async () => {
    if (!activeSession || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const { data } = await api.put(`/sessions/${activeSession._id}/cancel`, {
        reason: cancelReason
      });
      setActiveSession(data);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      console.error('Failed to cancel session', err);
      alert(err.response?.data?.message || 'Failed to cancel session');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeSession || rating === 0) return;
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        sessionId: activeSession._id,
        rating,
        message: 'Session synced successfully'
      });
      
      const updatedSession = { ...activeSession };
      const isLearner = activeSession.learner._id === user._id || activeSession.learner === user._id;
      if (isLearner) updatedSession.learnerReviewed = true;
      else updatedSession.teacherReviewed = true;
      setActiveSession(updatedSession);
      toast.success('Rating submitted successfully!');
    } catch (err) {
      console.error('Failed to submit review', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!user) return null;

  const otherUser = activeSession 
    ? (activeSession.learner._id === user._id ? activeSession.teacher : activeSession.learner)
    : null;

  const isNegotiating = activeSession?.status === 'NEGOTIATING';
  const isPending = activeSession?.status === 'PENDING_START';
  const inProgress = activeSession?.status === 'IN_PROGRESS';
  const isCompleted = activeSession?.status === 'COMPLETED';
  const isCancelled = activeSession?.status === 'CANCELLED';

  // Negotiation data
  const hasProposal = activeSession?.proposedCredits !== undefined && activeSession?.proposedCredits !== null;
  const iProposed = activeSession?.proposer === user._id || activeSession?.proposer?._id === user._id;

  // Check if I have already started/completed
  const iStarted = activeSession 
    ? (activeSession.learner._id === user._id ? activeSession.learnerStarted : activeSession.teacherStarted)
    : false;
  const iCompleted = activeSession
    ? (activeSession.learner._id === user._id ? activeSession.learnerCompleted : activeSession.teacherCompleted)
    : false;

  const isLearner = activeSession?.learner?._id === user?._id || activeSession?.learner === user?._id;
  const iReviewed = activeSession
    ? (isLearner ? activeSession.learnerReviewed : activeSession.teacherReviewed)
    : false;

  return (
    <div 
      className={`
        h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
        overflow-hidden flex flex-col relative z-[5]
        ${isOpen ? 'w-[400px] opacity-100 ml-6' : 'w-0 opacity-0 pointer-events-none ml-0'}
      `}
      style={{
        background: `linear-gradient(160deg, rgba(var(--st-bg-secondary), var(--glass-card-opacity)) 0%, rgba(var(--st-bg-primary), var(--glass-card-opacity)) 100%)`,
        backdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
        border: '1px solid rgba(var(--st-text-primary), 0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(var(--st-text-primary), 0.08)',
        borderRadius: '2.5rem'
      }}
    >
        {/* Header */}
        <div className="px-6 py-5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
          {activeSession ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveSession(null)} 
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 ring-2 ring-st-accent/30 shadow-lg">
                <img 
                  src={otherUser?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.name}`} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-white tracking-tight line-clamp-1">{otherUser?.name}</h4>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${inProgress ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'}`} />
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.1em]">{activeSession.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-st-accent/10 border border-st-accent/20 flex items-center justify-center text-st-accent">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-black text-white tracking-tight leading-none mb-1">Messages</h4>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none">Unified Inbox</p>
              </div>
            </div>
          )}
          <button 
            onClick={toggleChat} 
            className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
          >
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
                  {isNegotiating && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/20 animate-pulse">Negotiating</span>}
                </div>

                {isNegotiating && (
                  <div className="space-y-4">
                    {hasProposal ? (
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/20 shadow-lg">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                          <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Active Proposal</span>
                          <span className="text-2xl font-black text-st-accent drop-shadow-[0_2px_10px_rgba(var(--st-accent),0.5)]">
                            {activeSession.proposedCredits} <span className="text-[10px] opacity-50 ml-1">CR</span>
                          </span>
                        </div>
                        
                        {iProposed ? (
                          <div className="space-y-3">
                            <p className="text-[10px] text-st-accent text-center font-bold uppercase tracking-widest animate-pulse">Awaiting partner's decision...</p>
                            <div className="flex gap-2 w-full">
                              <input 
                                type="number" 
                                value={proposedCreditsInput}
                                onChange={(e) => setProposedCreditsInput(e.target.value)}
                                placeholder="Update..."
                                className="min-w-0 flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-st-accent transition-all placeholder:text-white/20"
                              />
                              <button 
                                onClick={handleProposeCredits}
                                disabled={!proposedCreditsInput || negotiating}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border border-white/10 flex-shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <button 
                              onClick={handleAcceptCredits}
                              disabled={negotiating}
                              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[13px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                            >
                              {negotiating ? 'Finalizing...' : 'ACCEPT PROPOSAL'}
                            </button>
                            <div className="flex gap-2 w-full">
                              <input 
                                type="number" 
                                value={proposedCreditsInput}
                                onChange={(e) => setProposedCreditsInput(e.target.value)}
                                placeholder="Counter..."
                                className="min-w-0 flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-st-accent transition-all placeholder:text-white/20"
                              />
                              <button 
                                onClick={handleProposeCredits}
                                disabled={!proposedCreditsInput || negotiating}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border border-white/10 flex-shrink-0"
                              >
                                Counter
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-black/30 rounded-2xl p-5 border border-white/10 shadow-inner overflow-hidden">
                        <p className="text-[11px] text-white/50 text-center leading-relaxed mb-4 font-semibold italic">
                           Decide on a credit amount to finalize the booking.
                        </p>
                        <div className="flex gap-2 w-full">
                          <input 
                            type="number" 
                            value={proposedCreditsInput}
                            onChange={(e) => setProposedCreditsInput(e.target.value)}
                            placeholder="Pitch credits..."
                            className="min-w-0 flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-st-accent transition-all placeholder:text-white/20"
                          />
                          <button 
                            onClick={handleProposeCredits}
                            disabled={!proposedCreditsInput || negotiating}
                            className="bg-st-accent hover:brightness-110 text-st-bgSecondary px-7 py-4 rounded-xl text-[12px] font-black uppercase tracking-[0.1em] transition-all disabled:opacity-30 shadow-[0_10px_25px_rgba(var(--st-accent),0.4)] flex-shrink-0"
                          >
                            PITCH
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                        : 'bg-st-accent hover:brightness-110 text-st-bgSecondary shadow-xl shadow-st-accent/30 active:scale-95'
                    }`}
                  >
                    {iCompleted ? <Clock size={16} /> : <CheckCircle size={16} className="fill-current" />}
                    {iCompleted ? 'Finalizing Sync...' : 'Complete Session'}
                  </button>
                )}

                {isCompleted && (
                  <div className="bg-white/5 rounded-2xl border border-white/10 p-5 mt-4 group">
                    <div className="text-center mb-4">
                      <p className="text-emerald-400 font-black text-[11px] flex items-center justify-center gap-2 tracking-widest uppercase mb-1 drop-shadow-[0_2px_10px_rgba(52,211,153,0.3)]">
                        <CheckCircle size={14} className="fill-current" /> SESSION SYNCED
                      </p>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">
                        {iReviewed ? 'Review Submitted' : 'Rate your experience'}
                      </p>
                    </div>

                    {!iReviewed ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 transition-all hover:scale-110 active:scale-95"
                            >
                              <Star
                                size={24}
                                className={`${
                                  (hoverRating || rating) >= star
                                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                    : 'text-white/20 hover:text-white/40'
                                } transition-all duration-300`}
                              />
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={handleSubmitReview}
                          disabled={rating === 0 || submittingReview}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-950 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_20px_rgba(245,158,11,0.2)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex justify-center items-center"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    ) : (
                       <div className="flex justify-center mt-2">
                         <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                           <Star size={12} className="fill-amber-400 text-amber-400" />
                           <span className="text-[10px] font-bold text-white/60">Thank you for rating!</span>
                         </div>
                       </div>
                    )}
                  </div>
                )}

                {isCancelled && (
                  <div className="text-center py-2 bg-rose-500/10 rounded-2xl border border-rose-500/10">
                    <p className="text-rose-400 font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest">
                      <X size={14} className="stroke-[3px]" /> Session Cancelled
                    </p>
                  </div>
                )}

                {isPending && iStarted && (
                  <p className="mt-3 text-[10px] text-white/40 text-center font-medium leading-relaxed px-4">
                    Protocol initiated. Waiting for the other Skill Trade member to authorize...
                  </p>
                )}

                {isPending && !iStarted && (
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="w-full mt-5 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.25em] text-white bg-rose-500 hover:bg-rose-400 border border-rose-400 shadow-[0_12px_40px_rgba(244,63,94,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 group"
                  >
                    <X size={16} className="stroke-[4px] group-hover:rotate-90 transition-transform duration-300" />
                    CANCEL SESSION
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-20 opacity-20"><Zap size={40} className="animate-spin text-st-accent" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 opacity-30 text-xs font-bold uppercase tracking-[0.2em]">Zero Transmissions</div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender._id === user._id || m.sender === user._id;
                  return (
                    <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-3xl text-[14px] shadow-sm leading-relaxed ${
                        isMine 
                          ? 'bg-st-accent text-st-bgSecondary rounded-br-[4px] font-semibold' 
                          : 'bg-white/10 text-white rounded-bl-[4px] border border-white/10'
                      }`}>
                        {m.text}
                        <p className={`text-[9px] mt-2 text-right ${isMine ? 'text-st-bgSecondary/60' : 'text-white/40'} font-black`}>
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
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 relative ring-2 ring-transparent group-hover:ring-st-accent/40 transition-all duration-300">
                        <img 
                          src={partner.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover"
                        />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-st-accent text-st-bgSecondary rounded-full border-[3px] border-st-bgPrimary flex items-center justify-center text-[10px] font-black shadow-lg">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h5 className="text-[13px] font-bold text-white group-hover:text-st-accent transition-colors">{partner.name}</h5>
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
        {activeSession && !isCompleted && !isCancelled && (
          <div className="p-6 bg-white/[0.04] border-t border-white/10">
            <form onSubmit={handleSend} className="relative">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/[0.06] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-st-accent/50 focus:bg-white/[0.1] transition-all text-white placeholder:text-white/30"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-st-accent text-st-bgSecondary flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-st-accent/20"
              >
                <Send size={18} className="fill-current" />
              </button>
            </form>
          </div>
        )}

        {/* Cancellation Overlay */}
        {showCancelModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="absolute inset-0 bg-st-bgSecondary/80 backdrop-blur-md" onClick={() => setShowCancelModal(false)}></div>
            <div className="relative w-full bg-st-bgSecondary border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <h4 className="text-xl font-black text-white mb-2 tracking-tight">Cancel Session?</h4>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6 leading-relaxed">
                Credits will be refunded to the learner immediately.
              </p>
              
              <textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-st-accent/50 transition-all resize-none mb-6"
              />
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCancel}
                  disabled={!cancelReason.trim() || cancelling}
                  className="w-full py-4 bg-rose-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {cancelling ? 'Terminating...' : 'Confirm Cancellation'}
                </button>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Keep Session
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default FloatingChat;
