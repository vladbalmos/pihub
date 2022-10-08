import dgram from 'node:dgram';

const client = dgram.createSocket('udp4');
client.on('listening', () => {
    client.setBroadcast(true);
    const msg = JSON.stringify({
        question: "whereareyou",
    });
    client.send(msg, 0, msg.length, 6000);
})
client.on('message', (msg, rinfo) => {
    console.log(JSON.parse(msg.toString()));
    console.log(rinfo);
    process.exit(1);
});
client.on('error', (e) => {
    console.error(e);
})
client.bind();