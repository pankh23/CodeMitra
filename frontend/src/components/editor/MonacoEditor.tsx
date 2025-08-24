'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useCollaborativeEditor } from '@/lib/useCollaborativeEditor';
import { toast } from 'react-hot-toast';

interface MonacoEditorProps {
  roomId: string;
  initialCode?: string;
  language?: string;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
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

// Monaco Editor types using proper interfaces
interface MonacoEditorInstance {
  updateOptions: (options: {
    fontSize?: number;
    minimap?: { enabled: boolean; side: string; size: string };
    wordWrap?: string;
    readOnly?: boolean;
    automaticLayout?: boolean;
    scrollBeyondLastLine?: boolean;
    renderLineHighlight?: string;
    cursorBlinking?: string;
    cursorSmoothCaretAnimation?: string;
    multiCursorModifier?: string;
    suggestOnTriggerCharacters?: boolean;
    quickSuggestions?: boolean;
    parameterHints?: { enabled: boolean };
    hover?: { enabled: boolean };
    contextmenu?: boolean;
    mouseWheelZoom?: boolean;
    lineNumbers?: string;
    roundedSelection?: boolean;
    formatOnPaste?: boolean;
    formatOnType?: boolean;
    bracketPairColorization?: { enabled: boolean };
    guides?: {
      bracketPairs: boolean;
      indentation: boolean;
      highlightActiveIndentation: boolean;
    };
    renderValidationDecorations?: string;
    find?: {
      addExtraSpaceOnTop: boolean;
      autoFindInSelection: string;
      caseSensitive: string;
      findInSelection: boolean;
      globalFindInSelection: boolean;
      isRegex: boolean;
      matchCase: boolean;
      matchWholeWord: boolean;
      regex: boolean;
      searchScope: null;
      seedSearchStringFromSelection: string;
      useGlobalFindInSelection: boolean;
    };
  }) => void;
  setPosition: (position: { lineNumber: number; column: number }) => void;
  getPosition: () => { lineNumber: number; column: number };
  getValue: () => string;
  setValue: (value: string) => void;
  onDidChangeModelContent: (callback: (event: { changes: Array<{ range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string }> }) => void) => { dispose: () => void };
  onDidChangeCursorPosition: (callback: (event: { position: { lineNumber: number; column: number } }) => void) => { dispose: () => void };
  onDidChangeCursorSelection: (callback: (event: { selection: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }) => void) => { dispose: () => void };
  dispose: () => void;
}

interface MonacoInstance {
  editor: {
    create: (container: HTMLElement, options: Record<string, unknown>) => MonacoEditorInstance;
    defineTheme: (themeName: string, themeData: Record<string, unknown>) => void;
  };
  languages: {
    register: (language: Record<string, unknown>) => void;
    setMonarchTokensProvider: (languageId: string, languageDefinition: Record<string, unknown>) => void;
  };
  Uri: {
    parse: (value: string) => { scheme: string; authority: string; path: string; query: string; fragment: string };
    file: (path: string) => { scheme: string; authority: string; path: string; query: string; fragment: string };
  };
}

export function MonacoEditor({ 
  roomId, 
  initialCode = '', 
  language = 'javascript', 
  readOnly = false,
  onCodeChange
}: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const { user } = useAuth();
  
  // Use collaborative editing hook
  const {
    code,
    cursors,
    handleCodeChange: collaborativeCodeChange,
    updateCursorPosition
  } = useCollaborativeEditor(roomId, initialCode, language);
  
  // Local state for UI
  const [isLoading, setIsLoading] = useState(true);
  
  // Force dark theme
  const currentTheme = 'vs-dark';
  
  const { socket } = useSocket();

  // Listen for real-time code updates from other users
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for code changes from other users
    const handleCodeUpdate = (data: { code: string; language?: string; userId: string; userName: string; roomId: string; timestamp: number }) => {
      console.log('📝 Code update received from:', data.userName);
      
      // Only update if the change is from another user
      if (data.userId !== user.id) {
        collaborativeCodeChange(data.code);
        if (data.language) {
          // This part of the logic needs to be managed by the collaborative editor hook
          // For now, we'll just log the language change
          console.log('🌐 Language change received from:', data.userName);
          toast.success(`Language changed to ${data.language} by ${data.userName}`);
        }
        
        // Show notification
        toast.success(`Code updated by ${data.userName}`);
      }
    };

    // Listen for language changes from other users
    const handleLanguageChange = (data: { language: string; userId: string; userName: string; roomId: string; timestamp: number }) => {
      console.log('🌐 Language change received from:', data.userName);
      
      // Only update if the change is from another user
      if (data.userId !== user.id) {
        // This part of the logic needs to be managed by the collaborative editor hook
        // For now, we'll just log the language change
        console.log('🌐 Language change received from:', data.userName);
        toast.success(`Language changed to ${data.language} by ${data.userName}`);
      }
    };

    // Listen for cursor position updates from other users
    const handleCursorPosition = (data: CursorPosition) => {
      if (data.userId !== user.id) {
        // Transform CursorPosition to the expected format
        const cursorData = {
          lineNumber: data.position.lineNumber,
          column: data.position.column
        };
        updateCursorPosition(cursorData);
      }
    };

    // Listen for user leaving
    const handleUserLeft = () => {
      // Clear any user-specific data
      console.log('👋 User left, clearing cursor positions');
    };

    // Add event listeners
    socket.on('code:updated', handleCodeUpdate);
    socket.on('code:language-changed', handleLanguageChange);
    socket.on('cursor-position', handleCursorPosition);
    socket.on('user-left', handleUserLeft);

    // Cleanup event listeners
    return () => {
      socket.off('code:updated', handleCodeUpdate);
      socket.off('code:language-changed', handleLanguageChange);
      socket.off('cursor-position', handleCursorPosition);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, user, collaborativeCodeChange, updateCursorPosition]);

