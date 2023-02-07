import fs from 'fs';
import { createHash, Hash } from 'crypto';
import EventEmitter from 'events';
import logger from './logger';

export default class DeviceManager extends EventEmitter {

    static inst: DeviceManager
    
    private datadir: string;
    
    private devicesFile: string;
    
    private devices: Map<string, Device> = new Map();
    
    private savingState: Promise<void> = Promise.resolve();
    
    private pendingUpdates: any = {};

    constructor(options: DeviceManagerOptions) {
        super();
        this.datadir = options.datadir;
        this.devicesFile = `${this.datadir}/devices.json`;
        this.loadDevices();
        setInterval(this.broadcastStateUpdateRequests.bind(this), 1000);
    }
    
    all() {
        const devices: any = []
        
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
        const updates = this.pendingUpdates;
        
        const ret = {};
        for (const key in updates) {
            const [deviceId, featueId] = key.split(':');
            const state = this.getState(deviceId, featueId);
            ret[key] = {
                updateStatus: updates[key],
                value: state.value
            }
        }
        
        return ret;
    }
    
    clearPendingUpdate(key) {
        delete this.pendingUpdates[key];
    }
    
    getState(deviceId, featureId) {
        const d = this.get(deviceId);
        
        if (!d) {
            throw new Error(`Unknown device: ${deviceId}`);
        }
        
        let foundFeatureState: any;
        for (const f of d.state!) {
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
    
    async broadcastStateUpdateRequests() {
        const devices =  this.all();
        
        const now = new Date().valueOf();
        for (const d of devices) {
            const offlineSince = Math.floor((now - (d.lastSeen as Date).valueOf()) / 1000);
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
                logger.info('Broadcasting %s', f.id);
                this.emit('state:updateRequested', {
                    topic: d.requestTopic, 
                    payload: {
                        deviceId: d.id,
                        featureId: f.id,
                        state: f.pendingChange
                    }
                })
            }
        }
    }
    
    get(deviceId): Device|null {
        let device: Device|null = null;

        this.devices.forEach((d, id) => {
            if (id === deviceId) {
                device = d;
                return null;
            }
        });
        
        return device;
    }
    
    loadDevices() {
        let data: any;
        
        try {
            data = fs.readFileSync(this.devicesFile);
        } catch (e) {
            logger.info('No devices file found');
            return;
        }
        
        try {
            data = JSON.parse(data)
        } catch (e) {
            logger.info('Unable to parse devices file');
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
    
    async register(deviceReg: DeviceRegistration) {
        await this.savingState;
        
        const { requestTopic, responseTopic, state } = deviceReg;
        const { id, name, features } = state;
        
        if (!this.devices.has(id)) {
            this.add(id, name, requestTopic, responseTopic, features);
        } else {
            this.update(id, {
                name,
                features
            });
        }
        
        return this.save();
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
    
    createDefaultState(features: any) {
        const schema: any[] = [];

        for (const f of features) {
            const stateValue = this.defaultValue(f);
            schema.push({
                ...f,
                value: stateValue
            });
        }
        
        return schema;
    }
    
    add(id: string, name: string, requestTopic: string, responseTopic: string, features: object) {
        this.devices.set(id, {
            id,
            name,
            requestTopic,
            responseTopic,
            features,
            featuresHash: this.getHash(features),
            state: this.createDefaultState(features),
            lastSeen: new Date()
        })
    }
    
    update(id: string, updates: {
        features?: object,
        name?: string
    }) {
        
        const device = this.devices.get(id)!;
        device.lastSeen = new Date();
        
        if (updates.features) {
            const existingFeatures = device?.featuresHash;
            const newFeatures = this.getHash(updates.features);
            
            if (existingFeatures !== newFeatures) {
                logger.info(`Device ${id} updated`);
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
    
    async requestStateUpdate(change) {
        await this.savingState;

        const d: Device|null = this.get(change.deviceId);
        if (!d) {
            return;
        }
        
        for (const state of d.state!) {
            if (state.id !== change.featureId) {
                continue;
            }
            
            state.pendingChange = change.value;
            state.changeRequestedAt = new Date();
            await this.save();
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
    }
    
    async getPendingUpdate(deviceId, featureId) {
        await this.savingState;
        
        const d: Device|null = this.get(deviceId);
        if (!d) {
            throw new Error('Device not found');
        }
        
        let foundFeature = false;
        let returnValue: any;
        
        for (const state of d.state!) {
            if (state.id !== featureId) {
                continue;
            }
            
            state.changeInProgress = true;
            returnValue = state.pendingChange;
            foundFeature = true;
            await this.save();
            break;
        }
        
        if (!foundFeature) {
            throw new Error('Feature not found');
        }
        
        this.pendingUpdates[`${deviceId}:${featureId}`] = 'in-progress';
        return returnValue;
    }
    
    async updateFeatureState(deviceId, featureId, featureState) {
        await this.savingState;
        
        const d: Device|null = this.get(deviceId);
        if (!d) {
            throw new Error('Device not found');
        }
        
        let foundFeature = false;
        
        for (const state of d.state!) {
            if (state.id !== featureId) {
                continue;
            }
            
            delete state.pendingChange;
            delete state.changeInProgress;
            state.value = featureState;
            foundFeature = true;
            await this.save();
            break;
        }
        
        if (!foundFeature) {
            throw new Error('Feature not found');
        }

        this.pendingUpdates[`${deviceId}:${featureId}`] = 'completed';
    }
    
    getHash(data: any) {
        const hash: Hash = createHash('sha256');
        
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        
        hash.update(data);
        return hash.digest('hex');
    }
    
    async save(): Promise<void> {
        await this.savingState;

        this.savingState = new Promise((resolve) => {
            const data = JSON.stringify(Array.from(this.devices.entries()), null, 2);
            fs.writeFileSync(this.devicesFile, data);
            resolve();
        })
        
        return this.savingState;
    }
    
    static init(options: DeviceManagerOptions) {
        const instance = new DeviceManager(options);
        DeviceManager.inst = instance;
    }
}