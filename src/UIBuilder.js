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
Object.defineProperty(exports, "__esModule", { value: true });
const ejs = require('ejs');
class UIBuilder {
    constructor(options) {
        this.viewsPath = options.viewsPath;
        this.partialsPrefix = options.partialsPrefix;
    }
    build(devices) {
        return __awaiter(this, void 0, void 0, function* () {
            const partials = [];
            for (const d of devices) {
                const p = yield this.buildControlsForDevice(d);
                partials.push(p);
            }
            return partials;
        });
    }
    buildControlsForDevice(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const views = [];
            for (const feature of device.state) {
                if (!feature.schema || !feature.schema.type) {
                    continue;
                }
                views.push(yield this.renderView(Object.assign(Object.assign({}, feature), { did: device.id, dname: device.name })));
            }
            return Object.assign(Object.assign({}, device), { views });
        });
    }
    renderView(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const partialName = this.partialName(data.schema);
            const content = yield this.render(partialName, data);
            return content;
        });
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
    render(file, data = {}) {
        file = `${this.viewsPath}/${this.partialsPrefix}/${file}.ejs`;
        data.el_disabled = (typeof data.pendingChange !== 'undefined') ? 'disabled' : '';
        data.el_multiple = (data.schema.multiple) ? 'multiple' : '';
        return ejs.renderFile(file, Object.assign(Object.assign({}, data), { featureId: (id) => {
                return `${data.did}_${id}`;
            } }), {
            views: [this.viewsPath],
            async: true
        });
    }
}
exports.default = UIBuilder;
