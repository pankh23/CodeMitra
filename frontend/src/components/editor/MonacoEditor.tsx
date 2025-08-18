'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useRoom } from '@/lib/room';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useCollaborativeEditor, CursorPosition } from '@/lib/useCollaborativeEditor';
import { motion } from 'framer-motion';
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Users, 
  Copy,
  Check,
  Terminal,
  FileText
} from 'lucide-react';

interface MonacoEditorProps {
  roomId: string;
  initialCode?: string;
  language?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
}

interface CursorPosition {
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

interface CodeChange {
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

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'php', label: 'PHP' }
];

export function MonacoEditor({ 
  roomId, 
  initialCode = '', 
  language = 'javascript', 
  theme = 'dark',
  readOnly = false,
  onCodeChange,
  onSave 
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  
  // Use collaborative editing hook
  const {
    code,
    language: collaborativeLanguage,
    cursors,
    isConnected,
    isSyncing,
    lastSyncTime,
    version,
    handleCodeChange: collaborativeCodeChange,
    handleLanguageChange: collaborativeLanguageChange,
    updateCursorPosition
  } = useCollaborativeEditor(roomId, initialCode, language);
  
  // Local state for UI
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [fontSize, setFontSize] = useState(14);
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [autoSave, setIsAutoSave] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Force dark theme
  const currentTheme = 'vs-dark';
  
  const { socket } = useSocket();

  // Initialize Monaco Editor
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsLoading(false);

    // Configure editor options
    editor.updateOptions({
      fontSize,
      minimap: { enabled: showMinimap },
      wordWrap: wordWrap ? 'on' : 'off',
      readOnly: isReadOnly,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      multiCursorModifier: 'ctrlCmd',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      hover: { enabled: true },
      contextmenu: true,
      mouseWheelZoom: true,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      handleRunCode();
    });

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socket && user) {
        const position = {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        };
        
        socket.emit('cursor-position', {
          roomId,
          userId: user.id,
          userName: user.name,
          userColor: getUserColor(user.id),
          position,
          selection: e.selection ? {
            startLineNumber: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLineNumber: e.selection.endLineNumber,
            endColumn: e.selection.endColumn,
          } : undefined,
        });
      }
    });

    // Listen for selection changes
    editor.onDidChangeCursorSelection((e: any) => {
      if (socket && user && e.selection) {
        socket.emit('cursor-selection', {
          roomId,
          userId: user.id,
          userName: user.name,
          userColor: getUserColor(user.id),
          selection: {
            startLineNumber: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLineNumber: e.selection.endLineNumber,
            endColumn: e.selection.endColumn,
          },
        });
      }
    });
  }, [socket, user, roomId, fontSize, showMinimap, wordWrap, isReadOnly]);

  // Handle code changes
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    
    // Use collaborative code change handler
    collaborativeCodeChange(value);

    // Auto-save
    if (autoSave) {
      setTimeout(() => {
        handleSave();
      }, 1000);
    }
  }, [collaborativeCodeChange, autoSave]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for code changes from other users
    socket.on('code-change', (data: CodeChange) => {
      if (data.userId !== user?.id && editorRef.current) {
        const editor = editorRef.current;
        const currentCode = editor.getValue();
        
        if (currentCode !== data.text) {
          const position = editor.getPosition();
          editor.setValue(data.text);
          editor.setPosition(position);
          // setCode(data.text); // This is now handled by collaborativeCodeChange
        }
      }
    });

    // Listen for cursor positions from other users
    socket.on('cursor-position', (data: CursorPosition) => {
      if (data.userId !== user?.id) {
        updateCursorPosition(data);
      }
    });

    // Listen for user disconnect
    socket.on('user-left', (userId: string) => {
      // updateCursorPosition({ userId: userId, userName: 'User Left', userColor: '#FF0000', position: { lineNumber: 0, column: 0 } });
    });

    // Listen for language changes
    socket.on('language-change', (data: { language: string; userId: string }) => {
      if (data.userId !== user?.id) {
        collaborativeLanguageChange(data.language);
      }
    });

    return () => {
      socket.off('code-change');
      socket.off('cursor-position');
      socket.off('user-left');
      socket.off('language-change');
    };
  }, [socket, user, updateCursorPosition, collaborativeLanguageChange]);

  // Generate user color
  const getUserColor = (userId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(code);
    }
    // Show save notification
    // You can implement a toast notification here
  }, [code, onSave]);

  // Handle run code
  const handleRunCode = useCallback(() => {
    // Implement code execution logic
    console.log('Running code:', code);
    // You can integrate with a code execution service here
  }, [code]);

  // Handle copy code
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    collaborativeLanguageChange(newLanguage);
    if (socket && user) {
      socket.emit('language-change', {
        roomId,
        userId: user.id,
        language: newLanguage,
      });
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme: string) => {
    // This function is no longer needed as theme is forced to dark
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // collaborativeCodeChange(content); // This would overwrite other users' code
        // setCode(content); // This is now handled by collaborativeCodeChange
      };
      reader.readAsText(file);
    }
  };

  // Handle file download
  const handleFileDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `code.${currentLanguage}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* File Operations */}
          <button
            onClick={handleFileDownload}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>

          <label className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 mr-1" />
            Upload
            <input
              type="file"
              accept=".js,.ts,.py,.java,.cpp,.c,.cs,.go,.rs,.php,.html,.css,.json,.xml,.md,.sql,.yml,.yaml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Action Buttons */}
          <button
            onClick={handleSave}
            className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </button>

          <button
            onClick={handleRunCode}
            className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Play className="w-4 h-4 mr-1" />
            Run
          </button>

          <button
            onClick={handleCopyCode}
            className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {isCopied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {isCopied ? 'Copied!' : 'Copy'}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </button>

          {/* Users */}
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Users className="w-4 h-4 mr-1" />
            Users ({currentRoom?.users?.length || 0})
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Font Size
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{fontSize}px</span>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showMinimap}
                  onChange={(e) => setShowMinimap(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Minimap</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={(e) => setWordWrap(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Word Wrap</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setIsAutoSave(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto Save</span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Panel */}
      {showUsers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-wrap gap-2">
            {currentRoom?.users?.map((roomUser: any) => (
              <div
                key={roomUser.user.id}
                className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getUserColor(roomUser.user.id) }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{roomUser.user.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Loading editor...</span>
            </div>
          </div>
        )}

        {/* Collaboration Status Bar */}
        <div className="absolute top-2 right-2 z-20 flex items-center space-x-2">
          {/* Connection Status */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Sync Status */}
          {isSyncing && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-xs">
              <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Syncing...</span>
            </div>
          )}

          {/* Version Info */}
          <div className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs">
            v{version}
          </div>

          {/* Active Users */}
          <div className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 rounded-full text-xs">
            {cursors.length + 1} users
          </div>
        </div>

        <Editor
          height="100%"
          language={currentLanguage}
          theme={currentTheme}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: isReadOnly,
            fontSize,
            minimap: { enabled: showMinimap },
            wordWrap: wordWrap ? 'on' : 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            multiCursorModifier: 'ctrlCmd',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            hover: { enabled: true },
            contextmenu: true,
            mouseWheelZoom: true,
            // Enhanced features
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { 
              enabled: showMinimap,
              side: 'right',
              size: 'proportional'
            },
            // IntelliSense enhancements
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showClasses: true,
              showFunctions: true,
              showVariables: true,
              showConstants: true,
              showEnums: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showWords: true,
              showColors: true,
              showUserWords: true,
              showUserSnippets: true,
              showOther: true,
              showIcons: true,
              maxVisibleSuggestions: 12
            },
            // Code formatting
            formatOnPaste: true,
            formatOnType: true,
            // Bracket matching
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
              highlightActiveIndentation: true
            },
            // Error squiggles
            renderValidationDecorations: 'on',
            // Find and replace
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: 'never',
              caseSensitive: 'off',
              findInSelection: false,
              globalFindInSelection: false,
              isRegex: false,
              matchCase: false,
              matchWholeWord: false,
              regex: false,
              searchScope: null,
              seedSearchStringFromSelection: 'never',
              useGlobalFindInSelection: false
            }
          }}
        />

        {/* Render other users' cursors */}
        {cursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute z-30 pointer-events-none"
            style={{
              // Position calculation would need to be implemented based on Monaco's coordinate system
              // This is a simplified representation
              top: `${cursor.position.lineNumber * 20}px`,
              left: `${cursor.position.column * 8}px`,
            }}
          >
            {/* Cursor line */}
            <div
              className="w-0.5 h-5 animate-pulse"
              style={{ backgroundColor: cursor.userColor }}
            />
            
            {/* User name label */}
            <div
              className="absolute top-0 left-1 px-2 py-1 text-xs text-white rounded whitespace-nowrap shadow-sm"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </div>
            
            {/* Selection highlight */}
            {cursor.selection && (
              <div
                className="absolute bg-opacity-20 rounded"
                style={{
                  backgroundColor: cursor.userColor,
                  top: `${cursor.selection.startLineNumber * 20}px`,
                  left: `${cursor.selection.startColumn * 8}px`,
                  width: `${(cursor.selection.endColumn - cursor.selection.startColumn) * 8}px`,
                  height: `${(cursor.selection.endLineNumber - cursor.selection.startLineNumber + 1) * 20}px`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
