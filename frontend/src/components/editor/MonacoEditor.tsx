'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useRoom } from '@/lib/room';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Users, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  Terminal,
  FileText,
  Palette
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
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'dockerfile', label: 'Dockerfile' },
];

const THEMES = [
  { value: 'vs', label: 'Light' },
  { value: 'vs-dark', label: 'Dark' },
  { value: 'hc-black', label: 'High Contrast' },
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
  const [code, setCode] = useState(initialCode);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [currentTheme, setCurrentTheme] = useState(theme === 'dark' ? 'vs-dark' : 'vs');
  const [isLoading, setIsLoading] = useState(true);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [isCopied, setIsCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  
  const { socket } = useSocket();
  const { room, connectedUsers } = useRoom();
  const { user } = useAuth();

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
      cursorSmoothCaretAnimation: true,
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
    
    setCode(value);
    onCodeChange?.(value);

    // Emit code change to other users
    if (socket && user) {
      socket.emit('code-change', {
        roomId,
        userId: user.id,
        userName: user.name,
        code: value,
        timestamp: Date.now(),
      });
    }

    // Auto-save
    if (autoSave) {
      setTimeout(() => {
        handleSave();
      }, 1000);
    }
  }, [socket, user, roomId, onCodeChange, autoSave]);

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
          setCode(data.text);
        }
      }
    });

    // Listen for cursor positions from other users
    socket.on('cursor-position', (data: CursorPosition) => {
      if (data.userId !== user?.id) {
        setCursors(prev => {
          const filtered = prev.filter(cursor => cursor.userId !== data.userId);
          return [...filtered, data];
        });
      }
    });

    // Listen for user disconnect
    socket.on('user-left', (userId: string) => {
      setCursors(prev => prev.filter(cursor => cursor.userId !== userId));
    });

    // Listen for language changes
    socket.on('language-change', (data: { language: string; userId: string }) => {
      if (data.userId !== user?.id) {
        setCurrentLanguage(data.language);
      }
    });

    return () => {
      socket.off('code-change');
      socket.off('cursor-position');
      socket.off('user-left');
      socket.off('language-change');
    };
  }, [socket, user]);

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
    setCurrentLanguage(newLanguage);
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
    setCurrentTheme(newTheme);
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(newTheme);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCode(content);
        if (editorRef.current) {
          editorRef.current.setValue(content);
        }
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

          {/* Theme Selector */}
          <select
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            {THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
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
            Users ({connectedUsers.length})
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
                  onChange={(e) => setAutoSave(e.target.checked)}
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
            {connectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getUserColor(user.id) }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
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
            cursorSmoothCaretAnimation: true,
            multiCursorModifier: 'ctrlCmd',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            hover: { enabled: true },
            contextmenu: true,
            mouseWheelZoom: true,
          }}
        />

        {/* Render other users' cursors */}
        {cursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute z-10 pointer-events-none"
            style={{
              // Position calculation would need to be implemented based on Monaco's coordinate system
              // This is a simplified representation
              top: `${cursor.position.lineNumber * 20}px`,
              left: `${cursor.position.column * 8}px`,
            }}
          >
            <div
              className="w-0.5 h-5 animate-pulse"
              style={{ backgroundColor: cursor.userColor }}
            />
            <div
              className="absolute top-0 left-1 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
              style={{ backgroundColor: cursor.userColor }}
            >
              {cursor.userName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
