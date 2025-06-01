/**
 * Game State Manager for Severance: The Game
 *
 * This class provides a centralized state management system for the game.
 * It handles state transitions, persistence, and provides a clean interface
 * for accessing and modifying game state.
 */

// Game state constants
export const GameStates = {
  LOADING: "loading",
  WELCOME: "welcome",
  GAMEPLAY: "gameplay",
  PAUSED: "paused",
  MENU: "menu",
  CUTSCENE: "cutscene",
  GAME_OVER: "gameOver",
};

// Event types
export const GameEvents = {
  STATE_CHANGED: "stateChanged",
  PLAYER_MOVED: "playerMoved",
  SCENE_LOADED: "sceneLoaded",
  ITEM_COLLECTED: "itemCollected",
  OBJECTIVE_COMPLETED: "objectiveCompleted",
  GAME_SAVED: "gameSaved",
  GAME_LOADED: "gameLoaded",
};

export class GameStateManager {
  constructor() {
    // Current game state
    this.currentState = GameStates.LOADING;

    // Previous game state (for returning from pause, etc.)
    this.previousState = null;

    // Track if state has changed since last check
    this.stateChanged = false;

    // Game data
    this.gameData = {
      player: {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        health: 100,
        inventory: [],
      },
      world: {
        currentScene: "hub",
        visitedScenes: [],
        interactedObjects: {},
        completedObjectives: [],
      },
      settings: {
        mouseSensitivity: 0.002,
        volume: 0.8,
        fov: 75,
        headBobEnabled: true,
      },
      statistics: {
        playTime: 0,
        distanceTraveled: 0,
        itemsCollected: 0,
      },
    };

    // Event listeners
    this.eventListeners = {};

    // Initialize event types
    Object.values(GameEvents).forEach((eventType) => {
      this.eventListeners[eventType] = [];
    });

    // Start time tracking
    this.lastUpdateTime = performance.now();

    // Flag to track if state is dirty (needs saving)
    this.isDirty = false;

    // Auto-save interval (in milliseconds)
    this.autoSaveInterval = 60000; // 1 minute
    this.lastAutoSaveTime = performance.now();

    console.log("Game State Manager initialized");
  }

