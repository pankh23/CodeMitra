'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';

interface Message {
  id: string;
  text: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  type: 'text' | 'code' | 'file';
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  isTyping: boolean;
}

interface ChatMessageData {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  type?: 'text' | 'code' | 'file';
}

interface UserData {
  id: string;
  name: string;
  avatar?: string;
}

interface EnhancedChatInterfaceProps {
  roomId?: string;
}

export function EnhancedChatInterface({ }: EnhancedChatInterfaceProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !currentRoom) return;

    // Listen for new messages
    socket.on('chat:message-received', (data: { message: ChatMessageData }) => {
      const newMessage: Message = {
        id: data.message.id,
        text: data.message.content,
        sender: {
          id: data.message.user.id,
          name: data.message.user.name,
          avatar: data.message.user.avatar
        },
        timestamp: new Date(data.message.createdAt),
        type: data.message.type || 'text',
        status: 'delivered'
      };
      setMessages(prev => [...prev, newMessage]);
    });

    // Listen for user presence updates
    socket.on('room:users', (data: { users: UserData[] }) => {
      const users = data.users.map((roomUser: UserData) => ({
        id: roomUser.id,
        name: roomUser.name,
        avatar: roomUser.avatar,
        isOnline: true,
        isTyping: false
      }));
      setActiveUsers(users);
    });

    // Listen for typing indicators
    socket.on('chat:user-typing', (data: { userId: string; userName: string }) => {
      setActiveUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, isTyping: true } : u
      ));
    });

    // Listen for typing stop
    socket.on('chat:user-stopped-typing', (data: { userId: string; userName: string }) => {
      setActiveUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, isTyping: false } : u
      ));
    });

    // Listen for message status updates
    socket.on('chat:message-status', (data: { messageId: string; status: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, status: data.status as 'sending' | 'sent' | 'delivered' | 'read' } : msg
      ));
    });

    // Listen for chat history
    socket.on('chat:history', (data: { messages: ChatMessageData[]; pagination: { page: number; limit: number; total: number; pages: number } }) => {
      const formattedMessages: Message[] = data.messages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: {
          id: msg.user.id,
          name: msg.user.name,
          avatar: msg.user.avatar
        },
        timestamp: new Date(msg.createdAt),
        type: msg.type || 'text',
        status: 'delivered'
      }));
      setMessages(formattedMessages);
    });

    // Listen for message deletions
    socket.on('chat:message-deleted', (data: { messageId: string; deletedBy: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });

    // Listen for message edits
    socket.on('chat:message-edited', (data: { message: ChatMessageData }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.message.id ? {
          ...msg,
          text: data.message.content
        } : msg
      ));
    });

    // Load chat history
    socket.emit('chat:get-history', { roomId: currentRoom.id });

    return () => {
      socket.off('chat:message-received');
      socket.off('room:users');
      socket.off('chat:user-typing');
      socket.off('chat:user-stopped-typing');
      socket.off('chat:message-status');
      socket.off('chat:history');
      socket.off('chat:message-deleted');
      socket.off('chat:message-edited');
    };
  }, [socket, isConnected, currentRoom]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected || !currentRoom) return;

    const message: Message = {
      id: `temp-${Date.now()}`,
      text: newMessage.trim(),
      sender: {
        id: user?.id || '',
        name: user?.name || 'Unknown',
        avatar: user?.avatar
      },
      timestamp: new Date(),
      type: 'text',
      status: 'sending'
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Send message via WebSocket
    socket.emit('chat:send-message', {
      roomId: currentRoom.id,
      content: message.text,
      type: 'text'
    });

    // Stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('chat:typing-stop', { roomId: currentRoom.id });
    setIsTyping(false);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!socket || !isConnected || !currentRoom) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('chat:typing-start', { roomId: currentRoom.id });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('chat:typing-stop', { roomId: currentRoom.id });
    }, 1000);
  };

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage();
    }
  };

  // Handle code submission
  const handleCodeSubmit = () => {
    if (codeInput.trim()) {
      const codeMessage = `\`\`\`${codeLanguage}\n${codeInput}\n\`\`\``;
      setNewMessage(codeMessage);
      sendMessage();
      setCodeInput('');
      setShowCodeInput(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'text/plain', 'text/markdown', 'text/css', 'text/javascript',
        'application/json', 'application/xml', 'application/pdf',
        'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not supported');
        return;
      }
      
      setSelectedFile(file);
      setShowFileUpload(true);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !socket || !isConnected || !currentRoom || !user) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate file upload with progress
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        // Simulate chunk upload delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const progress = ((i + 1) / totalChunks) * 100;
        setUploadProgress(progress);
      }
      
      // Create file message
      const fileMessage = `📎 ${selectedFile.name}`;
      setNewMessage(fileMessage);
      sendMessage();
      
      // Reset file state
      setSelectedFile(null);
      setShowFileUpload(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />;
      case 'sent':
        return <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full" />;
      case 'delivered':
        return <div className="w-3 h-3 border-2 border-blue-500 rounded-full" />;
      case 'read':
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.sender.id === user?.id ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-end space-x-2 ${message.sender.id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {message.sender.id !== user?.id && (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback className="text-xs">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`px-3 py-2 rounded-lg ${
                    message.sender.id === user?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    {message.sender.id !== user?.id && (
                      <div className="text-xs font-medium mb-1 opacity-75">
                        {message.sender.name}
                      </div>
                    )}
                    
                    {message.type === 'code' ? (
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        <code>{message.text}</code>
                      </pre>
                    ) : (
                      <div className="text-sm">{message.text}</div>
                    )}
                    
                    <div className={`flex items-center justify-between mt-1 text-xs opacity-75 ${
                      message.sender.id === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.timestamp)}</span>
                      {message.sender.id === user?.id && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing indicators */}
        {activeUsers.filter(u => u.isTyping && u.id !== user?.id).map(user => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Code Input Area */}
      {showCodeInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3"
        >
          <div className="flex items-center space-x-2">
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <Button
              size="sm"
              onClick={handleCodeSubmit}
              className="px-3 py-1 text-xs"
            >
              Send Code
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCodeInput(false)}
              className="px-3 py-1 text-xs"
            >
              Cancel
            </Button>
          </div>
          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Enter your code here..."
            className="w-full h-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono resize-none"
          />
        </motion.div>
      )}

      {/* Message Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => {
                handleTyping(e.target.value);
              }}
              placeholder="Type a message..."
              className="pr-20"
            />
            
            {/* Quick Action Buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Code2 className="w-3 h-3" />
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Paperclip className="w-3 h-3" />
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Smile className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <Button type="submit" size="sm" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* File Upload Input */}
        {showFileUpload && (
          <input
            type="file"
            onChange={handleFileSelect}
            className="mt-2 w-full text-sm"
            accept="image/*,.pdf,.doc,.docx,.txt,.js,.py,.java,.cpp"
          />
        )}
      </div>

        {/* File Upload Modal */}
        {showFileUpload && selectedFile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowFileUpload(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Upload File</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    📎
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFileUpload(false);
                      setSelectedFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-10"
          >
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {[
                '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
                '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
                '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
                '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
                '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
                '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
                '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
                '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲',
                '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮',
                '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '💩', '👻',
                '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼',
                '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💌',
                '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟',
                '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜',
                '🖤', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️',
                '💬', '🗨️', '🗯️', '💭', '💤', '🌟', '✨', '⭐'
              ].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
    </div>
  );
}
