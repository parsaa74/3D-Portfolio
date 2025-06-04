/**
 * Simple event emitter class for handling events
 * @class EventEmitter
 */
export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event).delete(callback);
    if (this._listeners.get(event).size === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...*} args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    if (!this._listeners.has(event)) return;
    for (const callback of this._listeners.get(event)) {
      callback(...args);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this._listeners.clear();
  }
}
