'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, User } from 'lucide-react';

interface VideoParticipantProps {
  userId: string;
  username: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  stream?: MediaStream;
  isLocal?: boolean;
  className?: string;
}

export default function VideoParticipant({
  userId,
  username,
  isVideoOn,
  isAudioOn,
  stream,
  isLocal = false,
  className = ''
}: VideoParticipantProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video element */}
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <User className="text-gray-400 mx-auto mb-2" size={32} />
            <p className="text-white text-sm font-medium">{username}</p>
          </div>
        </div>
      )}

      {/* Overlay with user info and controls */}
      <div
        className={`absolute inset-0 bg-black bg-opacity-30 transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* User name */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
          {username} {isLocal && '(You)'}
        </div>

        {/* Status indicators */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Audio indicator */}
          <div
            className={`p-1 rounded-full ${
              isAudioOn ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {isAudioOn ? (
              <Mic className="text-white" size={12} />
            ) : (
              <MicOff className="text-white" size={12} />
            )}
          </div>

          {/* Video indicator */}
          <div
            className={`p-1 rounded-full ${
              isVideoOn ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {isVideoOn ? (
              <Video className="text-white" size={12} />
            ) : (
              <VideoOff className="text-white" size={12} />
            )}
          </div>
        </div>
      </div>

      {/* Border for active speaker */}
      <div className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none" />
    </div>
  );
}
