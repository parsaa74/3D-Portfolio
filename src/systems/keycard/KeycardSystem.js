/**
 * KeycardSystem - Handles keycard-based access control
 * Implements Severance's department access mechanics
 */
export class KeycardSystem {
  constructor() {
    // Keycard inventory
    this.keycards = new Set();

    // Access levels and their requirements
    this.accessLevels = new Map([
      ["MDR", ["MDR_ACCESS"]],
      ["O_AND_D", ["O_AND_D_ACCESS", "SUPERVISOR_APPROVAL"]],
      ["WELLNESS", ["WELLNESS_ACCESS"]],
      ["SECURITY", ["SECURITY_ACCESS", "SUPERVISOR_APPROVAL"]],
      ["TESTING", ["TESTING_ACCESS", "SUPERVISOR_APPROVAL", "ETHICS_APPROVAL"]],
    ]);

    // UI elements
    this.keycardDisplay = null;
    this.messageDisplay = null;

    // Message display settings
    this.messageTimeout = null;
    this.MESSAGE_DURATION = 3000; // 3 seconds
  }

  /**
   * Initialize the keycard system
   * @param {HTMLElement} container - Container for the UI elements
   */
  initialize(container) {
    this.createUI(container);
  }

  /**
   * Create the keycard system UI
   * @param {HTMLElement} container - Container element
   * @private
   */
  createUI(container) {
    // Create keycard inventory display
    this.keycardDisplay = document.createElement("div");
    this.keycardDisplay.id = "keycard-display";
    this.keycardDisplay.style.position = "absolute";
    this.keycardDisplay.style.left = "20px";
    this.keycardDisplay.style.bottom = "20px";
    this.keycardDisplay.style.padding = "10px";
    this.keycardDisplay.style.background = "rgba(0, 0, 0, 0.8)";
    this.keycardDisplay.style.color = "#ffffff";
    this.keycardDisplay.style.fontFamily = "monospace";
    container.appendChild(this.keycardDisplay);

    // Create message display
    this.messageDisplay = document.createElement("div");
    this.messageDisplay.id = "keycard-message";
    this.messageDisplay.style.position = "absolute";
    this.messageDisplay.style.left = "50%";
    this.messageDisplay.style.top = "50%";
    this.messageDisplay.style.transform = "translate(-50%, -50%)";
    this.messageDisplay.style.padding = "20px";
    this.messageDisplay.style.background = "rgba(0, 0, 0, 0.9)";
    this.messageDisplay.style.color = "#ffffff";
    this.messageDisplay.style.fontFamily = "monospace";
    this.messageDisplay.style.display = "none";
    this.messageDisplay.style.borderRadius = "5px";
    this.messageDisplay.style.textAlign = "center";
    container.appendChild(this.messageDisplay);
  }

  /**
   * Add a keycard to the inventory
   * @param {string} keycardId - Unique identifier for the keycard
   * @param {string} description - Description of the keycard's purpose
   */
  addKeycard(keycardId, description) {
    this.keycards.add(keycardId);
    this.showMessage(`Acquired: ${description}`);
    this.updateDisplay();
  }

  /**
   * Remove a keycard from the inventory
   * @param {string} keycardId - Unique identifier for the keycard
   */
  removeKeycard(keycardId) {
    this.keycards.delete(keycardId);
    this.updateDisplay();
  }

  /**
   * Check if access is granted to a specific department
   * @param {string} department - Department to check access for
   * @returns {boolean} Whether access is granted
   */
  checkAccess(department) {
    // Always allow access to all departments regardless of keycards
    return true;
  }

  /**
   * Alias for checkAccess for backwards compatibility
   * @param {string} department - Department to check access for
   * @returns {boolean} Whether access is granted
   */
  hasAccess(department) {
    return true;
  }

  /**
   * Display a temporary message
   * @param {string} message - Message to display
   * @private
   */
  showMessage(message) {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageDisplay.textContent = message;
    this.messageDisplay.style.display = "block";

    this.messageTimeout = setTimeout(() => {
      this.messageDisplay.style.display = "none";
    }, this.MESSAGE_DURATION);
  }

  /**
   * Update the keycard inventory display
   * @private
   */
  updateDisplay() {
    if (!this.keycardDisplay) return;

    if (this.keycards.size === 0) {
      this.keycardDisplay.textContent = "No keycards";
      return;
    }

    const keycardList = Array.from(this.keycards)
      .map((card) => `[${card}]`)
      .join(" ");
    this.keycardDisplay.textContent = `Keycards: ${keycardList}`;
  }

  /**
   * Get all current keycards
   * @returns {Set<string>} Set of keycard IDs
   */
  getKeycards() {
    return new Set(this.keycards);
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    if (this.keycardDisplay && this.keycardDisplay.parentNode) {
      this.keycardDisplay.parentNode.removeChild(this.keycardDisplay);
    }
    if (this.messageDisplay && this.messageDisplay.parentNode) {
      this.messageDisplay.parentNode.removeChild(this.messageDisplay);
    }
    this.keycards.clear();
  }
}
