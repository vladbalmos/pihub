"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_dgram_1 = __importDefault(require("node:dgram"));
const client = node_dgram_1.default.createSocket('udp4');
client.on('listening', () => {
    client.setBroadcast(true);
    const msg = JSON.stringify({
        question: "whereareyou",
    });
    client.send(msg, 0, msg.length, 6000);
});
client.on('message', (msg, rinfo) => {
    console.log(JSON.parse(msg.toString()));
    console.log(rinfo);
    process.exit(1);
});
client.on('error', (e) => {
    console.error(e);
});
client.bind();
