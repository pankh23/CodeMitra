'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth';
import toast from 'react-hot-toast';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: string) => void;
  updateCode: (roomId: string, code: string, language?: string) => void;
  executeCode: (roomId: string, code: string, language: string, input?: string) => void;
  updateInput: (roomId: string, input: string) => void;
  updateCursor: (roomId: string, position: { line: number; column: number }) => void;
  updateSelection: (roomId: string, selection: any) => void;
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
  // Video call methods
  joinVideoCall: (roomId: string) => void;
  leaveVideoCall: (roomId: string) => void;
  sendVideoOffer: (roomId: string, targetUserId: string, offer: RTCSessionDescriptionInit) => void;
  sendVideoAnswer: (roomId: string, targetUserId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (roomId: string, targetUserId: string, candidate: RTCIceCandidate) => void;
  toggleMute: (roomId: string, isMuted: boolean) => void;
  toggleVideo: (roomId: string, isVideoOff: boolean) => void;
  startScreenShare: (roomId: string) => void;
  stopScreenShare: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        timeout: 10000,
        retries: 3,
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection failed. Please try again.');
      });

      // Room event listeners
      newSocket.on('room:joined', (data) => {
        console.log('Joined room:', data);
        toast.success(`Joined room: ${data.room.name}`);
      });

      newSocket.on('room:left', (data) => {
        console.log('Left room:', data);
        toast.success('Left room');
      });

      newSocket.on('room:user-joined', (data) => {
        console.log('User joined room:', data);
        toast.success(`${data.user.name} joined the room`);
      });

      newSocket.on('room:user-left', (data) => {
        console.log('User left room:', data);
        toast.info(`${data.userName} left the room`);
      });

      newSocket.on('room:error', (data) => {
        console.error('Room error:', data);
        toast.error(data.message || 'Room error occurred');
      });

      // Code event listeners
      newSocket.on('code:updated', (data) => {
        console.log('Code updated:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:language-changed', (data) => {
        console.log('Language changed:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:input-updated', (data) => {
        console.log('Input updated:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:execution-started', (data) => {
        console.log('Code execution started:', data);
        toast.info('Code execution started...');
      });

      newSocket.on('code:execution-result', (data) => {
        console.log('Code execution result:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:cursor-updated', (data) => {
        console.log('Cursor updated:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:selection-updated', (data) => {
        console.log('Selection updated:', data);
        // This will be handled by the code editor component
      });

      newSocket.on('code:error', (data) => {
        console.error('Code error:', data);
        toast.error(data.message || 'Code error occurred');
      });

      // Chat event listeners
      newSocket.on('chat:message-received', (data) => {
        console.log('Message received:', data);
        // This will be handled by the chat component
      });

      newSocket.on('chat:user-typing', (data) => {
        console.log('User typing:', data);
        // This will be handled by the chat component
      });

      newSocket.on('chat:user-stopped-typing', (data) => {
        console.log('User stopped typing:', data);
        // This will be handled by the chat component
      });

      newSocket.on('chat:error', (data) => {
        console.error('Chat error:', data);
        toast.error(data.message || 'Chat error occurred');
      });

      // Video event listeners
      newSocket.on('video:joined-call', (data) => {
        console.log('Joined video call:', data);
        toast.success('Joined video call');
      });

      newSocket.on('video:left-call', (data) => {
        console.log('Left video call:', data);
        toast.info('Left video call');
      });

      newSocket.on('video:user-joined', (data) => {
        console.log('User joined video call:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:user-left', (data) => {
        console.log('User left video call:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:offer-received', (data) => {
        console.log('Video offer received:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:answer-received', (data) => {
        console.log('Video answer received:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:ice-candidate-received', (data) => {
        console.log('ICE candidate received:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:user-mute-changed', (data) => {
        console.log('User mute changed:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:user-video-changed', (data) => {
        console.log('User video changed:', data);
        // This will be handled by the video component
      });

      newSocket.on('video:screen-share-started', (data) => {
        console.log('Screen share started:', data);
        toast.info(`${data.userName} started screen sharing`);
      });

      newSocket.on('video:screen-share-stopped', (data) => {
        console.log('Screen share stopped:', data);
        toast.info(`${data.userName} stopped screen sharing`);
      });

      newSocket.on('video:error', (data) => {
        console.error('Video error:', data);
        toast.error(data.message || 'Video error occurred');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket if no token
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [token, user]);

  // Room methods
  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('room:join', { roomId });
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket) {
      socket.emit('room:leave', { roomId });
    }
  };

  // Chat methods
  const sendMessage = (roomId: string, message: string) => {
    if (socket) {
      socket.emit('chat:send-message', { roomId, content: message });
    }
  };

  const startTyping = (roomId: string) => {
    if (socket) {
      socket.emit('chat:typing-start', { roomId });
    }
  };

  const stopTyping = (roomId: string) => {
    if (socket) {
      socket.emit('chat:typing-stop', { roomId });
    }
  };

  // Code methods
  const updateCode = (roomId: string, code: string, language?: string) => {
    if (socket) {
      socket.emit('code:update', { roomId, code, language });
    }
  };

  const executeCode = (roomId: string, code: string, language: string, input?: string) => {
    if (socket) {
      socket.emit('code:execute', { roomId, code, language, input });
    }
  };

  const updateInput = (roomId: string, input: string) => {
    if (socket) {
      socket.emit('code:input-update', { roomId, input });
    }
  };

  const updateCursor = (roomId: string, position: { line: number; column: number }) => {
    if (socket) {
      socket.emit('code:cursor-update', { roomId, position });
    }
  };

  const updateSelection = (roomId: string, selection: any) => {
    if (socket) {
      socket.emit('code:selection-update', { roomId, selection });
    }
  };

  // Video methods
  const joinVideoCall = (roomId: string) => {
    if (socket) {
      socket.emit('video:join-call', { roomId });
    }
  };

  const leaveVideoCall = (roomId: string) => {
    if (socket) {
      socket.emit('video:leave-call', { roomId });
    }
  };

  const sendVideoOffer = (roomId: string, targetUserId: string, offer: RTCSessionDescriptionInit) => {
    if (socket) {
      socket.emit('video:offer', { roomId, targetUserId, offer });
    }
  };

  const sendVideoAnswer = (roomId: string, targetUserId: string, answer: RTCSessionDescriptionInit) => {
    if (socket) {
      socket.emit('video:answer', { roomId, targetUserId, answer });
    }
  };

  const sendIceCandidate = (roomId: string, targetUserId: string, candidate: RTCIceCandidate) => {
    if (socket) {
      socket.emit('video:ice-candidate', { roomId, targetUserId, candidate });
    }
  };

  const toggleMute = (roomId: string, isMuted: boolean) => {
    if (socket) {
      socket.emit('video:toggle-mute', { roomId, isMuted });
    }
  };

  const toggleVideo = (roomId: string, isVideoOff: boolean) => {
    if (socket) {
      socket.emit('video:toggle-video', { roomId, isVideoOff });
    }
  };

  const startScreenShare = (roomId: string) => {
    if (socket) {
      socket.emit('video:start-screen-share', { roomId });
    }
  };

  const stopScreenShare = (roomId: string) => {
    if (socket) {
      socket.emit('video:stop-screen-share', { roomId });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateCode,
    executeCode,
    updateInput,
    updateCursor,
    updateSelection,
    startTyping,
    stopTyping,
    joinVideoCall,
    leaveVideoCall,
    sendVideoOffer,
    sendVideoAnswer,
    sendIceCandidate,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
