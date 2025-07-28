'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Settings } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  isInCall: boolean;
  onLeaveCall: () => void;
}

export default function VideoCall({ roomId, isInCall, onLeaveCall }: VideoCallProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !isInCall) return;

    // Listen for video call events
    socket.on('userJoinedCall', (userId: string) => {
      setParticipants(prev => [...prev, userId]);
    });

    socket.on('userLeftCall', (userId: string) => {
      setParticipants(prev => prev.filter(id => id !== userId));
    });

    socket.on('videoToggled', (data: { userId: string; isVideoOn: boolean }) => {
      // Handle remote video toggle
      console.log(`User ${data.userId} toggled video: ${data.isVideoOn}`);
    });

    socket.on('audioToggled', (data: { userId: string; isAudioOn: boolean }) => {
      // Handle remote audio toggle
      console.log(`User ${data.userId} toggled audio: ${data.isAudioOn}`);
    });

    return () => {
      socket.off('userJoinedCall');
      socket.off('userLeftCall');
      socket.off('videoToggled');
      socket.off('audioToggled');
    };
  }, [socket, isInCall]);

  useEffect(() => {
    if (isInCall && !localStream) {
      initializeLocalMedia();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isInCall]);

  const initializeLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join the call
      socket?.emit('joinVideoCall', { roomId, userId: user?.id });
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
        socket?.emit('toggleVideo', { roomId, userId: user?.id, isVideoOn: !isVideoOn });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        socket?.emit('toggleAudio', { roomId, userId: user?.id, isAudioOn: !isAudioOn });
      }
    }
  };

  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    socket?.emit('leaveVideoCall', { roomId, userId: user?.id });
    onLeaveCall();
  };

  if (!isInCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={false}
        />
        
        {/* Local video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="text-white" size={24} />
            </div>
          )}
        </div>

        {/* Participants indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2 flex items-center gap-2">
          <Users className="text-white" size={16} />
          <span className="text-white text-sm">{participants.length + 1} participants</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex justify-center items-center gap-4">
        {/* Audio toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioOn 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioOn ? (
            <Mic className="text-white" size={20} />
          ) : (
            <MicOff className="text-white" size={20} />
          )}
        </button>

        {/* Video toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoOn 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isVideoOn ? (
            <Video className="text-white" size={20} />
          ) : (
            <VideoOff className="text-white" size={20} />
          )}
        </button>

        {/* Leave call */}
        <button
          onClick={handleLeaveCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="text-white" size={20} />
        </button>

        {/* Settings */}
        <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
          <Settings className="text-white" size={20} />
        </button>
      </div>
    </div>
  );
}
