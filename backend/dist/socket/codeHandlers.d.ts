import { AuthenticatedSocket, Server } from './types';
declare const codeExecutionQueue: any;
export declare const setupCodeHandlers: (io: Server, socket: AuthenticatedSocket, isUserInRoom: (userId: string, roomId: string) => Promise<boolean>) => void;
export { codeExecutionQueue };
//# sourceMappingURL=codeHandlers.d.ts.map