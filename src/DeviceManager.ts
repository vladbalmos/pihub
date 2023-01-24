import fs from 'fs';
import { createHash, Hash } from 'crypto';
import { resolve } from 'path';

export default class DeviceManager {

    static inst: DeviceManager
    
    private datadir: string;
    
    private devicesFile: string;
    
    private devices: Map<string, Device> = new Map();
    
    private savingState: Promise<void> = Promise.resolve();

    constructor(options: DeviceManagerOptions) {
        this.datadir = options.datadir;
        this.devicesFile = `${this.datadir}/devices.json`;
        this.loadDevices();
    }
    
    all() {
        const devices: any = []
        
        this.devices.forEach((device) => {
            const state = this.createDefaultState(device.features);
        });
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
            const value = this.defaultValue(f);
            schema.push({
                ...f,
                value
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