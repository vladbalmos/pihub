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
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const events_1 = __importDefault(require("events"));
const logger_1 = __importDefault(require("./logger"));
class DeviceManager extends events_1.default {
    constructor(options) {
        super();
        this.devices = new Map();
        this.savingState = Promise.resolve();
        this.pendingUpdates = {};
        this.datadir = options.datadir;
        this.devicesFile = `${this.datadir}/devices.json`;
        this.loadDevices();
        setInterval(this.broadcastStateUpdateRequests.bind(this), 1000);
    }
    all() {
        const devices = [];
        this.devices.forEach((device) => {
            devices.push({
                state: device.state,
                id: device.id,
                name: device.name,
                requestTopic: device.requestTopic,
                responseTopic: device.responseTopic,
                lastSeen: device.lastSeen
            });
        });
        return devices;
    }
    getPendingUpdates() {
        var _a;
        const updates = this.pendingUpdates;
        const lastSeen = {};
        const ret = {};
        for (const key in updates) {
            const [deviceId, featureId] = key.split(':');
            const state = this.getState(deviceId, featureId);
            lastSeen[deviceId] = (_a = this.get(deviceId)) === null || _a === void 0 ? void 0 : _a.lastSeen;
            ret[key] = {
                updateStatus: updates[key],
                value: state.value,
                schema: state.schema
            };
        }
        return { updates: ret, lastSeen };
    }
    clearPendingUpdate(key) {
        delete this.pendingUpdates[key];
    }
    getState(deviceId, featureId) {
        const d = this.get(deviceId);
        if (!d) {
            throw new Error(`Unknown device: ${deviceId}`);
        }
        let foundFeatureState;
        for (const f of d.state) {
            if (f.id === featureId) {
                foundFeatureState = f;
                break;
            }
        }
        if (!foundFeatureState) {
            throw new Error(`Feature not found: ${featureId}`);
        }
        return foundFeatureState;
    }
    broadcastStateUpdateRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.all();
            const now = new Date().valueOf();
            for (const d of devices) {
                const offlineSince = Math.floor((now - d.lastSeen.valueOf()) / 1000);
                const offlineSinceDays = offlineSince / 3600 / 24;
                if (offlineSinceDays > 7) {
                    continue;
                }
                for (const f of d.state) {
                    if (typeof f.pendingChange === 'undefined' || f.changeInProgress) {
                        continue;
                    }
                    const changeRequestedAt = new Date(f.changeRequestedAt).valueOf();
                    const elapsedSinceChanged = Math.floor((now - changeRequestedAt) / 1000);
                    if (elapsedSinceChanged < 5) {
                        continue;
                    }
                    f.changeRequestedAt = new Date();
                    logger_1.default.info('Broadcasting %s', f.id);
                    this.emit('state:updateRequested', {
                        topic: d.requestTopic,
                        payload: {
                            deviceId: d.id,
                            featureId: f.id,
                            state: f.pendingChange
                        }
                    });
                }
            }
        });
    }
    get(deviceId) {
        let device = null;
        this.devices.forEach((d, id) => {
            if (id === deviceId) {
                device = d;
                return null;
            }
        });
        return device;
    }
    loadDevices() {
        let data;
        try {
            data = fs_1.default.readFileSync(this.devicesFile);
        }
        catch (e) {
            logger_1.default.info('No devices file found');
            return;
        }
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            logger_1.default.info('Unable to parse devices file');
            throw e;
        }
        for (const device of data) {
            const id = device[0];
            const deviceData = device[1];
            const name = deviceData.name;
            const requestTopic = deviceData.requestTopic;
            const responseTopic = deviceData.responseTopic;
            const features = deviceData.features;
            const featuresHash = deviceData.featuresHash;
            const state = deviceData.state;
            const lastSeen = new Date(deviceData.lastSeen);
            this.devices.set(id, {
                id,
                name,
                requestTopic,
                responseTopic,
                features,
                featuresHash,
                state,
                lastSeen
            });
        }
    }
    register(deviceReg) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            const { requestTopic, responseTopic, state } = deviceReg;
            const { id, name, features } = state;
            if (!this.devices.has(id)) {
                this.add(id, name, requestTopic, responseTopic, features);
            }
            else {
                this.update(id, {
                    name,
                    features
                });
            }
            return this.save();
        });
    }
    defaultValue(feature) {
        if (!feature.schema) {
            return null;
        }
        if (typeof feature.value !== 'undefined') {
            return feature.value;
        }
        const schema = feature.schema;
        if (schema.type === 'boolean') {
            return schema.default || false;
        }
        if (schema.type === 'list') {
            return schema.default || [];
        }
    }
    createDefaultState(features) {
        const schema = [];
        for (const f of features) {
            const stateValue = this.defaultValue(f);
            schema.push(Object.assign(Object.assign({}, f), { value: stateValue }));
        }
        return schema;
    }
    add(id, name, requestTopic, responseTopic, features) {
        this.devices.set(id, {
            id,
            name,
            requestTopic,
            responseTopic,
            features,
            featuresHash: this.getHash(features),
            state: this.createDefaultState(features),
            lastSeen: new Date()
        });
    }
    update(id, updates) {
        const device = this.devices.get(id);
        device.lastSeen = new Date();
        if (updates.features) {
            const existingFeatures = device === null || device === void 0 ? void 0 : device.featuresHash;
            const newFeatures = this.getHash(updates.features);
            if (existingFeatures !== newFeatures) {
                logger_1.default.info(`Device ${id} updated`);
                device.features = updates.features;
                device.featuresHash = newFeatures;
                device.state = this.createDefaultState(updates.features);
                // @ts-expect-error
                for (const f of updates.features) {
                    this.pendingUpdates[`${id}:${f.id}`] = 'completed';
                }
            }
        }
        if (updates.name) {
            device.name = updates.name;
        }
    }
    requestStateUpdate(change) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            const d = this.get(change.deviceId);
            if (!d) {
                return;
            }
            for (const state of d.state) {
                if (state.id !== change.featureId) {
                    continue;
                }
                state.pendingChange = change.value;
                state.changeRequestedAt = new Date();
                yield this.save();
                break;
            }
            this.pendingUpdates[`${change.deviceId}:${change.featureId}`] = 'pending';
            this.emit('state:updateRequested', {
                topic: d.requestTopic,
                payload: {
                    deviceId: change.deviceId,
                    featureId: change.featureId,
                    state: change.value
                }
            });
        });
    }
    getPendingUpdate(deviceId, featureId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            const d = this.get(deviceId);
            if (!d) {
                throw new Error('Device not found');
            }
            let foundFeature = false;
            let returnValue;
            for (const state of d.state) {
                if (state.id !== featureId) {
                    continue;
                }
                state.changeInProgress = true;
                returnValue = state.pendingChange;
                foundFeature = true;
                yield this.save();
                break;
            }
            if (!foundFeature) {
                throw new Error('Feature not found');
            }
            this.pendingUpdates[`${deviceId}:${featureId}`] = 'in-progress';
            return returnValue;
        });
    }
    updateFeatureState(deviceId, featureId, featureState) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            const d = this.get(deviceId);
            if (!d) {
                throw new Error('Device not found');
            }
            d.lastSeen = new Date();
            let foundFeature = false;
            for (const state of d.state) {
                if (state.id !== featureId) {
                    continue;
                }
                delete state.pendingChange;
                delete state.changeInProgress;
                state.value = featureState;
                foundFeature = true;
                yield this.save();
                break;
            }
            if (!foundFeature) {
                throw new Error('Feature not found');
            }
            this.pendingUpdates[`${deviceId}:${featureId}`] = 'completed';
        });
    }
    getHash(data) {
        const hash = (0, crypto_1.createHash)('sha256');
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        hash.update(data);
        return hash.digest('hex');
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            this.savingState = new Promise((resolve) => {
                const data = JSON.stringify(Array.from(this.devices.entries()), null, 2);
                fs_1.default.writeFileSync(this.devicesFile, data);
                resolve();
            });
            return this.savingState;
        });
    }
    static init(options) {
        const instance = new DeviceManager(options);
        DeviceManager.inst = instance;
    }
}
exports.default = DeviceManager;
