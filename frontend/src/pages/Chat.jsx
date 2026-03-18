import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Send, ArrowLeft, MoreVertical, Play, CheckCircle } from 'lucide-react';

const ENDPOINT = 'http://localhost:5000';
let socket;

const Chat = () => {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket = io(ENDPOINT);
    if (user) {
      socket.emit('setup', user);
      socket.on('connected', () => setSocketConnected(true));
    }
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const [msgsRes, sessRes] = await Promise.all([
          api.get(`/messages/${sessionId}`),
          // We need a specific endpoint for a single session, or we can just filter from /sessions
          api.get('/sessions')
        ]);
        setMessages(msgsRes.data);
        const currentSess = sessRes.data.find(s => s._id === sessionId);
        setSessionData(currentSess);

        socket.emit('join chat', sessionId);
      } catch (error) {
        console.error('Error loading chat', error);
      }
    };
    
    fetchChatData();
  }, [sessionId]);

  useEffect(() => {
    socket.on('message received', (newMsgReceived) => {
      if (sessionId !== newMsgReceived.session._id) {
        // Notification could go here
      } else {
        setMessages([...messages, newMsgReceived]);
      }
    });
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      try {
        const { data } = await api.post('/messages', {
          sessionId,
          text: newMessage
        });
        
        socket.emit('new message', data);
        setMessages([...messages, data]);
        setNewMessage('');
      } catch (error) {
        console.error('Failed to send', error);
      }
    }
  };

  const handleBeginSession = async () => {
    try {
      if(window.confirm('Start the session timer now?')) {
        await api.put(`/sessions/${sessionId}/begin`);
        window.location.reload();
      }
    } catch (error) { alert('Failed to begin session'); }
  };

  const handleCompleteSession = async () => {
    try {
      if(window.confirm('Mark this session as successfully completed?')) {
        await api.put(`/sessions/${sessionId}/complete`);
        window.location.reload();
      }
    } catch (error) { alert('Failed to complete session'); }
  };

  if (!sessionData) return <div className="p-8 text-white text-center">Loading chat...</div>;

  const otherUser = sessionData.learner._id === user._id ? sessionData.teacher : sessionData.learner;
  const isPending = sessionData.status === 'PENDING_START';
  const inProgress = sessionData.status === 'IN_PROGRESS';
  const isCompleted = sessionData.status === 'COMPLETED';

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-skwap-card/20 rounded-3xl border border-skwap-card overflow-hidden shadow-2xl backdrop-blur-md">
      
      {/* Chat Header */}
      <div className="bg-skwap-card/40 border-b border-skwap-card p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-skwap-textSecondary hover:text-white hover:bg-skwap-card rounded-full transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-skwap-card">
              <img 
                src={otherUser.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`} 
                alt="avatar" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`; }}
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{otherUser.name}</h3>
              <p className="text-skwap-buttonFocus text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <button onClick={handleBeginSession} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold transition-all">
              <Play size={14} /> Begin Session
            </button>
          )}
          {inProgress && (
            <button onClick={handleCompleteSession} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold transition-all">
              <CheckCircle size={14} /> Mark Complete
            </button>
          )}
          {isCompleted && (
            <span className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-full text-xs font-bold border border-gray-500/30 hidden sm:block">
              Completed
            </span>
          )}
          <button className="p-2 text-skwap-textSecondary hover:text-white hover:bg-skwap-card rounded-full transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        {/* Decorative background behind messages */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-skwap-buttonFocus/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-skwap-textSecondary opacity-60">
            <MessageCircle size={48} className="mb-4" />
            <p className="text-sm">Say hello and figure out the barter details!</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isMine = m.sender._id === user._id || m.sender === user._id; // depending on population
          return (
            <div key={m._id} className={`flex gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0 border border-skwap-card mt-auto hidden sm:block">
                  <img 
                    src={m.sender.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender.name}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender.name}`; }}
                  />
                </div>
              )}
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                isMine 
                  ? 'bg-skwap-card text-white rounded-br-sm border border-skwap-buttonFocus/40' 
                  : 'bg-white/5 text-white/90 rounded-bl-sm border border-white/10 backdrop-blur-md'
              }`}>
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-skwap-card/30 border-t border-skwap-card z-10">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input
            type="text"
            value={newMessage}
            disabled={isCompleted}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isCompleted ? "This session has been completed." : "Type your message..."}
            className="w-full bg-skwap-bgPrimary border border-skwap-card text-white placeholder-skwap-textSecondary rounded-full py-3.5 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus text-sm transition-all shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isCompleted}
            className="absolute right-2 p-2.5 bg-skwap-buttonFocus hover:bg-skwap-accent text-white rounded-full transition-colors disabled:opacity-50"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

export default Chat;
