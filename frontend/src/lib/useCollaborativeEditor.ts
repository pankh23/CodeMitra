/**
 * Custom hook for managing collaborative code editing
 * Handles real-time synchronization, cursor sharing, and conflict resolution
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './socket';
import { useAuth } from './auth';
import { useRoom } from './room';
import { ot, Operation } from './operationalTransform';

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface CodeChange {
  userId: string;
  userName: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
  timestamp: number;
}

export interface CollaborativeEditorState {
  code: string;
  language: string;
  cursors: CursorPosition[];
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  pendingChanges: Operation[];
  version: number;
}

export function useCollaborativeEditor(roomId: string, initialCode: string = '', initialLanguage: string = 'javascript') {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  
  // Editor state
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [pendingChanges, setPendingChanges] = useState<Operation[]>([]);
  const [version, setVersion] = useState(0);
  
  // Refs for tracking state
  const lastCodeRef = useRef(initialCode);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const operationBufferRef = useRef<Operation[]>([]);
  
  // Debounced sync function
  const debouncedSync = useCallback((newCode: string) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncCodeChanges(newCode);
    }, 300); // 300ms debounce
  }, []);
  
  // Sync code changes with other users
  const syncCodeChanges = useCallback(async (newCode: string) => {
    if (!socket || !isConnected || !user || !currentRoom) return;
    
    const oldCode = lastCodeRef.current;
    if (oldCode === newCode) return;
    
    try {
      setIsSyncing(true);
      
      // Create operations from text changes
      const operations = ot.createOperation(oldCode, newCode, user.id, Date.now());
      
      // Transform operations against pending changes
      let transformedOperations = operations;
      for (const pendingOp of pendingChanges) {
        const result = ot.transform(operations[0], pendingOp);
        transformedOperations = result.transformed;
      }
      
      // Emit code change event
      socket.emit('codeChange', {
        roomId: currentRoom.id,
        operations: transformedOperations,
        version: version,
        userId: user.id,
        timestamp: Date.now()
      });
      
      // Update local state
      setVersion(prev => prev + 1);
      setLastSyncTime(Date.now());
      lastCodeRef.current = newCode;
      setPendingChanges([]);
      
    } catch (error) {
      console.error('Failed to sync code changes:', error);
      // Add to pending changes for retry
      setPendingChanges(prev => [...prev, ...operations]);
    } finally {
      setIsSyncing(false);
    }
  }, [socket, isConnected, user, currentRoom, pendingChanges, version]);
  
  // Handle code changes from user input
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    debouncedSync(newCode);
  }, [debouncedSync]);
  
  // Handle language changes
  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    
    // Notify other users of language change
    if (socket && isConnected && currentRoom) {
      socket.emit('languageChange', {
        roomId: currentRoom.id,
        language: newLanguage,
        userId: user?.id,
        timestamp: Date.now()
      });
    }
  }, [socket, isConnected, currentRoom, user?.id]);
  
  // Update cursor position
  const updateCursorPosition = useCallback((position: { lineNumber: number; column: number }, selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }) => {
    if (!socket || !isConnected || !user || !currentRoom) return;
    
    const cursorData: CursorPosition = {
      userId: user.id,
      userName: user.name || 'Anonymous',
      userColor: getUserColor(user.id),
      position,
      selection
    };
    
    // Emit cursor update
    socket.emit('cursorUpdate', {
      roomId: currentRoom.id,
      cursor: cursorData,
      timestamp: Date.now()
    });
  }, [socket, isConnected, user, currentRoom]);
  
  // Get unique color for user
  const getUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, []);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    // Handle incoming code changes
    const handleCodeChange = (data: { operations: Operation[]; userId: string; version: number; timestamp: number }) => {
      if (data.userId === user?.id) return; // Ignore own changes
      
      try {
        // Apply transformed operations
        const newCode = ot.applyOperations(code, data.operations);
        setCode(newCode);
        lastCodeRef.current = newCode;
        
        // Update version
        setVersion(data.version);
        
        // Add to pending changes for future transformations
        setPendingChanges(prev => [...prev, ...data.operations]);
        
      } catch (error) {
        console.error('Failed to apply remote code changes:', error);
        // Request full sync on error
        socket.emit('requestSync', { roomId: currentRoom?.id, userId: user?.id });
      }
    };
    
    // Handle incoming cursor updates
    const handleCursorUpdate = (data: { cursor: CursorPosition; userId: string }) => {
      if (data.userId === user?.id) return; // Ignore own cursor
      
      setCursors(prev => {
        const existing = prev.find(c => c.userId === data.userId);
        if (existing) {
          return prev.map(c => c.userId === data.userId ? data.cursor : c);
        } else {
          return [...prev, data.cursor];
        }
      });
    };
    
    // Handle language changes
    const handleLanguageChange = (data: { language: string; userId: string }) => {
      if (data.userId === user?.id) return; // Ignore own changes
      setLanguage(data.language);
    };
    
    // Handle full sync requests
    const handleSyncRequest = (data: { roomId: string; userId: string }) => {
      if (data.userId === user?.id) return; // Ignore own requests
      
      // Send current code state
      socket.emit('codeSync', {
        roomId: data.roomId,
        code: code,
        language: language,
        version: version,
        userId: user?.id,
        timestamp: Date.now()
      });
    };
    
    // Handle incoming sync
    const handleCodeSync = (data: { code: string; language: string; version: number; userId: string }) => {
      if (data.userId === user?.id) return; // Ignore own sync
      
      setCode(data.code);
      setLanguage(data.language);
      setVersion(data.version);
      lastCodeRef.current = data.code;
      setPendingChanges([]);
    };
    
    // Handle user join/leave
    const handleUserJoin = (data: { userId: string; userName: string }) => {
      // Remove cursor when user leaves
      setCursors(prev => prev.filter(c => c.userId !== data.userId));
    };
    
    const handleUserLeave = (data: { userId: string }) => {
      // Remove cursor when user leaves
      setCursors(prev => prev.filter(c => c.userId !== data.userId));
    };
    
    // Register event listeners
    socket.on('codeChange', handleCodeChange);
    socket.on('cursorUpdate', handleCursorUpdate);
    socket.on('languageChange', handleLanguageChange);
    socket.on('syncRequest', handleSyncRequest);
    socket.on('codeSync', handleCodeSync);
    socket.on('userJoin', handleUserJoin);
    socket.on('userLeave', handleUserLeave);
    
    // Cleanup
    return () => {
      socket.off('codeChange', handleCodeChange);
      socket.off('cursorUpdate', handleCursorUpdate);
      socket.off('languageChange', handleLanguageChange);
      socket.off('syncRequest', handleSyncRequest);
      socket.off('codeSync', handleCodeSync);
      socket.off('userJoin', handleUserJoin);
      socket.off('userLeave', handleUserLeave);
    };
  }, [socket, user?.id, code, language, version, currentRoom?.id]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);
  
  // Request initial sync when joining room
  useEffect(() => {
    if (socket && isConnected && currentRoom && user) {
      socket.emit('joinRoom', {
        roomId: currentRoom.id,
        userId: user.id,
        userName: user.name
      });
      
      // Request current code state
      socket.emit('requestSync', { roomId: currentRoom.id, userId: user.id });
    }
  }, [socket, isConnected, currentRoom, user]);
  
  return {
    // State
    code,
    language,
    cursors,
    isConnected,
    isSyncing,
    lastSyncTime,
    version,
    
    // Actions
    handleCodeChange,
    handleLanguageChange,
    updateCursorPosition,
    
    // Utilities
    getUserColor
  };
}
