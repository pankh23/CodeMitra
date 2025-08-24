'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from './socket';
import { useAuth } from './auth';
import { api } from './auth';
import toast from 'react-hot-toast';
import { Room, RoomUser, User } from '@/types';

export interface RoomContextType {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  // Room actions
  createRoom: (data: CreateRoomData) => Promise<Room>;
  joinRoom: (roomId: string, password: string, router?: any) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateRoom: (roomId: string, data: Partial<Room>) => Promise<Room>;
  deleteRoom: (roomId: string) => Promise<void>;
  getRooms: (filters?: RoomFilters) => Promise<void>;
  getRoom: (roomId: string) => Promise<Room>;
  // Room state
  setCurrentRoom: (room: Room | null) => void;
  // Code state
  code: string;
  language: string;
  input: string;
  output: string;
  isExecuting: boolean;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setInput: (input: string) => void;
  setOutput: (output: string) => void;
  executeCode: () => void;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  password: string;
  isPublic: boolean;
  maxUsers: number;
  language: string;
}

export interface RoomFilters {
  page?: number;
  limit?: number;
  search?: string;
  language?: string;
  isPublic?: boolean;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Code state
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const { user } = useAuth();
  const { socket, joinRoom: socketJoinRoom, leaveRoom: socketLeaveRoom, updateCode, executeCode: socketExecuteCode, isConnected } = useSocket();

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data: any) => {
      setCurrentRoom(data.room);
      setCode(data.room.code);
      setLanguage(data.room.language);
      setInput(data.room.input);
      setOutput(data.room.output);
    };

    const handleCodeSync = (data: any) => {
      setCode(data.code);
      setLanguage(data.language);
      setInput(data.input);
      setOutput(data.output);
    };

    const handleCodeUpdated = (data: any) => {
      if (data.userId !== user?.id) {
        setCode(data.code);
        if (data.language) {
          setLanguage(data.language);
        }
      }
    };

    const handleLanguageChanged = (data: any) => {
      if (data.userId !== user?.id) {
        setLanguage(data.language);
      }
    };

    const handleInputUpdated = (data: any) => {
      if (data.userId !== user?.id) {
        setInput(data.input);
      }
    };

    const handleExecutionStarted = (data: any) => {
      setIsExecuting(true);
      setOutput('Executing...');
    };

    const handleExecutionResult = (data: any) => {
      setIsExecuting(false);
      setOutput(data.output || data.error || 'No output');
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('room:code-sync', handleCodeSync);
    socket.on('code:updated', handleCodeUpdated);
    socket.on('code:language-changed', handleLanguageChanged);
    socket.on('code:input-updated', handleInputUpdated);
    socket.on('code:execution-started', handleExecutionStarted);
    socket.on('code:execution-result', handleExecutionResult);

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:code-sync', handleCodeSync);
      socket.off('code:updated', handleCodeUpdated);
      socket.off('code:language-changed', handleLanguageChanged);
      socket.off('code:input-updated', handleInputUpdated);
      socket.off('code:execution-started', handleExecutionStarted);
      socket.off('code:execution-result', handleExecutionResult);
    };
  }, [socket, user?.id]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for user join events
    const handleUserJoined = (data: { user: User; roomId: string; timestamp: string }) => {
      console.log('👤 User joined room:', data);
      if (currentRoom?.id === data.roomId) {
        // Update current room users list
        setCurrentRoom(prev => {
          if (!prev) return prev;
          const newUser: RoomUser = {
            id: data.user.id,
            userId: data.user.id,
            roomId: data.roomId,
            role: 'member',
            joinedAt: data.timestamp,
            user: data.user,
            room: prev
          };
          return {
            ...prev,
            users: [...prev.users, newUser]
          };
        });
        
        toast.success(`${data.user.name} joined the room`);
      }
    };

    // Listen for user leave events
    const handleUserLeft = (data: { userId: string; userName: string; roomId: string; timestamp: string; reason?: string }) => {
      console.log('👋 User left room:', data);
      if (currentRoom?.id === data.roomId) {
        // Update current room users list
        setCurrentRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            users: prev.users.filter(u => u.userId !== data.userId)
          };
        });
        
        const reason = data.reason === 'disconnected' ? 'disconnected' : 'left';
        toast(`${data.userName} ${reason} the room`);
      }
    };

    // Listen for room users update
    const handleRoomUsers = (data: { users: Array<{ id: string; name: string; email: string; avatar?: string; role?: string; joinedAt?: string }>; roomId: string; timestamp: string }) => {
      console.log('👥 Room users updated:', data);
      if (currentRoom?.id === data.roomId) {
        // Update current room users list
        setCurrentRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            users: data.users.map(user => ({
              id: user.id,
              userId: user.id,
              roomId: data.roomId,
              role: (user.role as 'member' | 'owner' | 'admin') || 'member',
              joinedAt: user.joinedAt || data.timestamp,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                createdAt: data.timestamp,
                updatedAt: data.timestamp
              },
              room: prev
            }))
          };
        });
      }
    };

    // Listen for code sync events
    const handleCodeSync = (data: { code: string; language: string; input: string; output: string; roomId: string }) => {
      console.log('📝 Code sync received:', data);
      if (currentRoom?.id === data.roomId) {
        setCode(data.code);
        setLanguage(data.language);
        setInput(data.input);
        setOutput(data.output);
      }
    };

    // Add event listeners
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('room:users', handleRoomUsers);
    socket.on('room:code-sync', handleCodeSync);

    // Cleanup event listeners
    return () => {
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('room:users', handleRoomUsers);
      socket.off('room:code-sync', handleCodeSync);
    };
  }, [socket, isConnected, currentRoom]);

  // Handle page unload to clean up user connection
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentRoom && socket) {
        // Emit leave room event before page unloads
        socket.emit('room:leave', { roomId: currentRoom.id });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && currentRoom && socket) {
        // User switched tabs or minimized browser
        socket.emit('room:leave', { roomId: currentRoom.id });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentRoom, socket]);

  // Room API methods
  const createRoom = async (data: CreateRoomData): Promise<Room> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.post('/api/rooms', data);
      const room = response.data;
      
      // Add room to local state
      setRooms(prev => [room, ...prev]);
      
      // Set as current room if user wants to join immediately
      setCurrentRoom(room);
      
      // Set initial code state
      setCode(room.code || '');
      setLanguage(room.language || 'javascript');
      setInput(room.input || '');
      setOutput(room.output || '');
      
      // CRITICAL FIX: Join the socket room after creating it
      // This ensures the creator receives real-time updates when others join
      if (isConnected && socket) {
        console.log('🔌 Auto-joining socket room after creation:', room.id);
        socketJoinRoom(room.id);
      }
      
      toast.success(`Room "${room.name}" created successfully! Room Code: ${room.id}`);
      return room;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (roomId: string, password: string, router?: any): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Joining room:', roomId, 'with password:', password ? 'YES' : 'NO');
      
      const response = await api.post('/api/rooms/join', { roomId, password });
      console.log('✅ Room join response:', response.data);
      
      // Get the full room details after joining
      const roomResponse = await api.get(`/api/rooms/${roomId}`);
      const room = roomResponse.data;
      
      // Set as current room
      setCurrentRoom(room);
      
      // CRITICAL FIX: Set room's language, code, input, and output from backend data
      setLanguage(room.language || 'javascript');
      setCode(room.code || '');
      setInput(room.input || '');
      setOutput(room.output || '');
      
      // Join socket room
      socketJoinRoom(roomId);
      
      console.log('🎉 Successfully joined room and set as current');
      
      // Navigate to the room editor if router is provided
      if (router) {
        console.log('🧭 Navigating to room editor:', `/room/${roomId}/editor`);
        router.push(`/room/${roomId}/editor`);
      }
    } catch (error: any) {
      console.error('❌ Error joining room:', error);
      const message = error.response?.data?.error || 'Failed to join room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async (roomId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await api.post(`/api/rooms/${roomId}/leave`, {});
      socketLeaveRoom(roomId);
      setCurrentRoom(null);
      setCode('');
      setInput('');
      setOutput('');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to leave room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRoom = async (roomId: string, data: Partial<Room>): Promise<Room> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.put(`/api/rooms/${roomId}`, data);
      const room = response.data;
      setRooms(prev => prev.map(r => r.id === roomId ? room : r));
      if (currentRoom?.id === roomId) {
        setCurrentRoom(room);
      }
      toast.success('Room updated successfully');
      return room;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoom = async (roomId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await api.delete(`/api/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
      }
      toast.success('Room deleted successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getRooms = async (filters: RoomFilters = {}): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.language) queryParams.append('language', filters.language);
      if (filters.isPublic !== undefined) queryParams.append('isPublic', filters.isPublic.toString());
      
      const response = await api.get(`/api/rooms?${queryParams.toString()}`);
      setRooms(response.data.rooms);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to fetch rooms';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getRoom = async (roomId: string): Promise<Room> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/api/rooms/${roomId}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to fetch room';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Code methods
  const handleSetCode = (newCode: string) => {
    setCode(newCode);
    if (currentRoom && socket) {
      updateCode(currentRoom.id, newCode);
    }
  };

  const handleSetLanguage = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (currentRoom && socket) {
      updateCode(currentRoom.id, code, newLanguage);
    }
  };

  const handleSetInput = (newInput: string) => {
    setInput(newInput);
    if (currentRoom && socket) {
      socket.emit('code:input-update', { roomId: currentRoom.id, input: newInput });
    }
  };

  const handleExecuteCode = () => {
    if (currentRoom && socket) {
      setIsExecuting(true);
      socketExecuteCode(currentRoom.id, code, language, input);
    }
  };

  const value: RoomContextType = {
    currentRoom,
    rooms,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoom,
    deleteRoom,
    getRooms,
    getRoom,
    setCurrentRoom,
    code,
    language,
    input,
    output,
    isExecuting,
    setCode: handleSetCode,
    setLanguage: handleSetLanguage,
    setInput: handleSetInput,
    setOutput,
    executeCode: handleExecuteCode,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