  /**
   * Update the game state
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update play time if in gameplay state
    if (this.currentState === GameStates.GAMEPLAY) {
      this.gameData.statistics.playTime += deltaTime;
    }

    // Check if auto-save is needed
    const now = performance.now();
    if (this.isDirty && now - this.lastAutoSaveTime > this.autoSaveInterval) {
      this.saveGame("auto");
      this.lastAutoSaveTime = now;
      this.isDirty = false;
    }
  }

  /**
   * Change the game state
   * @param {string} newState - The new state to transition to
   * @param {Object} data - Optional data to pass with the state change
   */
  changeState(newState, data = {}) {
    // Store previous state
    this.previousState = this.currentState;

    // Update current state
    this.currentState = newState;

    // Set the state changed flag
    this.stateChanged = true;

    // Trigger state changed event
    this.triggerEvent(GameEvents.STATE_CHANGED, {
      previousState: this.previousState,
      newState: this.currentState,
      data,
    });

    console.log(
      `Game state changed: ${this.previousState} -> ${this.currentState}`
    );

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Check if the state has changed since the last check
   * This method resets the stateChanged flag after checking
   * @returns {boolean} - Whether the state has changed
   */
  hasStateChanged() {
    const changed = this.stateChanged;
    this.stateChanged = false;
    return changed;
  }

  /**
   * Get the current game state
   * @returns {string} - The current game state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Return to the previous state
   * @returns {boolean} - True if successfully returned to previous state
   */
  returnToPreviousState() {
    if (this.previousState) {
      this.changeState(this.previousState);
      return true;
    }
    return false;
  }

  /**
   * Update player data
   * @param {Object} playerData - The player data to update
   */
  updatePlayerData(playerData) {
    // Merge new player data with existing data
    this.gameData.player = {
      ...this.gameData.player,
      ...playerData,
    };

    // Trigger player moved event if position changed
    if (playerData.position) {
      this.triggerEvent(GameEvents.PLAYER_MOVED, {
        position: this.gameData.player.position,
      });
    }

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Update world data
   * @param {Object} worldData - The world data to update
   */
  updateWorldData(worldData) {
    // Merge new world data with existing data
    this.gameData.world = {
      ...this.gameData.world,
      ...worldData,
    };

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Update game settings
   * @param {Object} settings - The settings to update
   */
  updateSettings(settings) {
    // Merge new settings with existing settings
    this.gameData.settings = {
      ...this.gameData.settings,
      ...settings,
    };

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Add an item to the player's inventory
   * @param {Object} item - The item to add
   */
  addInventoryItem(item) {
    this.gameData.player.inventory.push(item);

    // Update statistics
    this.gameData.statistics.itemsCollected++;

    // Trigger item collected event
    this.triggerEvent(GameEvents.ITEM_COLLECTED, { item });

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Remove an item from the player's inventory
   * @param {string} itemId - The ID of the item to remove
   * @returns {Object|null} - The removed item or null if not found
   */
  removeInventoryItem(itemId) {
    const index = this.gameData.player.inventory.findIndex(
      (item) => item.id === itemId
    );

    if (index !== -1) {
      const removedItem = this.gameData.player.inventory.splice(index, 1)[0];

      // Mark state as dirty
      this.isDirty = true;

      return removedItem;
    }

    return null;
  }

  /**
   * Check if the player has a specific item
   * @param {string} itemId - The ID of the item to check
   * @returns {boolean} - True if the player has the item
   */
  hasInventoryItem(itemId) {
    return this.gameData.player.inventory.some((item) => item.id === itemId);
  }

  /**
   * Mark an objective as completed
   * @param {string} objectiveId - The ID of the objective
   */
  completeObjective(objectiveId) {
    if (!this.gameData.world.completedObjectives.includes(objectiveId)) {
      this.gameData.world.completedObjectives.push(objectiveId);

      // Trigger objective completed event
      this.triggerEvent(GameEvents.OBJECTIVE_COMPLETED, { objectiveId });

      // Mark state as dirty
      this.isDirty = true;
    }
  }

  /**
   * Check if an objective is completed
   * @param {string} objectiveId - The ID of the objective
   * @returns {boolean} - True if the objective is completed
   */
  isObjectiveCompleted(objectiveId) {
    return this.gameData.world.completedObjectives.includes(objectiveId);
  }

  /**
   * Mark a scene as visited
   * @param {string} sceneId - The ID of the scene
   */
  visitScene(sceneId) {
    if (!this.gameData.world.visitedScenes.includes(sceneId)) {
      this.gameData.world.visitedScenes.push(sceneId);

      // Mark state as dirty
      this.isDirty = true;
    }

    // Update current scene
    this.gameData.world.currentScene = sceneId;

    // Trigger scene loaded event
    this.triggerEvent(GameEvents.SCENE_LOADED, { sceneId });
  }

  /**
   * Check if a scene has been visited
   * @param {string} sceneId - The ID of the scene
   * @returns {boolean} - True if the scene has been visited
   */
  hasVisitedScene(sceneId) {
    return this.gameData.world.visitedScenes.includes(sceneId);
  }

  /**
   * Record interaction with an object
   * @param {string} objectId - The ID of the object
   * @param {Object} data - Data about the interaction
   */
  recordInteraction(objectId, data = {}) {
    this.gameData.world.interactedObjects[objectId] = {
      ...this.gameData.world.interactedObjects[objectId],
      ...data,
      lastInteraction: Date.now(),
    };

    // Mark state as dirty
    this.isDirty = true;
  }

  /**
   * Check if an object has been interacted with
   * @param {string} objectId - The ID of the object
   * @returns {boolean} - True if the object has been interacted with
   */
  hasInteractedWith(objectId) {
    return !!this.gameData.world.interactedObjects[objectId];
  }

  /**
   * Get interaction data for an object
   * @param {string} objectId - The ID of the object
   * @returns {Object|null} - The interaction data or null if not found
   */
  getInteractionData(objectId) {
    return this.gameData.world.interactedObjects[objectId] || null;
  }

  /**
   * Save the game state
   * @param {string} slotName - The name of the save slot
   * @returns {boolean} - True if save was successful
   */
  saveGame(slotName = "default") {
    try {
      // Create save data object
      const saveData = {
        version: "1.0",
        timestamp: Date.now(),
        gameData: this.gameData,
      };

      // Convert to JSON and save to localStorage
      localStorage.setItem(
        `severance_save_${slotName}`,
        JSON.stringify(saveData)
      );

      // Trigger game saved event
      this.triggerEvent(GameEvents.GAME_SAVED, { slotName, saveData });

      console.log(`Game saved to slot: ${slotName}`);

      // Reset dirty flag
      this.isDirty = false;

      return true;
    } catch (error) {
      console.error("Error saving game:", error);
      return false;
    }
  }

  /**
   * Load a saved game
   * @param {string} slotName - The name of the save slot
   * @returns {boolean} - True if load was successful
   */
  loadGame(slotName = "default") {
    try {
      // Get save data from localStorage
      const saveDataJson = localStorage.getItem(`severance_save_${slotName}`);

      if (!saveDataJson) {
        console.warn(`No save data found for slot: ${slotName}`);
        return false;
      }

      // Parse save data
      const saveData = JSON.parse(saveDataJson);

      // Check version compatibility
      if (saveData.version !== "1.0") {
        console.warn(`Save data version mismatch: ${saveData.version}`);
      }

      // Update game data
      this.gameData = saveData.gameData;

      // Trigger game loaded event
      this.triggerEvent(GameEvents.GAME_LOADED, { slotName, saveData });

      console.log(`Game loaded from slot: ${slotName}`);

      return true;
    } catch (error) {
      console.error("Error loading game:", error);
      return false;
    }
  }

  /**
   * Get a list of available save slots
   * @returns {Array} - Array of save slot information
   */
  getSaveSlots() {
    const saveSlots = [];

    // Check all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key.startsWith("severance_save_")) {
        try {
          const saveDataJson = localStorage.getItem(key);
          const saveData = JSON.parse(saveDataJson);
          const slotName = key.replace("severance_save_", "");

          saveSlots.push({
            slotName,
            timestamp: saveData.timestamp,
            playTime: saveData.gameData.statistics.playTime,
            scene: saveData.gameData.world.currentScene,
          });
        } catch (error) {
          console.error(`Error parsing save slot: ${key}`, error);
        }
      }
    }

    // Sort by timestamp (newest first)
    saveSlots.sort((a, b) => b.timestamp - a.timestamp);

    return saveSlots;
  }

  /**
   * Delete a save slot
   * @param {string} slotName - The name of the save slot
   * @returns {boolean} - True if deletion was successful
   */
  deleteSaveSlot(slotName) {
    try {
      localStorage.removeItem(`severance_save_${slotName}`);
      console.log(`Save slot deleted: ${slotName}`);
      return true;
    } catch (error) {
      console.error("Error deleting save slot:", error);
      return false;
    }
  }

  /**
   * Add an event listener
   * @param {string} eventType - The type of event to listen for
   * @param {Function} callback - The callback function
   */
  addEventListener(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }

    this.eventListeners[eventType].push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} eventType - The type of event
   * @param {Function} callback - The callback function to remove
   */
  removeEventListener(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      return;
    }

    this.eventListeners[eventType] = this.eventListeners[eventType].filter(
      (listener) => listener !== callback
    );
  }

  /**
   * Trigger an event
   * @param {string} eventType - The type of event to trigger
   * @param {Object} data - Data to pass to event listeners
   */
  triggerEvent(eventType, data = {}) {
    if (!this.eventListeners[eventType]) {
      return;
    }

    // Create event object
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data,
    };

    // Call all listeners
    this.eventListeners[eventType].forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  /**
   * Reset the game state to default values
   */
  resetGame() {
    // Reset game data to initial values
    this.gameData = {
      player: {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        health: 100,
        inventory: [],
      },
      world: {
        currentScene: "hub",
        visitedScenes: [],
        interactedObjects: {},
        completedObjectives: [],
      },
      settings: {
        mouseSensitivity: 0.002,
        volume: 0.8,
        fov: 75,
        headBobEnabled: true,
      },
      statistics: {
        playTime: 0,
        distanceTraveled: 0,
        itemsCollected: 0,
      },
    };

    // Reset state
    this.changeState(GameStates.WELCOME);

    console.log("Game state reset to defaults");
  }
}
