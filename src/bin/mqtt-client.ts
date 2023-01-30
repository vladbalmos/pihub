import { AsyncMqttClient, connectAsync, IClientPublishOptions, IClientSubscribeOptions  } from "async-mqtt";
import config from "../config";
import fs from 'fs';

const deviceRequestTopic = 'vb/devices/power/pihub/request';
const deviceResponseTopic = 'vb/devices/power/pihub/response';

async function run() {
    const client = await connectAsync(config.mqtt.host);
    
    client.on('connect', () => {
        console.log('on connect');
    })
    client.on('reconnect', () => {
        console.log('on reconnect');
    })
    client.on('close', () => {
        console.log('on close');
    })
    client.on('disconnect', () => {
        console.log('on disconnect');
    })
    client.on('offline', () => {
        console.log('on offline');
    })
    client.on('error', (err) => {
        console.log('on error');
        console.error(err);
    })
    client.on('end', () => {
        console.log('on end');
    })

    client.on('message', async (topic, message: any) => {
        message = JSON.parse(message);

        if (topic === config.mqtt.requestTopic) {
            await client.publish(config.mqtt.responseTopic, JSON.stringify({
                request: 'registration', requestTopic: deviceRequestTopic,
                responseTopic: deviceResponseTopic,
                state: JSON.parse(fs.readFileSync(`${__dirname}/../../data/template.json`).toString())
            }));
            return;
        }
        
        if (topic === deviceRequestTopic) {
            await client.publish(deviceResponseTopic, JSON.stringify(message.payload));
            return;
        }
    })
    
    await client.subscribe([config.mqtt.requestTopic, deviceRequestTopic]);
}

run();