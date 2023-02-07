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
const events_1 = __importDefault(require("events"));
const async_mqtt_1 = require("async-mqtt");
const logger_1 = __importDefault(require("./logger"));
class MQTT extends events_1.default {
    constructor(options, devicesTopics) {
        super();
        this.deviceTopics = [];
        this.host = options.host;
        this.requestTopic = options.requestTopic;
        this.responseTopic = options.responseTopic;
        this.deviceTopics = devicesTopics;
        this.subscriptionOptions = {
            qos: 1,
        };
        this.publishingOptions = {
            qos: 1
        };
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.client = yield (0, async_mqtt_1.connectAsync)(this.host);
            yield this.subscribeToMainTopic();
            yield this.discover();
            logger_1.default.info('MQTT initialized');
        });
    }
    subscribeToMainTopic() {
        var _a, _b;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.on('message', (topic, message) => __awaiter(this, void 0, void 0, function* () {
            var _c;
            try {
                message = JSON.parse(message.toString());
            }
            catch (e) {
                return;
            }
            if (topic === this.responseTopic) {
                if (!message.requestTopic || !message.responseTopic || !message.state) {
                    logger_1.default.error('Invalid registration payload');
                    logger_1.default.info(message);
                    return;
                }
                if (this.deviceTopics.indexOf(message.responseTopic) === -1) {
                    this.deviceTopics.push(message.responseTopic);
                }
                yield ((_c = this.client) === null || _c === void 0 ? void 0 : _c.subscribe(message.responseTopic, this.subscriptionOptions));
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
        }));
        const topics = [this.responseTopic, ...this.deviceTopics];
        logger_1.default.info('Subscribing to %s', topics);
        return (_b = this.client) === null || _b === void 0 ? void 0 : _b.subscribe(topics, this.subscriptionOptions);
    }
    publishStateUpdateRequest(data) {
        return this.publishToClient(data.topic, data.payload);
    }
    publishToClient(topic, payload) {
        var _a;
        return (_a = this.client) === null || _a === void 0 ? void 0 : _a.publish(topic, JSON.stringify({
            request: 'state-update',
            payload
        }), Object.assign(Object.assign({}, this.publishingOptions), { retain: true }));
    }
    discover() {
        var _a;
        return (_a = this.client) === null || _a === void 0 ? void 0 : _a.publish(this.requestTopic, JSON.stringify({
            request: 'presence',
        }), this.publishingOptions);
    }
}
exports.default = MQTT;
