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
            
            views.push(await this.renderView({
                ...feature,
                did: device.id,
                dname: device.name
            }));
        }
        
        return { ...device, views };
    }
    
    
    async renderView(data) {
        const partialName = this.partialName(data.schema);

        const content = await this.render(partialName, data);
        return content;
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
            case 'action':
                return 'button';
            case 'color':
                return 'colorpicker'
            default:
                throw new Error(`Partial not implemented for ${schemaType}`);
        }
    }
    
    render(file, data: any = {}) {
        file = `${this.viewsPath}/${this.partialsPrefix}/${file}.ejs`;
        
        data.el_disabled = (typeof data.pendingChange !== 'undefined') ? 'disabled' : '';
        data.el_multiple = (data.schema.multiple) ? 'multiple' : '';
        data.pending_change = (typeof data.pendingChange !== 'undefined') ? '1' : '0';
        
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