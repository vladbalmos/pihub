const ejs = require('ejs');

export default class UIBuilder {
    
    private viewsPath: string;
    private partialsPrefix: string;
    
    constructor(options: {
        viewsPath: string,
        partialsPrefix: string
    }) {
        
        this.viewsPath = options.viewsPath;
        this.partialsPrefix = options.partialsPrefix;
    }
    
    async build(devices) {
        const partials: any = [];
        for (const d of devices) {
            const p = await this.buildControlsForDevice(d);
            partials.push(p);
        }
        
        return partials;
    }
    
    async buildControlsForDevice(device) {
        const views: string[] = [];
        for (const feature of device.state) {
            if (!feature.schema || !feature.schema.type) {
                continue;
            }
            
            const partialName = this.partialName(feature.schema);
            
            if (partialName === 'list') {
                console.log(JSON.stringify(feature, null, 2));
            }
            
            const content = await this.render(partialName, {
                ...feature,
                did: device.id,
                dname: device.name
            })
            views.push(content);
        }
        
        return { ...device, views };
    }
    
    partialName(schema) {
        const schemaType = schema.type;

        switch (schemaType) {
            case 'boolean':
                return 'switch';
            case 'list':
                if (schema.item === 'string') {
                    return 'simple-list';
                }
                
                return 'list';
            default:
                throw new Error(`Partial not implemented for ${schemaType}`);
        }
    }
    
    render(file, data: any = {}) {
        file = `${this.viewsPath}/${this.partialsPrefix}/${file}.ejs`;
        
        if (typeof data.pendingChange === 'undefined') {
            data.pendingChange = false;
        }
        
        data.el_disabled = (data.pendingChange) ? 'disabled' : '';
        data.el_multiple = (data.schema.multiple) ? 'multiple' : '';

        return ejs.renderFile(file, {
            ...data,
            featureId: (id) => {
                return `${data.did}_${id}`;
            }
        }, {
            views: [this.viewsPath],
            async: true
        });
    }
    
    
    
    
}