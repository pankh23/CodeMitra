'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Users,
  Settings,
  Maximize,
  Minimize,
  MoreVertical,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';

interface VideoParticipant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

interface EnhancedVideoCallProps {
  roomId: string;
}

export function EnhancedVideoCall({ roomId }: EnhancedVideoCallProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const participantsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !isConnected || !user || !currentRoom) return;

    // Listen for participant updates
    socket.on('participantJoined', (participant: VideoParticipant) => {
      setParticipants(prev => [...prev, participant]);
    });

    socket.on('participantLeft', (participantId: string) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    socket.on('participantUpdated', (updatedParticipant: VideoParticipant) => {
      setParticipants(prev => prev.map(p => 
        p.id === updatedParticipant.id ? updatedParticipant : p
      ));
    });

    socket.on('screenShareStarted', (data: { userId: string; streamId: string }) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isScreenSharing: true } : p
      ));
    });

    socket.on('screenShareStopped', (userId: string) => {
      setParticipants(prev => prev.map(p => 
        p.id === userId ? { ...p, isScreenSharing: false } : p
      ));
    });

    return () => {
      socket.off('participantJoined');
      socket.off('participantLeft');
      socket.off('participantUpdated');
      socket.off('screenShareStarted');
      socket.off('screenShareStopped');
    };
  }, [socket, isConnected, user, currentRoom]);

  const startCall = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      setLocalStream(stream);
      
      // Add local participant
      const localParticipant: VideoParticipant = {
        id: user!.id,
        name: user!.name,
        avatar: user!.avatar,
        stream,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing: false,
        isSpeaking: false,
        isLocal: true
      };

      setParticipants([localParticipant]);
      setIsInCall(true);

      // Notify other participants
      if (socket && currentRoom) {
        socket.emit('joinVideoCall', {
          roomId: currentRoom.id,
          participant: localParticipant
        });
      }

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

    } catch (err: any) {
      setError(err.message || 'Failed to start call');
      console.error('Error starting call:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    // Notify other participants
    if (socket && currentRoom && user) {
      socket.emit('leaveVideoCall', {
        roomId: currentRoom.id,
        userId: user.id
      });
    }

    // Reset state
    setLocalStream(null);
    setScreenStream(null);
    setParticipants([]);
    setIsInCall(false);
    setIsScreenSharing(false);
    setError(null);
  };

  const toggleVideo = async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);

      // Update local participant
      setParticipants(prev => prev.map(p => 
        p.isLocal ? { ...p, isVideoEnabled: !isVideoEnabled } : p
      ));

      // Notify other participants
      if (socket && currentRoom && user) {
        socket.emit('updateParticipant', {
          roomId: currentRoom.id,
          userId: user.id,
          updates: { isVideoEnabled: !isVideoEnabled }
        });
      }
    }
  };

  const toggleAudio = async () => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(!isAudioEnabled);

      // Update local participant
      setParticipants(prev => prev.map(p => 
        p.isLocal ? { ...p, isAudioEnabled: !isAudioEnabled } : p
      ));

      // Notify other participants
      if (socket && currentRoom && user) {
        socket.emit('updateParticipant', {
          roomId: currentRoom.id,
          userId: user.id,
          updates: { isAudioEnabled: !isAudioEnabled }
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);

        // Notify other participants
        if (socket && currentRoom && user) {
          socket.emit('stopScreenShare', {
            roomId: currentRoom.id,
            userId: user.id
          });
        }
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        // Set screen video
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        // Notify other participants
        if (socket && currentRoom && user) {
          socket.emit('startScreenShare', {
            roomId: currentRoom.id,
            userId: user.id,
            streamId: stream.id
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle screen share');
      console.error('Error toggling screen share:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (participantsContainerRef.current?.requestFullscreen) {
        participantsContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const getGridLayout = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const renderParticipant = (participant: VideoParticipant, index: number) => {
    const isMainParticipant = index === 0 || participant.isScreenSharing;

    return (
      <motion.div
        key={participant.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className={`relative group ${
          isMainParticipant ? 'col-span-2 row-span-2' : ''
        }`}
      >
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
          {/* Video Stream */}
          {participant.stream && participant.isVideoEnabled ? (
            <video
              ref={participant.isLocal ? localVideoRef : undefined}
              autoPlay
              playsInline
              muted={participant.isLocal}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Avatar className="w-20 h-20">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback className="text-2xl">
                  {participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Participant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">{participant.name}</span>
                {participant.isLocal && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {!participant.isAudioEnabled && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
                {!participant.isVideoEnabled && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <VideoOff className="w-3 h-3 text-white" />
                  </div>
                )}
                {participant.isScreenSharing && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Monitor className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Speaking Indicator */}
          {participant.isSpeaking && (
            <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      </motion.div>
    );
  };

  if (!user || !currentRoom) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">Join a room to use video calls</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Video className="w-5 h-5" />
            <span>Video Call</span>
            {isInCall && (
              <Badge variant="secondary" className="ml-2">
                {participants.length} participants
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className={showChat ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {!isInCall ? (
          // Call Setup View
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                <Video className="w-10 h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Start Video Call
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Connect with your team members in real-time
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={startCall}
                  disabled={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Start Call</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Active Call View
          <div className="flex-1 flex flex-col">
            {/* Participants Grid */}
            <div 
              ref={participantsContainerRef}
              className={`flex-1 p-4 grid ${getGridLayout()} gap-4 min-h-0`}
            >
              <AnimatePresence>
                {participants.map((participant, index) => 
                  renderParticipant(participant, index)
                )}
              </AnimatePresence>
            </div>

            {/* Call Controls */}
            <div className="border-t p-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={toggleAudio}
                  variant={isAudioEnabled ? "outline" : "default"}
                  size="lg"
                  className={`w-12 h-12 rounded-full ${
                    !isAudioEnabled ? 'bg-red-600 hover:bg-red-700' : ''
                  }`}
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>

                <Button
                  onClick={toggleVideo}
                  variant={isVideoEnabled ? "outline" : "default"}
                  size="lg"
                  className={`w-12 h-12 rounded-full ${
                    !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : ''
                  }`}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>

                <Button
                  onClick={toggleScreenShare}
                  variant={isScreenSharing ? "default" : "outline"}
                  size="lg"
                  className={`w-12 h-12 rounded-full ${
                    isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : ''
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                </Button>

                <Button
                  onClick={endCall}
                  variant="default"
                  size="lg"
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Screen Share Video (Hidden) */}
        {screenStream && (
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  );
}
