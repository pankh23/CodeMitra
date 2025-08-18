"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../utils/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../utils/validation");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const authRoutes = express_1.default.Router();
exports.authRoutes = authRoutes;
authRoutes.post('/register', (0, validation_1.validate)(validation_1.registerSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name } = req.body;
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    const hashedPassword = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    });
    const token = (0, jwt_1.generateToken)(user);
    return res.status(201).json({ success: true, token, user });
}));
authRoutes.post('/login', (0, validation_1.validate)(validation_1.loginSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !(await (0, password_1.comparePassword)(password, user.password))) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = (0, jwt_1.generateToken)(user);
    return res.status(200).json({ success: true, token, user });
}));
authRoutes.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    return res.status(200).json({ success: true, user: req.user });
}));
//# sourceMappingURL=auth.js.map