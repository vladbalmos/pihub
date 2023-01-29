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
    app.all('/device/update', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        const method = req.method.toLowerCase();
        if (method === 'get') {
            try {
                const value = yield DeviceManager_1.default.inst.getPendingUpdate(did, fid);
                return res.json({
                    status: true,
                    value
                });
            }
            catch (e) {
                console.error(e);
                console.log('Device or feature not found', req.query);
                return res.json({
                    status: false,
                    error: "Device or feature not found"
                });
            }
        }
        else if (method === 'post') {
            const data = req.body.data;
            try {
                yield DeviceManager_1.default.inst.updateFeatureState(did, fid, data);
                return res.json({
                    status: true
                });
            }
            catch (e) {
                console.error(e);
                console.log('Device or feature not found', req.query);
                return res.json({
                    status: false,
                    error: "Device or feature not found"
                });
            }
        }
        else {
            throw new Error(`Unsupported method ${method}`);
        }
    })));
    app.post('/request-update', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        const body = req.body;
        const result = yield DeviceManager_1.default.inst.requestStateUpdate(body);
        res.json({
            status: true,
            result
        });
    })));
    app.post('/device/reg', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        console.log(req.body);
        yield DeviceManager_1.default.inst.register(req.body.id, req.body.name, req.body.features);
        res.json({
            status: true
        });
        console.log("Registered", req.body.id);
    })));
}
exports.default = router;
