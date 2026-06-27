import { logger } from '../utils/logger.js';

class EventBus {
    constructor() {
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) {this._listeners[event] = [];}
        this._listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const list = this._listeners[event];
        if (!list) {return;}
        this._listeners[event] = list.filter((l) => l !== callback);
    }

    emit(event, data) {
        const list = this._listeners[event];
        if (!list) {return;}
        list.forEach((cb) => {
            try {cb(data);} catch (e) {logger.error('[EventBus] handler error:', e);}
        });
    }
}

export const bus = new EventBus();
