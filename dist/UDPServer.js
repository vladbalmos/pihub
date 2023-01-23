"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_dgram_1 = __importDefault(require("node:dgram"));
const node_stream_1 = require("node:stream");
const node_os_1 = require("node:os");
class UDPServer extends node_stream_1.EventEmitter {
    constructor(port, httpPort) {
        super();
        this.port = port;
        this.httpPort = httpPort;
        this.socket = node_dgram_1.default.createSocket('udp4');
        this.localAddress = '0.0.0.0';
    }
    initialize() {
        this.socket.on('error', (e) => {
            this.emit('error', e);
        });
        this.socket.on('message', (msg, rinfo) => {
            const strmsg = msg.toString();
            if (strmsg !== 'request:whereareyou') {
                console.warn("Invalid message:", strmsg);
                return;
            }
            const response = `hub@:${this.localAddress}:${this.httpPort}`;
            console.log(strmsg);
            console.log(rinfo);
            this.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
        });
        return new Promise((resolve, reject) => {
            this.socket.on('listening', () => __awaiter(this, void 0, void 0, function* () {
                const address = this.getLocalAddress();
                if (!address) {
                    reject(new Error('Unable to find local ip address'));
                }
                this.localAddress = address;
                resolve(address);
            }));
            this.socket.bind(this.port);
        });
    }
    getLocalAddress() {
        const nets = (0, node_os_1.networkInterfaces)();
        for (const iface in nets) {
            if (iface === 'lo') {
                continue;
            }
            const addresses = nets[iface];
            if (!addresses) {
                continue;
            }
            for (const addr of addresses) {
                if (addr.family === 'IPv6' || addr.internal) {
                    continue;
                }
                if (addr.address.slice(0, 3) === '192') {
                    return addr.address;
                }
            }
        }
        ;
        return null;
    }
}
exports.default = UDPServer;
