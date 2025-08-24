'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff
} from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isLocal: boolean;
}

export function EnhancedVideoCall() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add local participant
      if (user) {
        setParticipants([
          {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            stream,
            isVideoOn: true,
            isAudioOn: true,
            isLocal: true
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to get user media:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  }, [user]);

  // Start video call
  const startCall = useCallback(async () => {
    if (!socket || !isConnected || !currentRoom) return;

    try {
      await initializeLocalStream();
      setIsInCall(true);
      
      // Join video call room
      socket.emit('video:join', { roomId: currentRoom.id });
      
      // Notify other users
      socket.emit('video:call-started', { roomId: currentRoom.id });
      
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to start video call');
    }
  }, [socket, isConnected, currentRoom, initializeLocalStream]);

  // End video call
  const endCall = useCallback(() => {
    if (!socket || !isConnected || !currentRoom) return;

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    // Close peer connections
    peerConnections.current.forEach(connection => connection.close());
    peerConnections.current.clear();

    // Leave video call room
    socket.emit('video:leave', { roomId: currentRoom.id });
    
    // Notify other users
    socket.emit('video:call-ended', { roomId: currentRoom.id });
    
    setIsInCall(false);
    setParticipants([]);
  }, [socket, isConnected, currentRoom]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        
        // Update local participant
        setParticipants(prev => prev.map(p => 
          p.isLocal ? { ...p, isVideoOn: videoTrack.enabled } : p
        ));
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        
        // Update local participant
        setParticipants(prev => prev.map(p => 
          p.isLocal ? { ...p, isAudioOn: audioTrack.enabled } : p
        ));
      }
    }
  }, []);

  // Handle incoming calls
  useEffect(() => {
    if (!socket || !isConnected || !currentRoom) return;

    // Listen for incoming calls
    socket.on('video:incoming-call', (data: { from: { id: string; name: string } }) => {
      console.log('Incoming call from:', data.from.name);
      // Auto-answer for now, you can add a prompt here
      startCall();
    });

    // Listen for user joined video call
    socket.on('video:user-joined', (data: { userId: string; userName: string; userAvatar?: string }) => {
      console.log('User joined video call:', data.userName);
      
      // Create peer connection for new user
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('video:ice-candidate', {
            roomId: currentRoom.id,
            to: data.userId,
            candidate: event.candidate
          });
        }
      };

      // Store peer connection
      peerConnections.current.set(data.userId, peerConnection);

      // Add remote participant
      setParticipants(prev => [
        ...prev,
        {
          id: data.userId,
          name: data.userName,
          avatar: data.userAvatar,
          isVideoOn: true,
          isAudioOn: true,
          isLocal: false
        }
      ]);
    });

    // Listen for user left video call
    socket.on('video:user-left', (data: { userId: string }) => {
      console.log('User left video call:', data.userId);
      
      // Close peer connection
      const peerConnection = peerConnections.current.get(data.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnections.current.delete(data.userId);
      }

      // Remove participant
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
    });

    // Listen for ICE candidates
    socket.on('video:ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const peerConnection = peerConnections.current.get(data.from);
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Listen for offer
    socket.on('video:offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      const peerConnection = peerConnections.current.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('video:answer', {
          roomId: currentRoom.id,
          to: data.from,
          answer
        });
      }
    });

    // Listen for answer
    socket.on('video:answer', (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      const peerConnection = peerConnections.current.get(data.from);
      if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // Handle remote streams
    peerConnections.current.forEach((connection, userId) => {
      connection.ontrack = (event) => {
        setParticipants(prev => prev.map(p => 
          p.id === userId ? { ...p, stream: event.streams[0] } : p
        ));
      };
    });

    return () => {
      socket.off('video:incoming-call');
      socket.off('video:user-joined');
      socket.off('video:user-left');
      socket.off('video:ice-candidate');
      socket.off('video:offer');
      socket.off('video:answer');
    };
  }, [socket, isConnected, currentRoom, startCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Store ref values in local variables to avoid cleanup issues
      const connections = peerConnections.current;
      connections.forEach(connection => connection.close());
    };
  }, []);

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Video className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">Video Call</span>
          {participants.length > 0 && (
            <span className="text-gray-400 text-sm">({participants.length} participants)</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={isInCall ? endCall : startCall}
            className={isInCall ? 'bg-red-600 border-red-500 text-white hover:bg-red-700' : 'bg-green-600 border-green-500 text-white hover:bg-green-700'}
          >
            {isInCall ? <PhoneOff className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
            {isInCall ? 'End Call' : 'Start Call'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-3 overflow-auto">
        {isInCall ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            {/* Local Video */}
            {localStream && (
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                  {user?.name} (You)
                </div>
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-2xl">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            )}

            {/* Remote Participants */}
            {participants.filter(p => !p.isLocal).map(participant => (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                {participant.stream ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-2xl">
                        {participant.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                  {participant.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Call Not Started State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Start Video Call</h3>
            <p className="text-gray-400 text-sm mb-6">
              Click the green button above to start a video call with other participants in this room.
            </p>
            <div className="flex items-center space-x-4 text-gray-500 text-sm">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Video ON by default</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Audio ON by default</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isInCall && (
        <div className="p-3 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVideo}
              className={isVideoOn ? 'bg-gray-700 border-gray-600 text-white' : 'bg-red-600 border-red-500 text-white'}
            >
              {isVideoOn ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
              {isVideoOn ? 'Video' : 'Video Off'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAudio}
              className={isAudioOn ? 'bg-gray-700 border-gray-600 text-white' : 'bg-red-600 border-red-500 text-white'}
            >
              {isAudioOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              {isAudioOn ? 'Audio' : 'Audio Off'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={endCall}
              className="bg-red-600 border-red-500 text-white hover:bg-red-700"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
