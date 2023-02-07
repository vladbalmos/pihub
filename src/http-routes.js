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
const logger_1 = __importDefault(require("./logger"));
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
    app.get('/status', asyncMiddleware((_, res) => __awaiter(this, void 0, void 0, function* () {
        const updatesStatus = Object.assign({}, DeviceManager_1.default.inst.getPendingUpdates());
        for (const key in updatesStatus) {
            const item = updatesStatus[key];
            const status = item.updateStatus;
            if (status === 'completed') {
                DeviceManager_1.default.inst.clearPendingUpdate(key);
            }
        }
        return res.json({
            status: true,
            result: updatesStatus
        });
    })));
    app.get('/refresh', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        try {
            const state = DeviceManager_1.default.inst.getState(did, fid);
            const uiBuilder = new UIBuilder_1.default({
                viewsPath: `${app.get('views')}`,
                partialsPrefix: 'device-control-partials'
            });
            const view = yield uiBuilder.renderView(Object.assign(Object.assign({}, state), { did }));
            return res.json({
                status: true,
                content: view
            });
        }
        catch (e) {
            logger_1.default.error(e);
            return res.json({
                status: false,
                error: e.message
            });
        }
    })));
    app.post('/device/update', asyncMiddleware((req, res) => __awaiter(this, void 0, void 0, function* () {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        const data = req.body.data;
        try {
            yield DeviceManager_1.default.inst.updateFeatureState(did, fid, data);
            return res.json({
                status: true
            });
        }
        catch (e) {
            logger_1.default.error(e);
            logger_1.default.info('Device or feature not found', req.query);
            return res.json({
                status: false,
                error: "Device or feature not found"
            });
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
}
exports.default = router;
