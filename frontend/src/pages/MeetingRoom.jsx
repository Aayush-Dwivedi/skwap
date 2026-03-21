import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, Maximize, Minimize } from 'lucide-react';
import api from '../services/api';

const MeetingRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const meetingContainerRef = useRef(null);
  const iceCandidateQueue = useRef([]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteUserJoined]);

  // Re-bind local stream when transitioning between Preview and Meeting Room
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isJoined]);

  // STUN Servers
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    let mounted = true;

    // 1. Fetch Session Details
    const fetchSession = async () => {
      try {
        const { data } = await api.get('/sessions');
        if (!mounted) return;

        const currentSession = data.find(s => s._id === sessionId);
        if (!currentSession) {
          setError('Session not found or not authorized');
          setLoading(false);
          return;
        }
        setSession(currentSession);
        
        // If it's pending start, begin the session
        if (currentSession.status === 'PENDING_START') {
          await api.put(`/sessions/${sessionId}/begin`);
        }
        if (!mounted) return;

        setLoading(false);
        initializeMediaAndWebRTC(mounted);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching session:', err);
        setError('Failed to load meeting room');
        setLoading(false);
      }
    };
    fetchSession();

    const handleFullscreenChange = () => {
      if (mounted) setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      mounted = false;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socket) {
        socket.emit('leave-meeting', { sessionId, userId: user._id });
        socket.off('user-joined-meeting');
        socket.off('webrtc-offer');
        socket.off('webrtc-answer');
        socket.off('webrtc-ice-candidate');
        socket.off('user-left-meeting');
      }
    };
  }, [sessionId]);

  const initializeMediaAndWebRTC = async (mountedCheck) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mountedCheck) {
        // If unmounted while waiting for camera, stop immediately!
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Do not join WebRTC yet. Wait for user to click Join!
    } catch (err) {
      console.error('Error accessing media devices.', err);
      setError('Camera/Microphone access denied. Please allow permissions and try again.');
    }
  };

  const handleJoinMeeting = () => {
    setIsJoined(true);
    setupWebRTC();
    socket.emit('join-meeting', { sessionId, userId: user._id });
    listenForSocketEvents();
  };

  const setupWebRTC = () => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC State:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.warn('Connection failed, expecting reconnect...');
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Track received!', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const inboundStream = new MediaStream([event.track]);
        setRemoteStream(inboundStream);
      }
      setRemoteUserJoined(true);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && remoteSocketIdRef.current) {
        console.log('Sending ICE candidate');
        // Send candidate to remote peer
        socket.emit('webrtc-ice-candidate', { 
          candidate: event.candidate, 
          toSocketId: remoteSocketIdRef.current 
        });
      }
    };
  };

  // Keep track of the remote user's socket ID
  const remoteSocketIdRef = useRef(null);

  const listenForSocketEvents = () => {
    // Clear existing to avoid duplicates on Strict Mode re-mounts
    socket.off('user-joined-meeting');
    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');
    socket.off('user-left-meeting');

    // 1. User Joined - Create Offer
    socket.on('user-joined-meeting', async ({ userId, socketId }) => {
      console.log('Remote user joined, sending offer');
      remoteSocketIdRef.current = socketId;
      setRemoteUserJoined(true);
      
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('webrtc-offer', { 
          offer, 
          sessionId, 
          toSocketId: socketId,
          fromUserId: user._id 
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    // 2. Received Offer - Create Answer
    socket.on('webrtc-offer', async ({ offer, fromSocketId, fromUserId }) => {
      console.log('Received offer, sending answer');
      remoteSocketIdRef.current = fromSocketId;
      setRemoteUserJoined(true);
      
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Process queued ICE candidates
        while(iceCandidateQueue.current.length > 0) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.current.shift()));
        }

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc-answer', { 
          answer, 
          toSocketId: fromSocketId,
          fromUserId: user._id 
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    // 3. Received Answer
    socket.on('webrtc-answer', async ({ answer, fromSocketId }) => {
      console.log('Received answer');
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process queued ICE candidates
        while(iceCandidateQueue.current.length > 0) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.current.shift()));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    // 4. Received ICE Candidate
    socket.on('webrtc-ice-candidate', async ({ candidate, fromSocketId }) => {
      console.log('Received ICE candidate');
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log('Queueing ICE candidate until remote description is set');
          iceCandidateQueue.current.push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });
    
    // 5. User Left
    socket.on('user-left-meeting', () => {
      console.log('Remote user left');
      setRemoteUserJoined(false);
      setRemoteStream(null);
      iceCandidateQueue.current = [];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Clean up and recreate RPC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      setupWebRTC();
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen share
        const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getTracks()[0];
        
        // Replace video track with screen track
        const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsScreenSharing(true);
        
        // Handle stop sharing from browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Switch back to camera
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
    
    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    
    setIsScreenSharing(false);
  };

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (meetingContainerRef.current?.requestFullscreen) {
        await meetingContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const handleLeaveMeeting = () => {
    // Navigating back will trigger the cleanup in useEffect
    navigate('/sessions', { state: { showCompletionReminder: true } });
  };

  if (loading) return <div className="h-[calc(100vh-2rem)] flex items-center justify-center text-white bg-black/50 rounded-3xl">Initializing Media...</div>;
  if (error) return <div className="h-[calc(100vh-2rem)] flex items-center justify-center text-red-400 bg-black/50 rounded-3xl">{error}</div>;

  if (!isJoined) {
    return (
      <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] w-full bg-black/95 rounded-[2.5rem] flex items-center justify-center p-4 relative overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-skwap-deep pointer-events-none opacity-40" />
        <div className="absolute top-0 -left-1/4 w-[50vw] h-[50vw] bg-skwap-accent rounded-full opacity-[0.03] blur-[120px] mix-blend-screen pointer-events-none" />
        
        <div className="w-full max-w-4xl bg-[#1A1625]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 lg:p-10 shadow-2xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Video Preview Side */}
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-inner border border-white/5 group">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${!isVideoEnabled ? 'opacity-0' : 'opacity-100'}`}
            />
            
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-skwap-deep/50">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <VideoOff size={32} className="text-red-400" />
                </div>
                <p className="font-medium text-sm">Camera is off</p>
              </div>
            )}

            {/* Float Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-[2rem] border border-white/10 shadow-2xl transition-transform group-hover:-translate-y-1">
              <button 
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-all duration-300 ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-110' : 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}
              >
                {isAudioEnabled ? <Mic size={20} strokeWidth={2.5} /> : <MicOff size={20} strokeWidth={2.5} />}
              </button>
              <button 
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-all duration-300 ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-110' : 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}
              >
                {isVideoEnabled ? <Video size={20} strokeWidth={2.5} /> : <VideoOff size={20} strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          {/* Info Side */}
          <div className="flex flex-col text-center lg:text-left items-center lg:items-start">
            <h1 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight drop-shadow-md">Ready to join?</h1>
            <p className="text-skwap-textSecondary mb-8 text-sm font-medium">
              Session: <span className="text-skwap-accent font-bold px-2 py-1 bg-skwap-accent/10 rounded-md block mt-2 mx-auto lg:mx-0 w-max">{session?.request?.requestedSkill || 'Skill Swap'}</span>
            </p>

            <button 
              onClick={handleJoinMeeting}
              className="w-full sm:w-auto py-4 px-10 bg-skwap-accent hover:bg-skwap-primary text-[#1A1625] font-black rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
            >
              <Users size={20} /> Join Meeting Now
            </button>
            <button 
              onClick={() => navigate('/sessions')}
              className="mt-6 py-2 px-6 text-skwap-textSecondary hover:text-white transition-colors text-sm font-semibold rounded-full hover:bg-white/5"
            >
              Cancel and Return
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] w-full bg-black/95 rounded-[2.5rem] flex flex-col p-2 sm:p-4 overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-skwap-deep pointer-events-none opacity-40" />
      <div className="absolute top-0 -right-1/4 w-[50vw] h-[50vw] bg-skwap-accent rounded-full opacity-[0.03] blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 -left-1/4 w-[40vw] h-[40vw] bg-skwap-secondary rounded-full opacity-[0.03] blur-[100px] mix-blend-screen pointer-events-none" />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 relative z-10 w-full h-full">
        {/* Main Video Area */}
        <div ref={meetingContainerRef} className="flex-1 flex flex-col relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl group">
          <div className="flex-1 relative bg-black/50 rounded-3xl overflow-hidden">
            {/* Top Info Header (Floating) */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-4 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-lg transition-opacity duration-300 opacity-100 group-hover:opacity-100 sm:opacity-0">
              <div>
                <h2 className="text-white font-bold text-lg drop-shadow-md">
                  {session?.request?.requestedSkill || 'Skill Swap Meeting'}
                </h2>
                <span className="text-xs text-skwap-textSecondary flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                  In Progress
                </span>
              </div>
            </div>

            {/* Remote Video (Big) */}
            {remoteUserJoined ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-black to-skwap-deep/50">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                  <span className="animate-pulse flex items-center justify-center w-full h-full">
                    <Users size={36} className="text-white/40" />
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">Waiting for others to join...</h3>
                <p className="text-skwap-textSecondary/80 max-w-md mx-auto leading-relaxed font-medium">
                  Your partner has been notified. The meeting will start automatically when they connect.
                </p>
              </div>
            )}
            
            {/* Local Video (PiP) */}
            <div className={`absolute bottom-28 right-6 w-40 sm:w-60 aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 z-20 hover:scale-105 ${!isVideoEnabled && 'opacity-0 scale-95 pointer-events-none'}`}>
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover rounded-2xl ${!isScreenSharing && 'scale-x-[-1]'}`} 
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium flex items-center gap-1">
                {!isAudioEnabled && <MicOff size={10} className="text-red-400" />}
                You
              </div>
            </div>
          </div>

          {/* Controls Bar (Floating Dock) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 translate-y-0 opacity-100 sm:translate-y-4 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              <button 
                onClick={toggleAudio}
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}
                title={isAudioEnabled ? "Mute" : "Unmute"}
              >
                {isAudioEnabled ? <Mic size={22} strokeWidth={2.5} /> : <MicOff size={22} strokeWidth={2.5} />}
              </button>

              <button 
                onClick={toggleVideo}
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}
                title={isVideoEnabled ? "Stop Video" : "Start Video"}
              >
                {isVideoEnabled ? <Video size={22} strokeWidth={2.5} /> : <VideoOff size={22} strokeWidth={2.5} />}
              </button>

              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <button 
                onClick={toggleScreenShare}
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${isScreenSharing ? 'bg-skwap-accent/20 border border-skwap-accent text-skwap-accent shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg'}`}
                title="Share Screen"
              >
                <MonitorUp size={22} strokeWidth={2.5} />
              </button>

              <button 
                onClick={handleFullscreen}
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${isFullscreen ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg'}`}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={22} strokeWidth={2.5} /> : <Maximize size={22} strokeWidth={2.5} />}
              </button>

              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <button 
                onClick={handleLeaveMeeting}
                className="px-5 py-3 sm:px-8 sm:py-4 bg-red-600 hover:bg-red-500 hover:scale-105 transition-all duration-300 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] font-bold rounded-full flex items-center justify-center gap-2 ml-1"
                title="Leave Meeting"
              >
                <PhoneOff size={22} strokeWidth={2.5} /> <span className="hidden sm:inline tracking-wide">Leave</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
