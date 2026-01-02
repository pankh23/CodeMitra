export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  password: string;
  isPublic: boolean;
  maxUsers: number;
  language: string;
  code: string;
  input: string;
  output: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: User;
  users: RoomUser[];
  executionLogs: ExecutionLog[];
}

export interface RoomUser {
  id: string;
  userId: string;
  roomId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: User;
  room: Room;
}


export interface ExecutionLog {
  id: string;
  language: string;
  code: string;
  input?: string;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  userId?: string;
  roomId: string;
  room: Room;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface RoomState {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
}

export interface CodeEditorState {
  code: string;
  language: string;
  input: string;
  output: string;
  isExecuting: boolean;
  error: string | null;
}


export interface SocketEvents {
  // Room events
  'room:join': (data: { roomId: string; userId: string }) => void;
  'room:leave': (data: { roomId: string; userId: string }) => void;
  'room:user-joined': (data: { user: User; roomId: string }) => void;
  'room:user-left': (data: { userId: string; roomId: string }) => void;
  'room:code-update': (data: { code: string; roomId: string; userId: string }) => void;
  'room:language-change': (data: { language: string; roomId: string; userId: string }) => void;
  'room:input-update': (data: { input: string; roomId: string; userId: string }) => void;
  
  // Code execution events
  'code:execute': (data: { code: string; language: string; input: string; roomId: string }) => void;
  'code:execution-result': (data: { output: string; error?: string; executionTime: number; roomId: string }) => void;
  'code:execution-started': (data: { roomId: string }) => void;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  password: string;
  isPublic: boolean;
  maxUsers: number;
  language: string;
}

export interface JoinRoomRequest {
  roomId: string;
  password: string;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  password?: string;
  isPublic?: boolean;
  maxUsers?: number;
  language?: string;
}

export type Language = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby';

export interface LanguageConfig {
  id: Language;
  name: string;
  extension: string;
  monacoLanguage: string;
  defaultCode: string;
  dockerImage: string;
  executeCommand: string;
  compileCommand?: string;
}

export interface ExecutionRequest {
  code: string;
  language: Language;
  input?: string;
  roomId: string;
}

export interface ExecutionResult {
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  status: 'completed' | 'failed' | 'timeout';
}

