'use client';

import { useState, useCallback, useEffect } from 'react';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { EnhancedCodeExecutionPanel } from '@/components/editor/EnhancedCodeExecutionPanel';
import { CleanNavbar } from './CleanNavbar';
import { CleanEditorToolbar } from './CleanEditorToolbar';
import { ResizableLayout } from './ResizableLayout';
import { LayoutPresets } from './LayoutPresets';
import { getBoilerplate } from '@/lib/codeBoilerplates';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import { useSocket } from '@/lib/socket';
import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { EnhancedVideoCall } from '@/components/video/EnhancedVideoCall';

interface LayoutConfig {
  editor: { width: number; height: number };
  output: { width: number; height: number };
  chat: { width: number; height: number };
  video: { width: number; height: number };
}

interface EnhancedCollaborativeLayoutProps {
  roomId: string;
  initialLanguage?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
}

export function EnhancedCollaborativeLayout({
  roomId,
  initialLanguage = 'javascript',
  initialCode = '',
  onCodeChange,
  onLanguageChange
}: EnhancedCollaborativeLayoutProps) {
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  const { socket, isConnected } = useSocket();
  
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutConfig>({
    editor: { width: 70, height: 60 },
    output: { width: 30, height: 40 },
    chat: { width: 30, height: 30 },
    video: { width: 30, height: 30 }
  });

  // Load boilerplate code when language changes
  useEffect(() => {
    if (!code.trim()) {
      const boilerplate = getBoilerplate(language);
      if (boilerplate) {
        setCode(boilerplate.code);
        onCodeChange?.(boilerplate.code);
      }
    }
  }, [language, code, onCodeChange]);

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
    
    // Load new boilerplate for the language
    const boilerplate = getBoilerplate(newLanguage);
    if (boilerplate) {
      setCode(boilerplate.code);
      onCodeChange?.(boilerplate.code);
    }
    
    // Sync language change with other users
    if (socket && isConnected && currentRoom) {
      socket.emit('code:language-change', {
        roomId: currentRoom.id,
        language: newLanguage
      });
    }
  }, [socket, isConnected, currentRoom, user?.id, onLanguageChange, onCodeChange]);

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
    // The actual execution will be handled by the EnhancedCodeExecutionPanel
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
        // Show notification that another user is executing code
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

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: LayoutConfig) => {
    setCurrentLayout(newLayout);
    
    // Sync layout changes with other users
    if (socket && isConnected && currentRoom) {
      socket.emit('layoutChange', {
        roomId: currentRoom.id,
        layout: newLayout,
        userId: user?.id
      });
    }
  }, [socket, isConnected, currentRoom, user?.id]);

  // Handle preset loading
  const handlePresetLoad = useCallback((preset: { name: string }) => {
    console.log('Layout preset loaded:', preset.name);
    // You can add additional logic here, such as notifications
  }, []);

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Clean Navbar */}
      <CleanNavbar 
        onRunCode={handleRunCode}
        isExecuting={isExecuting}
      />

      {/* Layout Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300">Layout Controls:</span>
          <LayoutPresets
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            onLoadPreset={handlePresetLoad}
          />
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>Drag borders to resize • Double-click to reset • Use presets for quick layouts</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizableLayout
          onLayoutChange={handleLayoutChange}
          initialLayout={currentLayout}
        >
          {{
            editor: (
              <div className="h-full flex flex-col">
                <CleanEditorToolbar
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  code={code}
                />
                <div className="flex-1">
                  <MonacoEditor
                    roomId={roomId}
                    language={language}
                    initialCode={code}
                    onCodeChange={handleCodeChange}
                    theme="dark"
                  />
                </div>
              </div>
            ),
            output: (
              <div className="h-full bg-gray-800 border-l border-gray-700">
                <EnhancedCodeExecutionPanel
                  code={code}
                  language={language}
                  roomId={roomId}
                  onExecutionStart={handleExecutionStart}
                  onExecutionComplete={() => setIsExecuting(false)}
                />
              </div>
            ),
            chat: (
              <div className="h-full bg-gray-800 border-l border-gray-700">
                <EnhancedChatInterface roomId={roomId} />
              </div>
            ),
            video: (
              <div className="h-full bg-gray-800 border-l border-gray-700">
                <EnhancedVideoCall roomId={roomId} />
              </div>
            )
          }}
        </ResizableLayout>
      </div>
    </div>
  );
}


