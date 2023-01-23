import HttpServer from "../HttpServer";
import UDPServer from "../UDPServer";
import router from "../http-routes";

(async function run(): Promise<void> {
    const httpServer = new HttpServer(3000);
    httpServer.setRouter(router);
    await httpServer.initialize();

    const udpServer = new UDPServer(6000, 3000);
    const udpAddress = await udpServer.initialize();
})();