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
class DeviceManager {
    constructor(options) {
        this.devices = new Map();
        this.savingState = Promise.resolve();
        this.datadir = options.datadir;
        this.devicesFile = `${this.datadir}/devices.json`;
        this.loadDevices();
    }
    all() {
        const devices = [];
        this.devices.forEach((device) => {
            devices.push({
                state: device.state,
                id: device.id,
                name: device.name,
                lastSeen: device.lastSeen
            });
        });
        return devices;
    }
    loadDevices() {
        let data;
        try {
            data = fs_1.default.readFileSync(this.devicesFile);
        }
        catch (e) {
            console.log('No devices file found');
            return;
        }
        try {
            data = JSON.parse(data);
        }
        catch (e) {
            console.log('Unable to parse devices file');
            throw e;
        }
        for (const device of data) {
            const id = device[0];
            const deviceData = device[1];
            const name = deviceData.name;
            const features = deviceData.features;
            const featuresHash = deviceData.featuresHash;
            const state = deviceData.state;
            const lastSeen = new Date(deviceData.lastSeen);
            this.devices.set(id, {
                name,
                id,
                features,
                featuresHash,
                state,
                lastSeen
            });
        }
    }
    register(id, name, features) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savingState;
            if (!this.devices.has(id)) {
                this.add(id, name, features);
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
            const value = this.defaultValue(f);
            schema.push(Object.assign(Object.assign({}, f), { value }));
        }
        return schema;
    }
    add(id, name, features) {
        this.devices.set(id, {
            id,
            name,
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
                device.features = updates.features;
                device.featuresHash = newFeatures;
            }
        }
        if (updates.name) {
            device.name = updates.name;
        }
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
