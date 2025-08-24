import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export interface Server {
  to(room: string): any;
  [key: string]: any;
}

export interface isUserInRoomFunction {
  (userId: string, roomId: string): Promise<boolean>;
}
