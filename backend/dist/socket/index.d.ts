import { Server, Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    user?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}
export declare const setupSocketHandlers: (io: Server) => void;
export declare const getUserSocket: (userId: string) => Promise<string | null>;
export declare const emitToUser: (io: Server, userId: string, event: string, data: any) => Promise<void>;
export declare const emitToRoom: (io: Server, roomId: string, event: string, data: any) => void;
export declare const isUserInRoom: (userId: string, roomId: string) => Promise<boolean>;
//# sourceMappingURL=index.d.ts.map