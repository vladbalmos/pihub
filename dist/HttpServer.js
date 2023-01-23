"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const events_1 = __importDefault(require("events"));
class HttpServer extends events_1.default {
    constructor(port) {
        super();
        const app = (0, express_1.default)();
        this.app = app;
        this.port = port;
        this.initExpressApp();
    }
    initExpressApp() {
        this.app.set('port', this.port);
        this.app.set('view engine', 'ejs');
        this.app.set('views', `${__dirname}/../src/views`);
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded());
    }
    setRouter(fn) {
        fn(this.app, this.asyncMiddleware);
    }
    initialize() {
        const server = (0, http_1.createServer)(this.app);
        return new Promise((resolve, reject) => {
            let listening = false;
            server.on('listening', () => {
                listening = true;
                resolve();
            });
            server.on('error', (e) => {
                console.error(e);
                if (!listening) {
                    return reject(e);
                }
                this.emit('error', e);
            });
            server.on('close', () => {
                listening = false;
                this.emit('close');
            });
            server.listen(this.port);
        });
    }
    asyncMiddleware(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next))
                .catch((e) => { console.error(e); next(e); });
        };
    }
}
exports.default = HttpServer;
