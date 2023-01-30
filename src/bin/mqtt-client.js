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
const async_mqtt_1 = require("async-mqtt");
const config_1 = __importDefault(require("../config"));
const fs_1 = __importDefault(require("fs"));
const deviceRequestTopic = 'vb/devices/power/pihub/request';
const deviceResponseTopic = 'vb/devices/power/pihub/response';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield (0, async_mqtt_1.connectAsync)(config_1.default.mqtt.host);
        client.on('connect', () => {
            console.log('on connect');
        });
        client.on('reconnect', () => {
            console.log('on reconnect');
        });
        client.on('close', () => {
            console.log('on close');
        });
        client.on('disconnect', () => {
            console.log('on disconnect');
        });
        client.on('offline', () => {
            console.log('on offline');
        });
        client.on('error', (err) => {
            console.log('on error');
            console.error(err);
        });
        client.on('end', () => {
            console.log('on end');
        });
        client.on('message', (topic, message) => __awaiter(this, void 0, void 0, function* () {
            message = JSON.parse(message);
            if (topic === config_1.default.mqtt.requestTopic) {
                yield client.publish(config_1.default.mqtt.responseTopic, JSON.stringify({
                    request: 'registration', requestTopic: deviceRequestTopic,
                    responseTopic: deviceResponseTopic,
                    state: JSON.parse(fs_1.default.readFileSync(`${__dirname}/../../data/template.json`).toString())
                }));
                return;
            }
            if (topic === deviceRequestTopic) {
                yield client.publish(deviceResponseTopic, JSON.stringify(message.payload));
                return;
            }
        }));
        yield client.subscribe([config_1.default.mqtt.requestTopic, deviceRequestTopic]);
    });
}
run();
