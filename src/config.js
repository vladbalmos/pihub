"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    http: {
        domain: process.env['HTTP_DOMAIN'] || 'pc.local',
        port: parseInt(process.env['HTTP_PORT'] || '3000', 10),
    },
    udp: {
        port: parseInt(process.env['UDP_PORT'] || '6000', 10),
    },
    datadir: process.env['DATA_DIR'] || `${__dirname}/../data`
};
