"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const rooms_1 = require("./routes/rooms");
const users_1 = require("./routes/users");
const code_1 = require("./routes/code");
const errorHandler_1 = require("./middleware/errorHandler");
const socket_1 = require("./socket");
const prisma_1 = require("./utils/prisma");
const redis_1 = require("./utils/redis");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    }
});
exports.io = io;
const PORT = process.env.PORT || 5001;
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/rooms', rooms_1.roomRoutes);
app.use('/api/users', users_1.userRoutes);
app.use('/api/code', code_1.codeRoutes);
async function setupSocketIO() {
    try {
        (0, socket_1.setupSocketHandlers)(io);
        console.log('Socket.IO setup completed');
    }
    catch (error) {
        console.error('Failed to setup Socket.IO:', error);
        process.exit(1);
    }
}
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        console.log('Connected to Redis');
        await setupSocketIO();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await redis_1.redisClient.disconnect();
    await prisma_1.prisma.$disconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
startServer();
//# sourceMappingURL=index.js.map