export default {
    http: {
        port: parseInt(process.env['HTTP_PORT'] || '3000', 10),
    },
    udp: {
        port: parseInt(process.env['UDP_PORT'] || '6000', 10),
    },
    datadir: process.env['DATA_DIR'] || `${__dirname}/../data`
}