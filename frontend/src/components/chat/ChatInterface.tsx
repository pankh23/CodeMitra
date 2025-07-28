'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/room';
import ChatRoom from './ChatRoom';
import { ChatMessageProps } from './ChatMessage';

export default function ChatInterface() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isTyping, setIsTyping] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for incoming messages
    socket.on('message', (message: ChatMessageProps) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('userTyping', (data: { userId: string; isTyping: boolean }) => {
      setIsTyping(prev => {
        if (data.isTyping) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter(id => id !== data.userId);
        }
      });
    });

    // Listen for message history
    socket.on('messageHistory', (history: ChatMessageProps[]) => {
      setMessages(history);
    });

    // Request message history when joining
    if (currentRoom) {
      socket.emit('requestMessageHistory', currentRoom);
    }

    return () => {
      socket.off('message');
      socket.off('userTyping');
      socket.off('messageHistory');
    };
  }, [socket, isConnected, currentRoom]);

  const sendMessage = (content: string) => {
    if (!socket || !user || !currentRoom) return;

    const message: ChatMessageProps = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      content,
      timestamp: new Date(),
      type: 'user',
      avatar: user.avatar
    };

    socket.emit('sendMessage', {
      roomId: currentRoom,
      message
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!socket || !user || !currentRoom) return;

    socket.emit('typing', {
      roomId: currentRoom,
      userId: user.id,
      isTyping
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to use chat</p>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Join a room to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <ChatRoom
          messages={messages}
          currentUser={user.id}
          onSendMessage={sendMessage}
        />
      </div>
      
      {isTyping.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 border-t dark:border-gray-700">
          {isTyping.length === 1 
            ? `${isTyping[0]} is typing...` 
            : `${isTyping.length} people are typing...`}
        </div>
      )}
    </div>
  );
}
