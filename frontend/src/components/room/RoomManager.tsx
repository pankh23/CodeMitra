'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocket } from '@/lib/contexts/SocketContext';
import { useRoom } from '@/lib/contexts/RoomContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Users, 
  Clock, 
  Code, 
  LogOut, 
  UserPlus, 
  Copy,
  Check,
  Globe
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description?: string;
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
  language: string;
}

export default function RoomManager() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { currentRoom, joinRoom, leaveRoom, createRoom } = useRoom();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    language: 'javascript',
    maxParticipants: 10,
    isPrivate: false
  });

  useEffect(() => {
    if (socket) {
      socket.emit('getRooms');
      socket.on('roomsList', (roomsList: Room[]) => {
        setRooms(roomsList);
      });

      socket.on('roomCreated', (room: Room) => {
        setRooms(prev => [...prev, room]);
        setShowCreateForm(false);
        setNewRoom({
          name: '',
          description: '',
          language: 'javascript',
          maxParticipants: 10,
          isPrivate: false
        });
      });

      socket.on('roomUpdated', (updatedRoom: Room) => {
        setRooms(prev => prev.map(room => 
          room.id === updatedRoom.id ? updatedRoom : room
        ));
      });

      socket.on('roomDeleted', (roomId: string) => {
        setRooms(prev => prev.filter(room => room.id !== roomId));
      });

      return () => {
        socket.off('roomsList');
        socket.off('roomCreated');
        socket.off('roomUpdated');
        socket.off('roomDeleted');
      };
    }
  }, [socket]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoom.name.trim()) {
      createRoom(newRoom);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      joinRoom(joinRoomId);
      setJoinRoomId('');
    }
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (currentRoom) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Current Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{currentRoom.name}</h3>
            {currentRoom.description && (
              <p className="text-sm text-gray-600 mt-1">{currentRoom.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{currentRoom.participantCount}/{currentRoom.maxParticipants}</span>
            </div>
            <Badge variant="secondary">
              {currentRoom.language}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="room-code" className="text-sm font-medium">
              Room Code:
            </Label>
            <div className="flex items-center gap-2 flex-1">
              <Input
                id="room-code"
                value={currentRoom.id}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomCode}
                className="flex items-center gap-1"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleLeaveRoom}
            variant="destructive"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Leave Room
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Room Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Join by Code */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Join Room by Code
          </h3>
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <Input
              placeholder="Enter room code"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!joinRoomId.trim()}>
              Join
            </Button>
          </form>
        </div>

        <Separator />

        {/* Create Room */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Room
            </h3>
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'New Room'}
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter room name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="room-description">Description (optional)</Label>
                <Input
                  id="room-description"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter room description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="room-language">Language</Label>
                  <select
                    id="room-language"
                    value={newRoom.language}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="room-max-participants">Max Participants</Label>
                  <Input
                    id="room-max-participants"
                    type="number"
                    min="2"
                    max="50"
                    value={newRoom.maxParticipants}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-private"
                  checked={newRoom.isPrivate}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, isPrivate: e.target.checked }))}
                />
                <Label htmlFor="room-private">Private Room</Label>
              </div>

              <Button type="submit" className="w-full">
                Create Room
              </Button>
            </form>
          )}
        </div>

        <Separator />

        {/* Available Rooms */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Available Rooms
          </h3>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No rooms available</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{room.name}</h4>
                      <Badge variant="outline">{room.language}</Badge>
                      {room.isPrivate && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{room.participantCount}/{room.maxParticipants}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(room.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.participantCount >= room.maxParticipants}
                    size="sm"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
