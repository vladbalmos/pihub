"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.splat(), winston_1.default.format.json()),
    handleExceptions: true,
    handleRejections: true,
    transports: [
        new winston_1.default.transports.File({ filename: 'pihub.log' })
    ]
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        handleRejections: true,
        handleExceptions: true,
        format: winston_1.default.format.combine(winston_1.default.format.splat(), winston_1.default.format.simple()),
    }));
}
exports.default = logger;
