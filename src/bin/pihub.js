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
const UDPServer_1 = __importDefault(require("../UDPServer"));
const http_routes_1 = __importDefault(require("../http-routes"));
const config_1 = __importDefault(require("../config"));
const DeviceManager_1 = __importDefault(require("../DeviceManager"));
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        DeviceManager_1.default.init({
            datadir: config_1.default.datadir
        });
        const httpServer = new HttpServer_1.default(config_1.default.http.port);
        httpServer.setRouter(http_routes_1.default);
        yield httpServer.initialize();
        const udpServer = new UDPServer_1.default(config_1.default.udp.port, config_1.default.http.port);
        const udpAddress = yield udpServer.initialize();
    });
})();
