import EventEmitter from "events";
import { AsyncMqttClient, connectAsync, IClientPublishOptions, IClientSubscribeOptions  } from "async-mqtt";

export default class MQTT extends EventEmitter{
    
    private client?: AsyncMqttClient;
    
    private host: string;
    
    private requestTopic: string;
    
    private responseTopic: string;
    
    private subscriptionOptions: IClientSubscribeOptions;
    
    private publishingOptions: IClientPublishOptions;
    
    private deviceTopics: string[] = [];
    
    constructor(options: {
        host: string,
        requestTopic: string,
        responseTopic: string
    }, devicesTopics: string[]) {
        super();
        this.host = options.host;
        this.requestTopic = options.requestTopic;
        this.responseTopic = options.responseTopic;
        this.deviceTopics = devicesTopics;
        
        this.subscriptionOptions = {
            qos: 1,
        }
        
        this.publishingOptions = {
            qos: 1
        }
    }
    
    async initialize() {
        this.client = await connectAsync(this.host);
        
        await this.subscribeToMainTopic()
        await this.discover();
        console.log('MQTT initialized');
    }
    
    subscribeToMainTopic() {
        this.client?.on('message', async (topic: string, message: any) => {
            try {
                message = JSON.parse(message.toString());
            } catch (e) {
                return;
            }
            
            if (topic === this.responseTopic) {
                if (!message.requestTopic || !message.responseTopic || !message.state) {
                    console.error('Invalid registration payload');
                    console.log(message)
                    return;
                }

                if (this.deviceTopics.indexOf(message.responseTopic) === -1) {
                    this.deviceTopics.push(message.responseTopic);
                }
                await this.client?.subscribe(message.responseTopic, this.subscriptionOptions);
                this.emit('device:registration', {
                    requestTopic: message.requestTopic,
                    responseTopic: message.responseTopic,
                    state: message.state
                });
                return;
            }
            
            if (this.deviceTopics.indexOf(topic) === -1) {
                return;
            }
            
            this.emit('device:update', message);
        });
        const topics = [this.responseTopic, ...this.deviceTopics];
        console.log('Subscribing to', topics)
        return this.client?.subscribe(topics, this.subscriptionOptions);
    }
    
    publishStateUpdateRequest(data: { topic: string, payload: any}) {
        return this.publishToClient(data.topic, data.payload);
    }
    
    publishToClient(topic, payload) {
        return this.client?.publish(topic, JSON.stringify({
            request: 'state-update',
            payload
        }), {
            ...this.publishingOptions,
            retain: true
        });
    }
    
    discover() {
        return this.client?.publish(this.requestTopic, JSON.stringify({
            request: 'presence',
        }), this.publishingOptions);
    }
    
}