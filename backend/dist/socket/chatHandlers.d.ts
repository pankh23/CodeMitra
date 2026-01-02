import { AuthenticatedSocket, Server } from './types';
export declare const setupChatHandlers: (io: Server, socket: AuthenticatedSocket, isUserInRoom: (userId: string, roomId: string) => Promise<boolean>) => void;
//# sourceMappingURL=chatHandlers.d.ts.map