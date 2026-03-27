import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MessageCircle, CheckCircle2, XCircle, Clock, Video, Send } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useSocket } from '../contexts/SocketContext';

const MySessions = () => {
  const { user } = useAuth();
  const { openSession } = useChat();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDates, setScheduleDates] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [showReminder, setShowReminder] = useState(location.state?.showCompletionReminder || false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: sData }, { data: incomingData }, { data: outgoingData }] = await Promise.all([
        api.get('/sessions'),
        api.get('/requests?role=teacher'),
        api.get('/requests?role=learner')
      ]);
      setSessions(sData);
      setIncomingRequests(incomingData.filter(r => r.status === 'PENDING'));
      setOutgoingRequests(outgoingData); // We want to show even non-pending ones for status
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('notification received', () => {
      fetchData();
    });
    
    socket.on('session updated', () => {
      fetchData();
    });
    
    socket.on('session created', () => {
      fetchData();
    });

    return () => {
      socket.off('notification received');
      socket.off('session updated');
      socket.off('session created');
    };
  }, [socket]);

  // Auto-hide the completion reminder if there are no IN_PROGRESS sessions
  useEffect(() => {
    if (showReminder && sessions.length > 0) {
      const hasInProgress = sessions.some(s => s.status === 'IN_PROGRESS');
      if (!hasInProgress) {
        setShowReminder(false);
      }
    }
  }, [sessions, showReminder]);

  const handleRequestUpdate = async (id, status) => {
    try {
      await api.put(`/requests/${id}/status`, { status });
      fetchData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  const handleScheduleSession = async (id) => {
    const date = scheduleDates[id];
    if (!date) return alert('Please select a date and time');
    try {
      await api.put(`/sessions/${id}/schedule`, { scheduledAt: date });
      alert('Session scheduled successfully!');
      fetchData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  const canJoinMeeting = (scheduledAt) => {
    if (!scheduledAt) return false;
    const now = new Date();
    const meetingTime = new Date(scheduledAt);
    const diffMs = meetingTime - now;
    // Allow joining 15 mins prior
    return diffMs <= 15 * 60 * 1000;
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 relative pt-6">
      {showReminder && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-full shadow-[0_15px_40px_rgba(5,150,105,0.4)] flex items-center gap-3 animate-bounce border border-emerald-400">
          <CheckCircle2 size={22} className="shrink-0" />
          <span className="font-bold text-sm tracking-wide">Please remember to mark the session as "Completed" in the Chat Box!</span>
          <button onClick={() => setShowReminder(false)} className="bg-black/20 hover:bg-black/40 p-1 rounded-full transition-colors ml-2 shrink-0"><XCircle size={18} /></button>
        </div>
      )}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">My Sessions & Requests</h1>
        <p className="text-st-textSecondary">Manage your incoming requests and ongoing skill exchanges.</p>
      </div>

      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Sessions Feed */}
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-st-accent" /> Active Sessions
            </h2>

            {sessions.length === 0 ? (
              <div className="glass border-dashed border-white/20 rounded-[2rem] p-10 text-center text-st-textSecondary">
                You don't have any active sessions yet. Get out there and start swapping!
              </div>
            ) : (
              sessions.map(session => (
                <div key={session._id} className="glass-card rounded-[2.5rem] p-6 shadow-xl hover:border-st-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/10">
                        {/* Display the other person's avatar */}
                        <img 
                          src={(session.learner._id === user?._id ? session.teacher.photoUrl : session.learner.photoUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.learner._id === user?._id ? session.teacher.name : session.learner.name}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            const name = session.learner._id === user?._id ? session.teacher.name : session.learner.name;
                            e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {session.learner._id === user?._id ? `Learning from ${session.teacher.name}` : `Teaching ${session.learner.name}`}
                        </h3>
                        <p className="text-st-textSecondary text-xs">
                          {session.request.type === 'BARTER' 
                            ? `Barter: ${session.request.offeredSkill}` 
                            : session.status === 'NEGOTIATING' 
                              ? 'Negotiating Credits...' 
                              : `${session.finalCredits || session.request.credits} Credits (Finalized)`}
                        </p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.1em] uppercase ${
                        session.status === 'IN_PROGRESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                        session.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        session.status === 'NEGOTIATING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                        'bg-white/5 text-white/40 border border-white/10'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => openSession(session)}
                        className="px-6 py-2.5 glass-btn text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                      >
                        <MessageCircle size={16} /> Open Chat
                      </button>

                      {session.status === 'PENDING_START' && session.scheduledAt && (
                        <button 
                          onClick={() => navigate(`/meeting/${session._id}`)}
                          disabled={!canJoinMeeting(session.scheduledAt)}
                          className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all shadow-md flex items-center gap-2 ${canJoinMeeting(session.scheduledAt) ? 'bg-st-accent hover:bg-st-primary text-[#1A1625]' : 'bg-gray-500/50 text-white cursor-not-allowed border border-gray-500/30'}`}
                        >
                          <Video size={16} /> Join Meeting
                        </button>
                      )}
                      
                      {session.status === 'IN_PROGRESS' && (
                        <button 
                          onClick={() => navigate(`/meeting/${session._id}`)}
                          className="px-6 py-2.5 bg-st-accent hover:bg-st-primary text-[#1A1625] text-sm font-black rounded-xl transition-all shadow-md flex items-center gap-2"
                        >
                          <Video size={16} /> Return to Meeting
                        </button>
                      )}
                    </div>
                    
                    {session.status === 'PENDING_START' && !session.scheduledAt && (
                      session.teacher._id === user?._id ? (
                        <div className="mt-2 p-4 rounded-xl border border-white/10 bg-white/5 flex flex-wrap items-center gap-3">
                          <span className="text-white text-sm font-bold">Schedule Session:</span>
                          <input 
                            type="datetime-local" 
                            value={scheduleDates[session._id] || ''}
                            onChange={(e) => setScheduleDates({ ...scheduleDates, [session._id]: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:outline-none focus:border-st-accent"
                          />
                          <button 
                            onClick={() => handleScheduleSession(session._id)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-colors"
                          >
                            Schedule
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-st-textSecondary flex items-center gap-2">
                          <Clock className="text-st-accent" size={14} />
                          Waiting for {session.teacher.name} to schedule the session...
                        </div>
                      )
                    )}
                    
                    {session.status === 'PENDING_START' && session.scheduledAt && (
                      <div className="mt-1 flex flex-col gap-1">
                        <div className="text-xs text-st-textSecondary flex items-center gap-1">
                          <Clock size={12} className="text-st-accent" />
                          Scheduled for: <span className="text-white font-medium">{new Date(session.scheduledAt).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-1 bg-amber-500/10 w-fit px-2 py-1 rounded">
                          ⚠️ Please make sure to press "Start Session" in your chat before joining!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Pending Requests */}
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="text-emerald-400" /> Incoming Requests
              </h2>

              {incomingRequests.length === 0 ? (
                <div className="glass border-white/10 rounded-[2rem] p-6 text-center text-sm text-st-textSecondary">
                  No incoming requests.
                </div>
              ) : (
                incomingRequests.map(req => (
                  <div key={req._id} className="glass-card rounded-3xl p-5 shadow-lg relative overflow-hidden group mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
                        <img 
                          src={req.learner.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.learner.name}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.learner.name}`; }}
                        />
                      </div>
                      <span className="text-white text-sm font-bold">{req.learner.name}</span>
                    </div>
                    <p className="text-st-textSecondary text-xs mb-4">
                      Requested your <strong>{req.listing.skillName}</strong> skill.
                      ({req.type === 'BARTER' ? `Offered: ${req.offeredSkill}` : `Offered: ${req.credits} Credits`})
                    </p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRequestUpdate(req._id, 'ACCEPTED')}
                        className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleRequestUpdate(req._id, 'DECLINED')}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/50 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Send className="text-st-accent" size={20} /> Requests Sent
              </h2>

              {outgoingRequests.length === 0 ? (
                <div className="glass border-white/10 rounded-[2rem] p-6 text-center text-sm text-st-textSecondary">
                  No outgoing requests.
                </div>
              ) : (
                outgoingRequests.map(req => (
                  <div key={req._id} className="glass-card rounded-3xl p-5 shadow-lg relative overflow-hidden group mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
                          <img 
                            src={req.teacher.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.teacher.name}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.teacher.name}`; }}
                          />
                        </div>
                        <span className="text-white text-sm font-bold">{req.teacher.name}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                        req.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-st-textSecondary text-xs">
                      Sent request for <strong>{req.listing.skillName}</strong>.
                    </p>
                    <p className="text-[10px] text-white/30 mt-2 font-medium">
                      {req.type === 'BARTER' ? `Proposed Barter: ${req.offeredSkill}` : `Offered: ${req.credits} Credits`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MySessions;