  // Initialize Monaco Editor
  const handleEditorDidMount = useCallback((editor: MonacoEditorInstance, monacoInstance: MonacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    setIsLoading(false);

    // Configure editor options
    const editorOptions = {
      fontSize: 14,
      minimap: { 
        enabled: true,
        side: 'right',
        size: 'proportional'
      },
      wordWrap: 'off',
      readOnly: readOnly,
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
      lineNumbers: 'on',
      roundedSelection: false,
      formatOnPaste: true,
      formatOnType: true,
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
        highlightActiveIndentation: true
      },
      renderValidationDecorations: 'on',
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
    };

    editor.updateOptions(editorOptions);

    // Only add socket listeners if socket is available
    if (!socket) return;

    // Listen for code changes from other users
    socket.on('code-change', (data: CodeChange) => {
      if (data.userId !== user?.id) {
        // Handle remote code changes
        // This is now managed by the collaborative editing hook
      }
    });

    // Listen for cursor positions from other users
    socket.on('cursor-position', (data: CursorPosition) => {
      if (data.userId !== user?.id) {
        // Transform CursorPosition to the expected format
        const cursorData = {
          lineNumber: data.position.lineNumber,
          column: data.position.column
        };
        updateCursorPosition(cursorData);
      }
    });

    // Listen for user disconnect
    socket.on('user-left', () => {
      // Handle user leaving - cursor cleanup is managed by the hook
    });

    // Listen for language changes
    socket.on('language-change', (data: { language: string; userId: string }) => {
      if (data.userId !== user?.id) {
        // Language changes are now managed by the collaborative editing hook
      }
    });

    return () => {
      if (socket) {
      socket.off('code-change');
      socket.off('cursor-position');
      socket.off('user-left');
      socket.off('language-change');
      }
    };
  }, [socket, user, updateCursorPosition, readOnly]);

  // Handle code change with proper type checking and parent callback
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      collaborativeCodeChange(value);
      // Also call parent callback if provided
      onCodeChange?.(value);
    }
  }, [collaborativeCodeChange, onCodeChange]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Monaco Editor - Full height without toolbar */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-2 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Loading editor...</span>
            </div>
          </div>
        )}

        <Editor
          height="100%"
          language={language}
          theme={currentTheme}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
            fontSize: 14,
            minimap: { 
              enabled: true,
              side: 'right',
              size: 'proportional'
            },
            wordWrap: 'off',
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
            lineNumbers: 'on',
            roundedSelection: false,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
              highlightActiveIndentation: true
            },
            renderValidationDecorations: 'on',
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
