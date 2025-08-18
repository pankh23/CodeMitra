interface Server {
    to(room: string): any;
    [key: string]: any;
}
interface AuthenticatedSocket {
    userId?: string;
    user?: {
        name?: string;
    };
    on(event: string, handler: Function): void;
    emit(event: string, data: any): void;
    to(room: string): any;
    join?(room: string): void;
    leave?(room: string): void;
    [key: string]: any;
}
import { Queue } from 'bullmq';
declare const codeExecutionQueue: Queue<any, any, string, any, any, string>;
export declare const setupCodeHandlers: (io: Server, socket: AuthenticatedSocket) => void;
export { codeExecutionQueue };
//# sourceMappingURL=codeHandlers.d.ts.map