import fs from 'fs';
import { createHash, Hash } from 'crypto';
import EventEmitter from 'events';

export default class DeviceManager extends EventEmitter {

    static inst: DeviceManager
    
    private datadir: string;
    
    private devicesFile: string;
    
    private devices: Map<string, Device> = new Map();
    
    private savingState: Promise<void> = Promise.resolve();

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
                lastSeen: device.lastSeen
            });
        });
        
        return devices;
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
                console.log('Broadcasting', f.id);
                this.emit('state:updateRequested', {
                    deviceId: d.id,
                    featureId: f.id
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
            console.log('No devices file found');
            return;
        }
        
        try {
            data = JSON.parse(data)
        } catch (e) {
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
    
    async register(id: string, name: string, features: any) {
        await this.savingState;
        
        if (!this.devices.has(id)) {
            this.add(id, name, features);
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
    
    add(id: string, name: string, features: object) {
        this.devices.set(id, {
            id,
            name,
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
                device.features = updates.features;
                device.featuresHash = newFeatures;
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
        }
        this.emit('state:updateRequested', {
            deviceId: change.deviceId,
            featureId: change.featureId
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
        }
        
        if (!foundFeature) {
            throw new Error('Feature not found');
        }
        
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
        }
        
        if (!foundFeature) {
            throw new Error('Feature not found');
        }
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