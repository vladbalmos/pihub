"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
function delay(ms) {
    return new Promise((r) => {
        setTimeout(r, ms);
    });
}
exports.delay = delay;
