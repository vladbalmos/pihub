import HttpServer from "../HttpServer";
import router from "../http-routes";
import config from "../config";
import DeviceManager from "../DeviceManager";
import MQTT from "../MQTT";
import logger from "../logger";

(async function run(): Promise<void> {
    
    DeviceManager.init({
        datadir: config.datadir
    })
    
    const httpServer = new HttpServer(config.http.port, config.http.domain);
    httpServer.setRouter(router);
    await httpServer.initialize();
    
    const topics = DeviceManager.inst.all().map(d => d.responseTopic)
    const mqtt = new MQTT(config.mqtt, topics);
    
    mqtt.on('device:registration', async (device) => {
        await DeviceManager.inst.register(device);
    })
    
    mqtt.on('device:update', async (data) => {
        const { deviceId, featureId, state} = data;
        
        try {
            await DeviceManager.inst.updateFeatureState(deviceId, featureId, state);
        } catch (e) {
            logger.error(e);
        }
        logger.info("State updated for %s %s %s", deviceId, featureId, state)
    })
    
    DeviceManager.inst.on('state:updateRequested', (data) => {
        mqtt.publishStateUpdateRequest(data);
    })
    
    await mqtt.initialize();
})();