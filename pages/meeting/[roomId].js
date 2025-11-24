// pages/meeting/[roomId].js
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import io from "socket.io-client";

let socket;

export default function MeetingPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const localVideoContainerRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [userRole, setUserRole] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Draggable video state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVideoHidden, setIsVideoHidden] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide controls on mobile after 3 seconds
  useEffect(() => {
    if (!isMobile) return;

    let timeoutId;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setShowControls(false), 3000);
    };

    const handleInteraction = () => {
      resetTimer();
    };

    resetTimer();

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('click', handleInteraction);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!roomId) return;

    // Get user role from localStorage
    const role = localStorage.getItem('role');
    setUserRole(role);

    // Connect to the signaling server
    socket = io("https://plag-detector-next.onrender.com");

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionStatus(pc.connectionState);
      console.log("Connection state:", pc.connectionState);
    };

    // FIXED: Proper track event handling
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        setRemoteStream(stream);
        setHasRemoteVideo(true);
        
        // Set up track ended listeners
        event.track.onended = () => {
          console.log("Remote track ended:", event.track.kind);
          if (event.track.kind === 'video') {
            setHasRemoteVideo(false);
          }
        };
      }
    };

    // Get user media and set up local stream
    navigator.mediaDevices
      .getUserMedia({ 
        video: { 
          width: { ideal: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080 },
          frameRate: { ideal: 30 },
          facingMode: isMobile ? "user" : "environment"
        }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      .then((stream) => {
        console.log("Got local stream with tracks:", {
          video: stream.getVideoTracks().length,
          audio: stream.getAudioTracks().length
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log("Local video play error:", e));
        }
        
        // Add all tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log("Adding local track:", track.kind, track.readyState);
          pc.addTrack(track, stream);
        });
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera or microphone. Please check permissions.");
      });

    // Join the room
    socket.emit("join-room", roomId);
    setConnectionStatus("Joining room...");

    // Handle user joined event
    socket.on("user-joined", async (userId) => {
      console.log("User joined:", userId);
      setConnectionStatus("Creating offer...");
      
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
        setConnectionStatus("Offer sent");
      } catch (error) {
        console.error("Error creating offer:", error);
        setConnectionStatus("Error creating offer");
      }
    });

    // Handle incoming offer
    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      setConnectionStatus("Received offer, creating answer...");
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
        setConnectionStatus("Answer sent");
      } catch (error) {
        console.error("Error handling offer:", error);
        setConnectionStatus("Error handling offer");
      }
    });

    // Handle incoming answer
    socket.on("answer", async ({ answer }) => {
      console.log("Received answer");
      setConnectionStatus("Received answer");
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setConnectionStatus("Connected");
      } catch (error) {
        console.error("Error handling answer:", error);
        setConnectionStatus("Error handling answer");
      }
    });

    // Handle ICE candidates
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    // Generate ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    // Set initial position for local video
    setPosition({ x: 16, y: 16 });

    setJoined(true);

    return () => {
      cleanupMedia();
    };
  }, [roomId, isMobile]);

  // Cleanup media resources
  const cleanupMedia = () => {
    console.log("Cleaning up media resources...");
    
    // Stop transcription if active
    if (transcriptionEnabled) {
      setIsTranscribing(false);
      setTranscriptionEnabled(false);
      
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    }

    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
      setLocalStream(null);
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
  };

  // Toggle video hide/show
  const toggleVideoHide = () => {
    if (isVideoHidden) {
      // Show video - return to original position
      setIsVideoHidden(false);
    } else {
      // Hide video to the right side - only show 40px
      const container = document.querySelector('.main-video-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const videoRect = localVideoContainerRef.current.getBoundingClientRect();
        
        // Position so only 40px is visible on the right edge
        const hiddenX = containerRect.width - (isMobile ? 32 : 40);
        const currentY = position.y;
        
        setPosition({ x: hiddenX, y: currentY });
        setIsVideoHidden(true);
      }
    }
  };

  // Draggable video handlers
  const handleMouseDown = (e) => {
    if (isVideoHidden) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = localVideoContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    if (isVideoHidden) return;
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = localVideoContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isVideoHidden) return;
    
    const container = document.querySelector('.main-video-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const videoRect = localVideoContainerRef.current.getBoundingClientRect();
    
    const x = Math.max(8, Math.min(
      e.clientX - dragOffset.x,
      containerRect.width - videoRect.width - 8
    ));
    
    const y = Math.max(8, Math.min(
      e.clientY - dragOffset.y,
      containerRect.height - videoRect.height - 8
    ));

    setPosition({ x, y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isVideoHidden) return;
    
    const touch = e.touches[0];
    const container = document.querySelector('.main-video-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const videoRect = localVideoContainerRef.current.getBoundingClientRect();
    
    const x = Math.max(8, Math.min(
      touch.clientX - dragOffset.x,
      containerRect.width - videoRect.width - 8
    ));
    
    const y = Math.max(8, Math.min(
      touch.clientY - dragOffset.y,
      containerRect.height - videoRect.height - 8
    ));

    setPosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Setup audio processing for real-time transcription
  const setupAudioProcessing = async () => {
    if (!localStream) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(localStream);
      mediaStreamSourceRef.current = source;

      // Create script processor for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let audioChunks = [];
      let recordingStartTime = 0;

      processor.onaudioprocess = (event) => {
        if (!isTranscribing) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 for Whisper API
        const int16Data = convertFloat32ToInt16(inputData);
        audioChunks.push(int16Data);

        // Send audio chunks every 3 seconds for near real-time
        const currentTime = Date.now();
        if (currentTime - recordingStartTime >= 3000) {
          sendAudioToWhisper(audioChunks);
          audioChunks = [];
          recordingStartTime = currentTime;
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log("Audio processing setup complete");
      setIsTranscribing(true);
    } catch (error) {
      console.error("Error setting up audio processing:", error);
    }
  };

  // Convert Float32 to Int16 for Whisper API
  const convertFloat32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  // Send audio to Whisper API for real-time transcription
  const sendAudioToWhisper = async (audioChunks) => {
    try {
      // Combine audio chunks
      const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedData = new Int16Array(totalLength);
      let offset = 0;
      audioChunks.forEach(chunk => {
        combinedData.set(chunk, offset);
        offset += chunk.length;
      });

      // Convert to blob for sending to API
      const audioBlob = new Blob([combinedData.buffer], { type: 'audio/wav' });
      
      // Create FormData for Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');

      const response = await fetch('/api/transcribe-realtime', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text.trim()) {
          const newTranscript = data.text.trim();
          setTranscript(prev => prev + " " + newTranscript);
          
          // Send transcript to interviewer via socket in real-time
          socket.emit('transcript-update', {
            roomId,
            transcript: newTranscript,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Error sending audio to Whisper:", error);
    }
  };

  // Toggle real-time transcription
  const toggleTranscription = async () => {
    if (transcriptionEnabled) {
      // Stop transcription
      setIsTranscribing(false);
      setTranscriptionEnabled(false);
      
      // Clean up audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      setTranscript("");
    } else {
      // Start transcription
      setTranscriptionEnabled(true);
      await setupAudioProcessing();
    }
  };

  // Listen for transcript updates from candidate (for interviewer)
  useEffect(() => {
    if (!socket) return;

    socket.on('transcript-update', ({ transcript: newTranscript }) => {
      setTranscript(prev => prev + " " + newTranscript);
    });

    return () => {
      socket.off('transcript-update');
    };
  }, []);

  // FIXED: Update remote video when remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote video stream");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.log("Remote video play error:", e));
    }
  }, [remoteStream]);

  // Toggle audio mute/unmute
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // End call and leave meeting - FIXED: Proper cleanup
  const endCall = async () => {
    console.log("Ending call and cleaning up...");
    
    // Clean up media resources first
    cleanupMedia();
    
    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirect to appropriate dashboard
    const role = localStorage.getItem('role');
    if (role === 'interviewer') {
      router.push('/dashboard/interviewer');
    } else if (role === 'candidate') {
      router.push('/dashboard/candidate');
    } else {
      router.push('/');
    }
  };

  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // Show toast instead of alert
    const event = new CustomEvent('showToast', { 
      detail: { message: `Room ID ${roomId} copied!`, type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript("");
  };

  // Get connection status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "Connected": return "bg-green-500";
      case "Connecting...":
      case "Joining room...":
      case "Creating offer...":
      case "Offer sent":
      case "Received offer, creating answer...":
      case "Answer sent":
      case "Received answer": return "bg-yellow-500";
      default: return connectionStatus.includes("Error") ? "bg-red-500" : "bg-yellow-500";
    }
  };

  // Get status text
  const getStatusText = () => {
    if (connectionStatus === "Connected") return "Connected";
    if (connectionStatus.includes("Error")) return "Connection Error";
    return "Connecting...";
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white relative">
      {/* Modern Header */}
      <div className={`bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 transition-all duration-300 ${
        showControls ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
                <span className="text-sm font-medium text-gray-200">{getStatusText()}</span>
              </div>
              <div className="h-4 w-px bg-gray-600"></div>
              <span className="text-sm text-gray-400">Room: </span>
              <button
                onClick={copyRoomId}
                className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg text-xs transition-colors duration-200 group"
              >
                <code className="text-gray-200 font-mono">{roomId}</code>
                <i className="fas fa-copy text-gray-400 group-hover:text-blue-400 text-xs"></i>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full capitalize">
                {userRole || 'guest'}
              </span>
              <button
                onClick={() => setShowControls(!showControls)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors md:hidden"
              >
                <i className={`fas ${showControls ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div 
        className="flex-1 relative bg-black overflow-hidden main-video-container"
        onClick={() => isMobile && setShowControls(!showControls)}
      >
        {/* Remote Video - Main Participant (Full Screen) */}
        <div className="absolute inset-0">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-center px-6">
                <div className="w-24 h-24 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <i className="fas fa-user text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Waiting for participant
                </h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Share the Room ID <strong className="text-blue-400">{roomId}</strong> with others to let them join
                </p>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={copyRoomId}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <i className="fas fa-copy text-xs"></i>
                    <span>Copy ID</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-600/50">
            <span className="text-white text-sm font-medium flex items-center space-x-2">
              <i className="fas fa-user text-blue-400"></i>
              <span>Participant</span>
            </span>
          </div>
        </div>

        {/* Local Video - Modern Draggable Overlay */}
        <div
          ref={localVideoContainerRef}
          className={`absolute bg-black rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
            isVideoHidden 
              ? 'border-purple-500/60 shadow-lg' 
              : isDragging 
                ? 'border-blue-500/80 shadow-2xl scale-105' 
                : 'border-white/20 shadow-xl'
          } ${isVideoHidden ? 'cursor-default' : 'cursor-move'} ${
            isMobile ? 'w-32 h-48' : 'w-48 h-36 md:w-64 md:h-48'
          }`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `translate(0, 0) ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover pointer-events-none"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
              <div className="text-center">
                <i className="fas fa-video-slash text-2xl text-gray-400 mb-2"></i>
                <p className="text-gray-400 text-xs">Camera Off</p>
              </div>
            </div>
          )}
          
          {/* Overlay Info */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium flex items-center space-x-1">
                  <i className="fas fa-user text-green-400 text-xs"></i>
                  <span>You {isVideoOff && "(Off)"}</span>
                </span>
                <div className="flex items-center space-x-1">
                  {!isVideoHidden && (
                    <div className="bg-black/40 rounded px-1.5 py-0.5">
                      <i className="fas fa-arrows-alt text-gray-300 text-xs"></i>
                    </div>
                  )}
                  <div className={`rounded px-1.5 py-0.5 ${
                    isVideoHidden ? 'bg-purple-500/20' : 'bg-black/40'
                  }`}>
                    <i className={`fas ${isVideoHidden ? 'fa-eye' : 'fa-eye-slash'} text-xs ${
                      isVideoHidden ? 'text-purple-400' : 'text-gray-300'
                    }`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Overlay - Mobile Only */}
        {isMobile && connectionStatus !== "Connected" && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-600/50">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusColor()}`}></div>
              <span className="text-xs text-gray-200">{connectionStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modern Transcript Panel */}
      {(userRole === 'interviewer' || transcriptionEnabled) && (
        <div className={`bg-gray-800/95 backdrop-blur-xl border-t border-gray-700/50 transition-all duration-300 ${
          showTranscript ? 'max-h-80' : 'max-h-14'
        } overflow-hidden ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-750/50 transition-colors duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-comment-alt text-blue-400 text-sm"></i>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-100">Live Transcription</span>
                {isTranscribing && (
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 text-xs">Active</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {userRole === 'candidate' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTranscription();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    transcriptionEnabled 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  <i className={`fas ${transcriptionEnabled ? 'fa-stop' : 'fa-microphone'} mr-1`}></i>
                  {transcriptionEnabled ? 'Stop' : 'Start'}
                </button>
              )}
              <i className={`fas fa-chevron-${showTranscript ? 'up' : 'down'} text-gray-400 transition-transform duration-200 group-hover:text-white`}></i>
            </div>
          </button>
          
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearTranscript}
                  disabled={!transcript}
                  className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
                >
                  <i className="fas fa-trash text-xs"></i>
                  <span>Clear</span>
                </button>
                {transcript && (
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {transcript.split(' ').length} words
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 max-h-32 overflow-y-auto backdrop-blur-sm border border-gray-700/50">
              {transcript ? (
                <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-microphone-slash text-gray-500 text-lg mb-2"></i>
                  <p className="text-gray-400 text-sm">
                    {userRole === 'candidate' 
                      ? 'Start transcription to convert your speech to text...'
                      : 'Waiting for candidate speech transcription...'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Floating Controls */}
      <div className={`bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 transition-all duration-300 ${
        showControls ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="px-4 py-3">
          <div className="flex justify-center items-center space-x-2 md:space-x-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                isAudioMuted 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-500/10'
              }`}
            >
              <i className={`fas ${isAudioMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-lg mb-1`}></i>
              <span className="text-xs mt-1 font-medium">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                isVideoOff 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-500/10'
              }`}
            >
              <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'} text-lg mb-1`}></i>
              <span className="text-xs mt-1 font-medium">{isVideoOff ? 'Video On' : 'Video Off'}</span>
            </button>

            {/* Hide/Show Video Toggle */}
            <button
              onClick={toggleVideoHide}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                isVideoHidden 
                  ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-500/10'
              }`}
            >
              <i className={`fas ${isVideoHidden ? 'fa-eye' : 'fa-eye-slash'} text-lg mb-1`}></i>
              <span className="text-xs mt-1 font-medium">{isVideoHidden ? 'Show' : 'Hide'}</span>
            </button>

            {/* Transcription Toggle (Candidate only) */}
            {userRole === 'candidate' && (
              <button
                onClick={toggleTranscription}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  transcriptionEnabled 
                    ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25' 
                    : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-500/10'
                }`}
              >
                <i className={`fas ${transcriptionEnabled ? 'fa-stop' : 'fa-microphone'} text-lg mb-1`}></i>
                <span className="text-xs mt-1 font-medium">{transcriptionEnabled ? 'Stop' : 'Transcribe'}</span>
              </button>
            )}

            {/* End Call - Larger and Centered */}
            <button
              onClick={endCall}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <i className="fas fa-phone-slash text-xl mb-1"></i>
              <span className="text-xs mt-1 font-medium">End Call</span>
            </button>

            {/* Transcript Toggle (Interviewer only) */}
            {userRole === 'interviewer' && (
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-500/10 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <i className="fas fa-comment-alt text-lg mb-1"></i>
                <span className="text-xs mt-1 font-medium">Transcript</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tap Indicator */}
      {isMobile && !showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm animate-bounce">
          <i className="fas fa-hand-pointer mr-2"></i>
          Tap to show controls
        </div>
      )}
    </div>
  );
}