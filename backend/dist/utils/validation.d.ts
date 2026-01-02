import Joi from 'joi';
export declare const registerSchema: any;
export declare const loginSchema: any;
export declare const createRoomSchema: any;
export declare const updateRoomSchema: any;
export declare const joinRoomSchema: any;
export declare const executeCodeSchema: any;
export declare const sendMessageSchema: any;
export declare const updateUserSchema: any;
export declare const changePasswordSchema: any;
export declare const validate: (schema: Joi.ObjectSchema) => (req: any, res: any, next: any) => any;
export declare const validateQuery: (schema: Joi.ObjectSchema) => (req: any, res: any, next: any) => any;
export declare const getRoomsQuerySchema: any;
export declare const codeExecutionSchema: any;
//# sourceMappingURL=validation.d.ts.map