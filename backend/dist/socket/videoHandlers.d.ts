interface Server {
    to(room: string): any;
    in(room: string): any;
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
    join(room: string): void;
    leave(room: string): void;
    id: string;
    [key: string]: any;
}
export declare const setupVideoHandlers: (io: Server, socket: AuthenticatedSocket) => void;
export {};
//# sourceMappingURL=videoHandlers.d.ts.map