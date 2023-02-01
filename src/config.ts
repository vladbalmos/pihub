export default {
    http: {
        domain: process.env['HTTP_DOMAIN'] || 'pc.local',
        port: parseInt(process.env['HTTP_PORT'] || '3000', 10),
    },
    mqtt: {
        host: 'tcp://pc.local:1883',
        requestTopic: 'vb/devices/request',
        responseTopic: 'vb/devices/response',
    },
    datadir: process.env['DATA_DIR'] || `${__dirname}/../data`
}