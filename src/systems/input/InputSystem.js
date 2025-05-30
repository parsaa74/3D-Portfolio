import { EventEmitter } from "../../utils/EventEmitter";

/**
 * Input system for handling keyboard and mouse input
 * @class InputSystem
 */
export class InputSystem extends EventEmitter {
  constructor() {
    super();

    // Key states
    this.keys = new Map();
    this.mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      buttons: new Map(),
    };

    // Bind methods
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
  }

  /**
   * Initialize the input system
   * @param {Engine} engine - Game engine instance
   */
  init(engine) {
    this.engine = engine;

    // Add event listeners
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mouseup", this._onMouseUp);
    document.addEventListener("contextmenu", this._onContextMenu);

    // Lock pointer on click if requested
    if (this.engine.options.pointerLock) {
      this.engine.renderer.domElement.addEventListener("click", () => {
        try {
          // Handle the Promise returned by requestPointerLock
          const promise = this.engine.renderer.domElement.requestPointerLock();
          if (promise && promise.catch) {
            promise.catch(error => {
              console.warn("Pointer lock request rejected:", error);
            });
          }
        } catch (error) {
          console.warn("Failed to request pointer lock:", error);
        }
      });
    }
  }

  /**
   * Check if a key is pressed
   * @param {string} key - Key to check
   * @returns {boolean} Whether the key is pressed
   */
  isKeyPressed(key) {
    return this.keys.get(key) || false;
  }

  /**
   * Check if a mouse button is pressed
   * @param {number} button - Mouse button to check (0: left, 1: middle, 2: right)
   * @returns {boolean} Whether the button is pressed
   */
  isMouseButtonPressed(button) {
    return this.mouse.buttons.get(button) || false;
  }

  /**
   * Handle keydown event
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _onKeyDown(event) {
    // Skip movement keys (WASD/Arrows) since they're handled by UnifiedMovementController
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(event.code)
    ) {
      return;
    }

    if (event.repeat) return;
    console.log("Key pressed:", event.code); // Debug log
    this.keys.set(event.code, true);
    this.emit("keydown", event.code);
  }

  /**
   * Handle keyup event
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _onKeyUp(event) {
    // Skip movement keys (WASD/Arrows) since they're handled by UnifiedMovementController
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(event.code)
    ) {
      return;
    }

    this.keys.set(event.code, false);
    this.emit("keyup", event.code);
  }

  /**
   * Handle mousemove event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  _onMouseMove(event) {
    if (document.pointerLockElement === this.engine.renderer.domElement) {
      console.log("Mouse move:", event.movementX, event.movementY); // Debug log
      this.mouse.dx = event.movementX || 0;
      this.mouse.dy = event.movementY || 0;
    } else {
      // Calculate delta for non-pointer lock
      const dx = event.clientX - this.mouse.x;
      const dy = event.clientY - this.mouse.y;
      this.mouse.dx = dx;
      this.mouse.dy = dy;
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    }

    this.emit("mousemove", {
      dx: this.mouse.dx,
      dy: this.mouse.dy,
      x: this.mouse.x,
      y: this.mouse.y,
    });
  }

  /**
   * Handle mousedown event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  _onMouseDown(event) {
    this.mouse.buttons.set(event.button, true);
    this.emit("mousedown", event.button);
  }

  /**
   * Handle mouseup event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  _onMouseUp(event) {
    this.mouse.buttons.set(event.button, false);
    this.emit("mouseup", event.button);
  }

  /**
   * Handle context menu event
   * @private
   * @param {Event} event - Context menu event
   */
  _onContextMenu(event) {
    // Prevent context menu if pointer is locked
    if (document.pointerLockElement === this.engine.renderer.domElement) {
      event.preventDefault();
    }
  }

  /**
   * Update input state
   */
  update() {
    // Reset delta movement if pointer is not locked
    if (document.pointerLockElement !== this.engine.renderer.domElement) {
      this.mouse.dx = 0;
      this.mouse.dy = 0;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove event listeners
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup", this._onMouseUp);
    document.removeEventListener("contextmenu", this._onContextMenu);

    // Clear states
    this.keys.clear();
    this.mouse.buttons.clear();
    this.removeAllListeners();
  }
}
