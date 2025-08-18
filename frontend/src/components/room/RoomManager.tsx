'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/lib/socket';
import { useRoom, CreateRoomData } from '@/lib/room';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Room } from '@/types';
import { 
  Plus, 
  Users, 
  Clock, 
  Code, 
  LogOut, 
  UserPlus, 
  Copy,
  Check,
  Globe,
  AlertCircle
} from 'lucide-react';

export default function RoomManager() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { currentRoom, joinRoom, leaveRoom, createRoom } = useRoom();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    language: 'javascript',
    maxUsers: 10,
    isPublic: true,
    password: ''
  });

  // Form validation states
  const [formErrors, setFormErrors] = useState({
    name: '',
    password: '',
    maxUsers: ''
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
          maxUsers: 10,
          isPublic: true,
          password: ''
        });
        setFormErrors({
          name: '',
          password: '',
          maxUsers: ''
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset form errors
    setFormErrors({
      name: '',
      password: '',
      maxUsers: ''
    });

    // Validate form fields
    let hasErrors = false;
    const errors = {
      name: '',
      password: '',
      maxUsers: ''
    };

    // Name validation (minimum 3 characters)
    if (!newRoom.name.trim()) {
      errors.name = 'Room name is required';
      hasErrors = true;
    } else if (newRoom.name.trim().length < 3) {
      errors.name = 'Room name must be at least 3 characters long';
      hasErrors = true;
    } else if (newRoom.name.trim().length > 100) {
      errors.name = 'Room name cannot exceed 100 characters';
      hasErrors = true;
    }

    // Password validation (minimum 4 characters, required only for private rooms)
    if (!newRoom.isPublic) {
      if (!newRoom.password.trim()) {
        errors.password = 'Room password is required for private rooms';
        hasErrors = true;
      } else if (newRoom.password.trim().length < 4) {
        errors.password = 'Room password must be at least 4 characters long';
        hasErrors = true;
      } else if (newRoom.password.trim().length > 50) {
        errors.password = 'Room password cannot exceed 50 characters';
        hasErrors = true;
      }
    }

    // Max users validation
    if (newRoom.maxUsers < 2) {
      errors.maxUsers = 'Room must allow at least 2 users';
      hasErrors = true;
    } else if (newRoom.maxUsers > 50) {
      errors.maxUsers = 'Room cannot exceed 50 users';
      hasErrors = true;
    }

    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    // Prepare payload - exclude password for public rooms
    const roomData: any = {
      name: newRoom.name.trim(),
      description: newRoom.description.trim(),
      isPublic: newRoom.isPublic,
      maxUsers: newRoom.maxUsers,
      language: newRoom.language
    };

    // Only include password for private rooms
    if (!newRoom.isPublic && newRoom.password.trim()) {
      roomData.password = newRoom.password.trim();
    }

    try {
      await createRoom(roomData);
      // Reset form on successful creation
      setNewRoom({
        name: '',
        description: '',
        language: 'javascript',
        maxUsers: 10,
        isPublic: true,
        password: ''
      });
      setFormErrors({
        name: '',
        password: '',
        maxUsers: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      // Error handling is done in the useRoom hook
    }
  };

  const handleJoinRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowPasswordPrompt(true);
  };

  const handleJoinWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoomId && joinRoomPassword) {
      try {
        await joinRoom(selectedRoomId, joinRoomPassword);
        setShowPasswordPrompt(false);
        setJoinRoomPassword('');
        setSelectedRoomId('');
      } catch (error) {
        // Error handling is done in the useRoom hook
      }
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      leaveRoom(currentRoom.id);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      setSelectedRoomId(joinRoomId);
      setShowPasswordPrompt(true);
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
              <span>{currentRoom.users?.length || 0}/{currentRoom.maxUsers}</span>
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
            variant="danger"
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinRoomId(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewRoom(prev => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder="Enter room name (min 3 characters)"
                  className={formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {formErrors.name && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formErrors.name}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="room-description">Description (optional)</Label>
                <Input
                  id="room-description"
                  value={newRoom.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
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
                    <option value="c">C</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="room-max-users">Max Users</Label>
                  <Input
                    id="room-max-users"
                    type="number"
                    min="2"
                    max="50"
                    value={newRoom.maxUsers}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewRoom(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 2 }));
                      if (formErrors.maxUsers) {
                        setFormErrors(prev => ({ ...prev, maxUsers: '' }));
                      }
                    }}
                    className={formErrors.maxUsers ? 'border-red-500' : ''}
                  />
                  {formErrors.maxUsers && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.maxUsers}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="room-public"
                      checked={newRoom.isPublic}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setNewRoom(prev => ({ 
                          ...prev, 
                          isPublic: e.target.checked,
                          // Clear password when switching to public
                          password: e.target.checked ? '' : prev.password
                        }));
                        // Clear password errors when switching to public
                        if (e.target.checked && formErrors.password) {
                          setFormErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <Label htmlFor="room-public" className="text-sm font-medium">
                        Public Room
                      </Label>
                      <p className="text-gray-500 text-xs">
                        {newRoom.isPublic 
                          ? 'Anyone can join with room code' 
                          : 'Password required to join'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant={newRoom.isPublic ? "default" : "secondary"}>
                    {newRoom.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>

              {/* Conditional Password Field - Only show for private rooms */}
              {!newRoom.isPublic && (
                <div className="space-y-2">
                  <Label htmlFor="room-password" className="flex items-center gap-2">
                    Room Password *
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="room-password"
                    type="password"
                    value={newRoom.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewRoom(prev => ({ ...prev, password: e.target.value }));
                      if (formErrors.password) {
                        setFormErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="Enter room password (min 4 characters)"
                    className={formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    required
                  />
                  {formErrors.password && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{formErrors.password}</span>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs">
                    Password must be 4-50 characters long and is required for private room access
                  </p>
                </div>
              )}

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
                      {!room.isPublic && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{room.users?.length || 0}/{room.maxUsers}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(room.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.users.length >= room.maxUsers}
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

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Enter Room Password</h3>
            <form onSubmit={handleJoinWithPassword} className="space-y-4">
              <div>
                <Label htmlFor="join-password">Password</Label>
                <Input
                  id="join-password"
                  type="password"
                  value={joinRoomPassword}
                  onChange={(e) => setJoinRoomPassword(e.target.value)}
                  placeholder="Enter room password"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setJoinRoomPassword('');
                    setSelectedRoomId('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Join Room</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
