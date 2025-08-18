'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth, api } from './auth';
import { useSocket } from './socket';
import toast from 'react-hot-toast';

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  maxUsers: number;
  language: string;
  code: string;
  input: string;
  output: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  users: Array<{
    id: string;
    userId: string;
    roomId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }>;
}

export interface RoomContextType {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  // Room actions
  createRoom: (data: CreateRoomData) => Promise<Room>;
  joinRoom: (roomId: string, password: string) => Promise<void>;
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
  const { socket, joinRoom: socketJoinRoom, leaveRoom: socketLeaveRoom, updateCode, executeCode: socketExecuteCode } = useSocket();

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

  const joinRoom = async (roomId: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await api.post('/api/rooms/join', { roomId, password });
      socketJoinRoom(roomId);
    } catch (error: any) {
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
