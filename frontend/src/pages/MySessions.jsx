import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MessageCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const MySessions = () => {
  const { user } = useAuth();
  const { openSession } = useChat();
  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: sData }, { data: rData }] = await Promise.all([
        api.get('/sessions'),
        // Fetch requests where I am the teacher (to accept/decline)
        api.get('/requests?role=teacher')
      ]);
      setSessions(sData);
      setRequests(rData.filter(r => r.status === 'PENDING'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestUpdate = async (id, status) => {
    try {
      await api.put(`/requests/${id}/status`, { status });
      fetchData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">My Sessions & Requests</h1>
        <p className="text-skwap-textSecondary">Manage your incoming requests and ongoing skill exchanges.</p>
      </div>

      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Sessions Feed */}
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-skwap-accent" /> Active Sessions
            </h2>

            {sessions.length === 0 ? (
              <div className="glass border-dashed border-white/20 rounded-[2rem] p-10 text-center text-skwap-textSecondary">
                You don't have any active sessions yet. Get out there and start swapping!
              </div>
            ) : (
              sessions.map(session => (
                <div key={session._id} className="glass-card rounded-[2.5rem] p-6 shadow-xl hover:border-skwap-accent/50 transition-colors">
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
                        <p className="text-skwap-textSecondary text-xs">
                          {session.request.type === 'BARTER' ? `Barter: ${session.request.offeredSkill}` : `${session.request.credits} Credits`}
                        </p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      session.status === 'IN_PROGRESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                      session.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => openSession(session)}
                      className="px-6 py-2.5 glass-btn text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                    >
                      <MessageCircle size={16} /> Open Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Pending Requests */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="text-skwap-accent" /> Pending Requests
            </h2>

            {requests.length === 0 ? (
               <div className="glass border-white/10 rounded-[2rem] p-6 text-center text-sm text-skwap-textSecondary">
                No pending requests.
              </div>
            ) : (
              requests.map(req => (
                <div key={req._id} className="glass-card rounded-3xl p-5 shadow-lg relative overflow-hidden group">
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
                  <p className="text-skwap-textSecondary text-xs mb-4">
                    Requested your <strong>{req.listing.skillName}</strong> skill for {req.durationHours} hours.
                    ({req.type === 'BARTER' ? `Offered: ${req.offeredSkill}` : `Offered: ${req.credits} Credits`})
                  </p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRequestUpdate(req._id, 'ACCEPTED')}
                      className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 size={14} /> Accept
                    </button>
                    <button 
                      onClick={() => handleRequestUpdate(req._id, 'DECLINED')}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/50 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors"
                    >
                      <XCircle size={14} /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default MySessions;
