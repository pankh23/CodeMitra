'use client';

import { useState, useCallback, useEffect } from 'react';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { EnhancedCodeExecutionPanel } from '@/components/editor/EnhancedCodeExecutionPanel';
import { CleanNavbar } from './CleanNavbar';
import { getBoilerplate } from '@/lib/codeBoilerplates';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import { useSocket } from '@/lib/socket';
import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { EnhancedVideoCall } from '@/components/video/EnhancedVideoCall';
import { useRouter } from 'next/navigation';
import { GripVertical, GripHorizontal, MessageSquare, Video, Code } from 'lucide-react';

interface NewCollaborativeLayoutProps {
  roomId: string;
  initialLanguage?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
}

export function NewCollaborativeLayout({
  roomId,
  initialLanguage = 'javascript',
  initialCode = '',
  onCodeChange,
  onLanguageChange
}: NewCollaborativeLayoutProps) {
  const { user } = useAuth();
  const { currentRoom, leaveRoom } = useRoom();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Panel sizes (as percentages)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(20); // Chat sidebar
  const [rightSidebarWidth, setRightSidebarWidth] = useState(25); // Video sidebar
  const [editorHeight, setEditorHeight] = useState(65); // Editor takes 65% of center area height
  
  // Panel visibility states
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Load boilerplate code only when there's no existing code for initial load
  useEffect(() => {
    if (!code.trim() && !initialCode.trim()) {
      const boilerplate = getBoilerplate(language);
      if (boilerplate) {
        setCode(boilerplate.code);
        onCodeChange?.(boilerplate.code);
      }
    }
  }, [language, code, onCodeChange, initialCode]);

  // Update local state when props change (from room data)
  useEffect(() => {
    if (initialCode !== code) {
      setCode(initialCode);
    }
    if (initialLanguage !== language) {
      setLanguage(initialLanguage);
    }
  }, [initialCode, initialLanguage, code, language]);

  // Handle code changes
  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    onCodeChange?.(value);
    
    // Sync code changes with other users via WebSocket
    if (socket && isConnected && currentRoom) {
      socket.emit('code:update', {
        roomId: currentRoom.id,
        code: value,
        language
      });
    }
  }, [socket, isConnected, currentRoom, language, onCodeChange]);

  // Handle language changes
  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
    
    // Sync language change with other users
    if (socket && isConnected && currentRoom) {
      socket.emit('code:language-change', {
        roomId: currentRoom.id,
        language: newLanguage
      });
    }
  }, [socket, isConnected, currentRoom, onLanguageChange]);

  // Handle execution start
  const handleExecutionStart = useCallback(() => {
    setIsExecuting(true);
    
    // Notify other users that code is being executed
    if (socket && isConnected && currentRoom) {
      socket.emit('code:execute', {
        roomId: currentRoom.id,
        code,
        language,
        userId: user?.id
      });
    }
  }, [socket, isConnected, currentRoom, user?.id, language, code]);

  // Handle run code from navbar
  const handleRunCode = useCallback(() => {
    handleExecutionStart();
  }, [handleExecutionStart]);

  // Listen for remote code changes from other users
  useEffect(() => {
    if (!socket || !isConnected || !currentRoom) return;

    const handleRemoteCodeChange = (data: { code: string; language?: string; userId: string }) => {
      if (data.userId !== user?.id) {
        setCode(data.code);
        onCodeChange?.(data.code);
        if (data.language) {
          setLanguage(data.language);
          onLanguageChange?.(data.language);
        }
      }
    };

    const handleRemoteLanguageChange = (data: { language: string; userId: string }) => {
      if (data.userId !== user?.id) {
        setLanguage(data.language);
        onLanguageChange?.(data.language);
      }
    };

    const handleRemoteExecutionStart = (data: { userId: string; language: string }) => {
      if (data.userId !== user?.id) {
        console.log(`User ${data.userId} is executing ${data.language} code`);
      }
    };

    const handleCodeSync = (data: { code: string; language: string; input?: string; output?: string }) => {
      setCode(data.code);
      setLanguage(data.language);
      onCodeChange?.(data.code);
      onLanguageChange?.(data.language);
    };

    socket.on('code:updated', handleRemoteCodeChange);
    socket.on('code:language-changed', handleRemoteLanguageChange);
    socket.on('code:execution-started', handleRemoteExecutionStart);
    socket.on('room:code-sync', handleCodeSync);

    return () => {
      socket.off('code:updated', handleRemoteCodeChange);
      socket.off('code:language-changed', handleRemoteLanguageChange);
      socket.off('code:execution-started', handleRemoteExecutionStart);
      socket.off('room:code-sync', handleCodeSync);
    };
  }, [socket, isConnected, currentRoom, user?.id, onCodeChange, onLanguageChange]);

  // Join room when component mounts
  useEffect(() => {
    if (socket && isConnected && currentRoom) {
      socket.emit('room:join', { roomId: currentRoom.id });
    }
  }, [socket, isConnected, currentRoom]);

  // Handle leave room
  const handleLeaveRoom = useCallback(async () => {
    try {
      if (currentRoom && socket) {
        socket.emit('room:leave', { roomId: currentRoom.id });
        await leaveRoom(currentRoom.id);
        router.push('/');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      router.push('/');
    }
  }, [currentRoom, socket, leaveRoom, router]);

  // Calculate dynamic widths
  const centerWidth = 100 - (showLeftSidebar ? leftSidebarWidth : 0) - (showRightSidebar ? rightSidebarWidth : 0);

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Clean Navbar - Fixed positioned */}
      <CleanNavbar 
        onRunCode={handleRunCode}
        isExecuting={isExecuting}
        currentLanguage={language}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Content Area - Starts below navbar */}
      <div className="flex-1 overflow-hidden flex" style={{ marginTop: '4rem' }}>
        
        {/* Left Sidebar - Chat */}
        {showLeftSidebar && (
          <>
            <div 
              className="bg-gray-800 border-r border-gray-700 flex flex-col"
              style={{ width: `${leftSidebarWidth}%` }}
            >
              {/* Chat Header */}
              <div className="p-3 border-b border-gray-700 bg-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-white">Team Chat</h3>
                  </div>
                  <button
                    onClick={() => setShowLeftSidebar(false)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Chat Content */}
              <div className="flex-1 overflow-hidden">
                <EnhancedChatInterface roomId={currentRoom?.id || ''} />
              </div>
            </div>

            {/* Left Resize Handle */}
            <div
              className="w-1 bg-gray-600 hover:bg-blue-500 cursor-ew-resize relative group"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = leftSidebarWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = e.clientX - startX;
                  const containerWidth = window.innerWidth;
                  const deltaPercent = (deltaX / containerWidth) * 100;
                  const newWidth = Math.max(15, Math.min(40, startWidth + deltaPercent));
                  setLeftSidebarWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </>
        )}

        {/* Center Area - Editor + Execution Panel */}
        <div 
          className="flex flex-col bg-gray-800"
          style={{ width: `${centerWidth}%` }}
        >
          {/* Code Editor */}
          <div 
            className="border-b border-gray-700 relative"
            style={{ height: `${editorHeight}%` }}
          >
            <div className="h-full">
              <MonacoEditor
                roomId={currentRoom?.id || ''}
                language={language}
                initialCode={code}
                onCodeChange={handleCodeChange}
              />
            </div>
          </div>

          {/* Horizontal Resize Handle */}
          <div
            className="h-1 bg-gray-600 hover:bg-blue-500 cursor-ns-resize relative group"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startHeight = editorHeight;
              
              const handleMouseMove = (e: MouseEvent) => {
                const deltaY = e.clientY - startY;
                const containerHeight = window.innerHeight - 64; // Account for navbar
                const deltaPercent = (deltaY / containerHeight) * 100;
                const newHeight = Math.max(30, Math.min(80, startHeight + deltaPercent));
                setEditorHeight(newHeight);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <GripHorizontal className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Code Execution Panel */}
          <div 
            className="bg-gray-800"
            style={{ height: `${100 - editorHeight}%` }}
          >
            <div className="h-full">
              <EnhancedCodeExecutionPanel
                code={code}
                language={language}
                roomId={currentRoom?.id || ''}
                onExecutionStart={handleExecutionStart}
                onExecutionComplete={() => setIsExecuting(false)}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Video Only */}
        {showRightSidebar && (
          <>
            {/* Right Resize Handle */}
            <div
              className="w-1 bg-gray-600 hover:bg-blue-500 cursor-ew-resize relative group"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = rightSidebarWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = startX - e.clientX; // Reversed for right side
                  const containerWidth = window.innerWidth;
                  const deltaPercent = (deltaX / containerWidth) * 100;
                  const newWidth = Math.max(15, Math.min(40, startWidth + deltaPercent));
                  setRightSidebarWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div 
              className="bg-gray-800 border-l border-gray-700 flex flex-col"
              style={{ width: `${rightSidebarWidth}%` }}
            >
              {/* Video Header */}
              <div className="p-3 border-b border-gray-700 bg-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-white">Video Call</h3>
                  </div>
                  <button
                    onClick={() => setShowRightSidebar(false)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Video Content */}
              <div className="flex-1 overflow-hidden">
                <EnhancedVideoCall />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle Buttons for Hidden Sidebars */}
      <div className="fixed left-4 top-20 z-50 flex flex-col space-y-2">
        {!showLeftSidebar && (
          <button
            onClick={() => setShowLeftSidebar(true)}
            className="bg-gray-800 border border-gray-600 text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
            title="Show Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="fixed right-4 top-20 z-50 flex flex-col space-y-2">
        {!showRightSidebar && (
          <button
            onClick={() => setShowRightSidebar(true)}
            className="bg-gray-800 border border-gray-600 text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
            title="Show Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
