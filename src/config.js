"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    http: {
        domain: process.env['HTTP_DOMAIN'] || 'pc.local',
        port: parseInt(process.env['HTTP_PORT'] || '3000', 10),
    },
    mqtt: {
        host: process.env['MQTT_HOST'] || 'tcp://localhost:1883',
        requestTopic: 'vb/devices/request',
        responseTopic: 'vb/devices/response',
    },
    datadir: process.env['DATA_DIR'] || `${__dirname}/../data`
};
