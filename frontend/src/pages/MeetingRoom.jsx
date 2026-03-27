import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, Maximize, Minimize, X } from 'lucide-react';
import api from '../services/api';

const MeetingRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, profile } = useAuth();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, negotiating, connected, failed
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(true);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const meetingContainerRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const screenPreviewVideoRef = useRef(null);

  useEffect(() => {
    if (remoteStream) {
      console.log('Remote Stream Updated:', {
        id: remoteStream.id,
        tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
      });
    }

    if (remoteVideoRef.current) {
      if (!remoteStream) {
        remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        setRemoteVideoActive(false);
      } else {
        // Use a dedicated audio element for the stream to ensure it's never cut off
        if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(e => console.warn('Remote audio play failed:', e));
        }

        // Keep stream on video element but mute it to prevent echo (audio handled by remoteAudioRef)
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        
        // Explicitly set video active if tracks are live
        const videoTrack = remoteStream.getVideoTracks()[0];
        setRemoteVideoActive(videoTrack && videoTrack.readyState === 'live' && isRemoteVideoEnabled);
        
        remoteVideoRef.current.play().catch(e => console.warn('Remote video play failed:', e));
      }
    }
  }, [remoteStream, remoteUserJoined, isRemoteVideoEnabled]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isJoined, isVideoEnabled]);

  // Audio analysis for speaking feedback
  useEffect(() => {
    if (!isJoined || !localStreamRef.current || !isAudioEnabled) {
      setLocalAudioLevel(0);
      return;
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(localStreamRef.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrame;
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      setLocalAudioLevel(sum / dataArray.length);
      animationFrame = requestAnimationFrame(update);
    };
    update();
    return () => {
      cancelAnimationFrame(animationFrame);
      audioContext.close();
    };
  }, [isJoined, isAudioEnabled]);

  useEffect(() => {
    if (!remoteStream || !remoteUserJoined || !isRemoteAudioEnabled) {
      setRemoteAudioLevel(0);
      return;
    }
    
    let audioContext;
    let animationFrame;
    
    const startAnalysis = async () => {
      try {
        const audioTracks = remoteStream.getAudioTracks();
        if (audioTracks.length === 0) {
          setRemoteAudioLevel(0);
          return;
        }

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Use a MediaStream with ONLY audio tracks for the analysis
        const audioOnlyStream = new MediaStream(audioTracks);
        const source = audioContext.createMediaStreamSource(audioOnlyStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const update = () => {
          if (!isRemoteAudioEnabled) {
            setRemoteAudioLevel(0);
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const level = sum / dataArray.length;
          setRemoteAudioLevel(level);
          animationFrame = requestAnimationFrame(update);
        };
        
        update();
      } catch (err) {
        console.warn('Remote audio analysis failed or blocked:', err);
      }
    };

    startAnalysis();
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext) audioContext.close();
    };
  }, [remoteStream, remoteUserJoined, isRemoteAudioEnabled]);

  useEffect(() => {
    if (screenPreviewVideoRef.current && screenStreamRef.current) {
      screenPreviewVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  // STUN Servers
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
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
        console.log('Session loaded:', currentSession._id, 'Teacher pfp:', currentSession.teacher?.photoUrl);
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

  const setupWebRTC = async () => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // Ensure we have active tracks before adding
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      const videoTrack = localStreamRef.current.getVideoTracks()[0];

      // If tracks were stopped during preview, we need to re-acquire them for the real connection
      if (isAudioEnabled && audioTrack?.readyState === 'ended') {
        const freshStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const freshTrack = freshStream.getAudioTracks()[0];
        localStreamRef.current.removeTrack(audioTrack);
        localStreamRef.current.addTrack(freshTrack);
      }
      
      if (isVideoEnabled && videoTrack?.readyState === 'ended') {
        const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const freshTrack = freshStream.getVideoTracks()[0];
        localStreamRef.current.removeTrack(videoTrack);
        localStreamRef.current.addTrack(freshTrack);
      }

      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC State:', peerConnection.connectionState);
      setConnectionStatus(peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.warn('Connection failed, expecting reconnect...');
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', peerConnection.iceConnectionState);
      setConnectionStatus(peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'failed') {
        console.error('WebRTC ICE Connection Failed. This often happens behind strict firewalls.');
        setError('Connection failed. Please check your internet or try refreshing.');
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Track received!', event.track.kind, 'State:', event.track.readyState);
      
      const track = event.track;
      
      track.onmute = () => {
        console.log(`Remote ${track.kind} track muted`);
        if (track.kind === 'video') setRemoteVideoActive(false);
      };

      track.onunmute = () => {
        console.log(`Remote ${track.kind} track unmuted`);
        if (track.kind === 'video') setRemoteVideoActive(true);
      };

      track.onended = () => {
        console.log(`Remote ${track.kind} track ended`);
        if (track.kind === 'video') {
          setHasRemoteVideo(false);
          setRemoteVideoActive(false);
        }
      };

      setRemoteStream(prev => {
        // Get the existing stream or create a new one
        let currentStream = (event.streams && event.streams[0]) ? event.streams[0] : (prev || new MediaStream());
        
        // Ensure the new track is added to our tracked stream if it's not already there
        if (!currentStream.getTracks().find(t => t.id === track.id)) {
          currentStream.addTrack(track);
        }

        if (track.kind === 'video') {
          setHasRemoteVideo(track.readyState === 'live');
          setRemoteVideoActive(track.readyState === 'live' && !track.muted);
        }
        
        // Return a fresh MediaStream clone to ensure React re-renders any components using this state
        return new MediaStream(currentStream.getTracks());
      });
      
      setRemoteUserJoined(true);
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log('ICE Gathering State:', peerConnection.iceGatheringState);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && remoteSocketIdRef.current) {
        console.log('Sending ICE candidate');
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
    socket.off('video-toggle');
    socket.off('audio-toggle');

    // 1. User Joined - Create Offer
    socket.on('user-joined-meeting', async ({ userId, socketId }) => {
      console.log('Remote user joined, sending offer');
      remoteSocketIdRef.current = socketId;
      setRemoteUserJoined(true);
      setConnectionStatus('connecting');
      
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
        console.error('Error creating/sending offer:', err);
        setError('Failed to initiate call. Try refreshing.');
      }
    });

    // 2. Received Offer - Create Answer
    socket.on('webrtc-offer', async ({ offer, fromSocketId, fromUserId }) => {
      console.log('Received offer, sending answer');
      remoteSocketIdRef.current = fromSocketId;
      setRemoteUserJoined(true);
      setConnectionStatus('connecting');
      
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
      console.log('Received ICE candidate from:', fromSocketId);
      try {
        if (!peerConnectionRef.current) return;
        
        if (peerConnectionRef.current.remoteDescription && peerConnectionRef.current.remoteDescription.type) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        } else {
          console.log('Queueing ICE candidate - remote description not yet set');
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
      setHasRemoteVideo(false);
      setRemoteVideoActive(false);
      setIsRemoteVideoEnabled(true);
      setIsRemoteAudioEnabled(true);
      setConnectionStatus('idle');
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

    socket.on('video-toggle', ({ isEnabled }) => {
      console.log('Remote video toggled:', isEnabled);
      setIsRemoteVideoEnabled(isEnabled);
      if (!isEnabled) setRemoteVideoActive(false);
    });

    socket.on('audio-toggle', ({ isEnabled }) => {
      console.log('Remote audio toggled:', isEnabled);
      setIsRemoteAudioEnabled(isEnabled);
      if (!isEnabled) setRemoteAudioLevel(0);
    });

    socket.on('screen-share-toggle', ({ isSharing }) => {
      console.log('Remote screen share toggled:', isSharing);
      setIsRemoteScreenSharing(isSharing);
    });
  };

  const toggleVideo = async () => {
    try {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        
        if (isVideoEnabled && videoTrack) {
          // Turning OFF
          videoTrack.stop();
          videoTrack.enabled = false;
          setIsVideoEnabled(false);
          socket.emit('video-toggle', { sessionId, isEnabled: false });
          console.log('Camera hardware stopped');
        } else {
          // Turning ON - Need to re-acquire the track
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = newStream.getVideoTracks()[0];
          
          // Replace track in our local stream ref
          if (videoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
          }
          localStreamRef.current.addTrack(newTrack);
          
          // Update PeerConnection sender if it exists
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            }
          }
          
          setIsVideoEnabled(true);
          socket.emit('video-toggle', { sessionId, isEnabled: true });
          console.log('Camera hardware re-acquired');
        }
      }
    } catch (err) {
      console.error('Error toggling video hardware:', err);
      // Fallback to simple toggle if getUserMedia fails
      setIsVideoEnabled(false);
      socket.emit('video-toggle', { sessionId, isEnabled: false });
    }
  };

  const toggleAudio = async () => {
    try {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        
        if (isAudioEnabled && audioTrack) {
          // Turning OFF
          audioTrack.stop();
          audioTrack.enabled = false;
          setIsAudioEnabled(false);
          socket.emit('audio-toggle', { sessionId, isEnabled: false });
          console.log('Microphone hardware stopped');
        } else {
          // Turning ON
          const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = newStream.getAudioTracks()[0];
          
          if (audioTrack) {
            localStreamRef.current.removeTrack(audioTrack);
          }
          localStreamRef.current.addTrack(newTrack);
          
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(newTrack);
            }
          }
          
          setIsAudioEnabled(true);
          socket.emit('audio-toggle', { sessionId, isEnabled: true });
          console.log('Microphone hardware re-acquired');
        }
      }
    } catch (err) {
      console.error('Error toggling audio hardware:', err);
      setIsAudioEnabled(false);
      socket.emit('audio-toggle', { sessionId, isEnabled: false });
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

        if (screenPreviewVideoRef.current) {
          screenPreviewVideoRef.current.srcObject = stream;
        }
        
        setIsScreenSharing(true);
        socket.emit('screen-share-toggle', { sessionId, isSharing: true });
        
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
      screenStreamRef.current = null;
    }
    
    // Clear the preview video explicitly to avoid stuck frame
    if (screenPreviewVideoRef.current) {
      screenPreviewVideoRef.current.srcObject = null;
    }
    
    // Switch back to camera
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = peerConnectionRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
    
    if (sender) {
      // If camera is disabled, replace with null to stop the video stream on remote side
      sender.replaceTrack(isVideoEnabled ? videoTrack : null).catch(err => {
        console.warn('Error replacing track after screen share:', err);
      });
    }
    
    if (localVideoRef.current) {
      // Temporarily clear srcObject to force a refresh of the video element
      localVideoRef.current.srcObject = null;
      if (isVideoEnabled) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(e => console.warn('Local video play failed:', e));
      }
    }
    
    
    setIsScreenSharing(false);
    socket.emit('screen-share-toggle', { sessionId, isSharing: false });
    
    // Ensure accurate state is signaled to remote
    socket.emit('video-toggle', { sessionId, isEnabled: isVideoEnabled });
  };

  const handleRetryConnection = () => {
    console.log('Retrying connection...');
    setConnectionStatus('connecting');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setRemoteUserJoined(false);
    setRemoteStream(null);
    setHasRemoteVideo(false);
    setRemoteVideoActive(false);
    setConnectionStatus('idle');
    setupWebRTC();
    socket.emit('join-meeting', { sessionId, userId: user._id });
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
      <div className="h-full w-full bg-black/95 rounded-[2.5rem] flex items-center justify-center p-4 relative overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-st-deep pointer-events-none opacity-40" />
        <div className="absolute top-0 -left-1/4 w-[50vw] h-[50vw] bg-st-accent rounded-full opacity-[0.03] blur-[120px] mix-blend-screen pointer-events-none" />
        
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-st-deep/50">
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight drop-shadow-md leading-tight">Ready to join?</h1>
            <p className="text-st-textSecondary mb-6 sm:mb-8 text-xs sm:text-sm font-medium">
              Session: <span className="text-st-accent font-bold px-2 py-1 bg-st-accent/10 rounded-md block mt-2 mx-auto lg:mx-0 w-max">{session?.request?.requestedSkill || 'Skill Swap'}</span>
            </p>

            <button 
              onClick={handleJoinMeeting}
              className="w-full sm:w-auto py-4 px-10 bg-st-accent hover:bg-st-primary text-[#1A1625] font-black rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
            >
              <Users size={20} /> Join Meeting Now
            </button>
            <button 
              onClick={() => navigate('/sessions')}
              className="mt-6 py-2 px-6 text-st-textSecondary hover:text-white transition-colors text-sm font-semibold rounded-full hover:bg-white/5"
            >
              Cancel and Return
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black/95 rounded-[2.5rem] flex flex-col p-2 sm:p-4 overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-st-deep pointer-events-none opacity-40" />
      <div className="absolute top-0 -right-1/4 w-[50vw] h-[50vw] bg-st-accent rounded-full opacity-[0.03] blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 -left-1/4 w-[40vw] h-[40vw] bg-st-secondary rounded-full opacity-[0.03] blur-[100px] mix-blend-screen pointer-events-none" />

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
                <span className="text-xs text-st-textSecondary flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                  In Progress
                </span>
              </div>
            </div>

            {/* Remote Video (Big) */}
            {remoteUserJoined ? (
              <div className="w-full h-full relative group/remote transition-all duration-300 rounded-3xl overflow-hidden">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  onPlaying={() => {
                    console.log('Remote video playing!');
                    setRemoteVideoActive(true);
                  }}
                  onResize={(e) => {
                    if (e.target.videoWidth > 0) setRemoteVideoActive(true);
                  }}
                  className="w-full h-full object-cover"
                />
                
                {/* Fallback for remote camera off or connecting state */}
                {(connectionStatus !== 'connected' || !hasRemoteVideo || (!remoteVideoActive && !isRemoteScreenSharing)) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 p-4 sm:p-8">
                    <div className="w-full max-w-lg aspect-video sm:aspect-square flex flex-col items-center justify-center bg-[#1A1625]/60 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95 duration-700">
                      <div className="relative group/avatar mb-6">
                        {/* Audio Pulse Ring */}
                        {remoteAudioLevel > 15 && (
                          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping ring-4 ring-emerald-500/30" />
                        )}
                        
                        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full glass-card border-2 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-300 relative z-10 ${remoteAudioLevel > 15 ? 'scale-110 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]' : 'border-white/10 ring-4 ring-st-accent/5'}`}>
                          <img 
                            src={(
                              (session?.learner?._id === user?._id || session?.learner === user?._id) 
                                ? (session?.teacher?.photoUrl || session?.teacher?.photo) 
                                : (session?.learner?.photoUrl || session?.learner?.photo)
                            ) || `https://api.dicebear.com/7.x/avataaars/svg?seed=partner`} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=partner`; }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-black/40 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-lg">
                          <p className="text-white font-bold text-lg tracking-wide">
                            {(
                              (session?.learner?._id === user?._id || session?.learner === user?._id)
                                ? (session?.teacher?.name || 'Partner')
                                : (session?.learner?.name || 'Partner')
                            ) || 'Partner'}
                          </p>
                        </div>
                      
                      </div>
                      
                      {connectionStatus !== 'connected' && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-st-accent/20 border border-st-accent/30 animate-pulse">
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'failed' ? 'bg-red-500 animate-none' : 'bg-st-accent'}`}></div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-st-accent-light">
                              {connectionStatus === 'failed' ? 'Connection Failed' : 'Connecting...'}
                            </p>
                          </div>
                          
                          {connectionStatus === 'failed' && (
                            <button 
                              onClick={handleRetryConnection}
                              className="px-4 py-1.5 bg-st-accent text-white text-xs font-bold rounded-full hover:bg-st-accent-light transition-colors flex items-center gap-2"
                            >
                              <Users className="w-3 h-3" />
                              Retry Connection
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!isRemoteAudioEnabled && (
                  <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur-md p-2 rounded-full border border-red-500/30">
                    <MicOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-black to-st-deep/80">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                  <span className="animate-pulse flex items-center justify-center w-full h-full">
                    <Users size={36} className="text-white/40" />
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">Waiting for partner...</h3>
                <p className="text-st-textSecondary/80 max-w-md mx-auto leading-relaxed font-medium">
                  The meeting will start automatically when they connect.
                </p>
              </div>
            )}
            
            {/* Local Video (PiP) */}
            <div className={`absolute bottom-24 sm:bottom-28 right-4 sm:right-6 w-32 sm:w-60 aspect-video bg-[#1A1625] rounded-2xl sm:rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-300 z-[25] hover:scale-105 ${localAudioLevel > 15 ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'border-white/20'}`}>
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${!isScreenSharing && 'scale-x-[-1]'} ${!isVideoEnabled ? 'opacity-0' : 'opacity-100'}`} 
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-st-deep transition-all duration-500">
                  <div className="w-16 h-16 rounded-full glass-card border border-white/10 overflow-hidden shadow-lg border-emerald-500/30">
                    <img src={profile?.photoUrl || user?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || 'you'}`} alt="" className="w-full h-full object-cover opacity-80" />
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-1 border border-white/10">
                {!isAudioEnabled && <MicOff size={10} className="text-red-400" />}
                You
              </div>
            </div>

            {/* Screen Share Preview (PiP) */}
            {isScreenSharing && (
              <div className="absolute top-24 sm:top-28 right-4 sm:right-6 w-32 sm:w-60 aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-emerald-500/50 shadow-2xl transition-all duration-300 z-[30] animate-in slide-in-from-right-4">
                <video 
                  ref={screenPreviewVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-2 left-2 bg-emerald-500 px-2 py-0.5 rounded text-[8px] text-white font-black uppercase tracking-widest">
                  Presenting
                </div>
              </div>
            )}
          </div>

          {/* Participants Side Drawer */}
          <div 
            className={`
              fixed md:absolute top-0 right-0 bottom-0 w-full md:w-80 z-50 md:z-40
              transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
              ${showParticipants ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{
              background: `linear-gradient(160deg, rgba(var(--st-bg-secondary), var(--glass-sidebar-opacity)) 0%, rgba(var(--st-bg-primary), var(--glass-sidebar-opacity)) 100%)`,
              backdropFilter: 'blur(var(--glass-blur)) saturate(1.7)',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.7)',
              borderLeft: '1px solid rgba(var(--st-text-primary), 0.08)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.45), inset 0 1.5px 0 rgba(var(--st-text-primary), 0.10)',
            }}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white tracking-tight">Participants</h3>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {/* Me */}
                <div className={`flex items-center justify-between group p-3 rounded-2xl transition-all ${localAudioLevel > 15 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-white/10 border border-white/5 overflow-hidden transition-all ${localAudioLevel > 15 ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#1A1625]' : ''}`}>
                      <img src={profile?.photoUrl || user?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || 'you'}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none mb-1">{user.name} (You)</p>
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none">
                        {localAudioLevel > 15 ? <span className="text-emerald-400 animate-pulse">Speaking...</span> : 'Presenter'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAudioEnabled ? <Mic size={14} className="text-emerald-400" /> : <MicOff size={14} className="text-red-400" />}
                    {isVideoEnabled ? <Video size={14} className="text-emerald-400" /> : <VideoOff size={14} className="text-red-400" />}
                  </div>
                </div>

                {/* Other User */}
                {remoteUserJoined ? (
                  <div className={`flex items-center justify-between group p-3 rounded-2xl transition-all ${remoteAudioLevel > 15 ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border border-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-st-accent/10 border border-st-accent/20 overflow-hidden ring-2 transition-all ${remoteAudioLevel > 15 ? 'ring-emerald-500' : 'ring-st-accent/30'}`}>
                        <img 
                          src={(
                            (session?.learner?._id === user?._id || session?.learner === user?._id) 
                              ? (session?.teacher?.photoUrl || session?.teacher?.photo) 
                              : (session?.learner?.photoUrl || session?.learner?.photo)
                          ) || `https://api.dicebear.com/7.x/avataaars/svg?seed=partner`} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=partner`; }}
                      />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none mb-1">
                          {session?.learner?._id === user?._id ? session?.teacher?.name : session?.learner?.name}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                          {remoteAudioLevel > 15 ? <span className="animate-pulse">Speaking...</span> : <><span className="w-1 h-1 rounded-full bg-emerald-400" /> Connected</>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-white/20 font-bold uppercase tracking-widest italic">Awaiting partner...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest leading-relaxed">
                  End-to-end encrypted protocol active for this session.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 translate-y-0 opacity-100 sm:translate-y-4 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 w-full flex justify-center px-4">
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
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${isScreenSharing ? 'bg-st-accent/20 border border-st-accent text-st-accent shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg'}`}
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

              <button 
                onClick={() => setShowParticipants(!showParticipants)}
                className={`p-3 sm:p-4 rounded-full flex items-center justify-center transition-all duration-300 ${showParticipants ? 'bg-st-accent/20 border border-st-accent text-st-accent' : 'bg-white/10 hover:bg-white/20 hover:scale-110 text-white shadow-lg'}`}
                title="Participants"
              >
                <Users size={22} strokeWidth={2.5} />
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
      
      {/* Hidden Remote Audio Element - Ensures audio persists even when video is hidden/off */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
};

export default MeetingRoom;
