import UDPServer from "../UDPServer";

(async function run(): Promise<void> {
    const server = new UDPServer(6000);
    const address = await server.initialize();
    console.log(address);
})();