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
const DeviceManager_1 = __importDefault(require("./DeviceManager"));
const UIBuilder_1 = __importDefault(require("./UIBuilder"));
function router(app, asyncMiddleware) {
    app.get('/', asyncMiddleware((_, res) => __awaiter(this, void 0, void 0, function* () {
        const devices = DeviceManager_1.default.inst.all();
        const uiBuilder = new UIBuilder_1.default({
            viewsPath: `${app.get('views')}`,
            partialsPrefix: 'device-control-partials'
        });
        const deviceViews = yield uiBuilder.build(devices);
        return res.render('index', {
            deviceViews
        });
    })));
    app.all('/device/reg', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        DeviceManager_1.default.inst.register(req.body.id, req.body.name, req.body.features);
        console.log("Registered", req.body.id);
        res.send();
    })));
}
exports.default = router;
