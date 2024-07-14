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
const HttpServer_1 = __importDefault(require("../HttpServer"));
const http_routes_1 = __importDefault(require("../http-routes"));
const config_1 = __importDefault(require("../config"));
const DeviceManager_1 = __importDefault(require("../DeviceManager"));
const MQTT_1 = __importDefault(require("../MQTT"));
const logger_1 = __importDefault(require("../logger"));
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        DeviceManager_1.default.init({
            datadir: config_1.default.datadir
        });
        const httpServer = new HttpServer_1.default(config_1.default.http.port, config_1.default.http.domain);
        httpServer.setRouter(http_routes_1.default);
        yield httpServer.initialize();
        const topics = DeviceManager_1.default.inst.all().map(d => d.responseTopic);
        const mqtt = new MQTT_1.default(config_1.default.mqtt, topics);
        mqtt.on('device:registration', (device) => __awaiter(this, void 0, void 0, function* () {
            yield DeviceManager_1.default.inst.register(device);
        }));
        mqtt.on('device:update', (data) => __awaiter(this, void 0, void 0, function* () {
            const { deviceId, featureId, state } = data;
            try {
                yield DeviceManager_1.default.inst.updateFeatureState(deviceId, featureId, state);
            }
            catch (e) {
                logger_1.default.error(e);
            }
            logger_1.default.info("State updated for %s %s %s", deviceId, featureId, state);
        }));
        DeviceManager_1.default.inst.on('state:updateRequested', (data) => {
            mqtt.publishStateUpdateRequest(data);
        });
        yield mqtt.initialize();
    });
})();
