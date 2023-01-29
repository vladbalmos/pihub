import HttpServer from "../HttpServer";
import UDPServer from "../UDPServer";
import router from "../http-routes";
import config from "../config";
import DeviceManager from "../DeviceManager";

(async function run(): Promise<void> {
    
    DeviceManager.init({
        datadir: config.datadir
    })
    
    const httpServer = new HttpServer(config.http.port, config.http.domain);
    httpServer.setRouter(router);
    await httpServer.initialize();

    const udpServer = new UDPServer(config.udp.port, config.http.port);
    DeviceManager.inst.on('state:updateRequested', (ev: {
        deviceId: string,
        featureId: string
    }) => {
        udpServer.broadcastStateUpdateRequest(ev);
    })
    await udpServer.initialize();
})();