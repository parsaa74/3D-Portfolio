/**
 * Defines the corridor network based on the Severance TV show layout.
 *
 * Nodes represent key locations or junctions.
 * Edges represent the corridor segments connecting these locations.
 * Positions are relative grid coordinates [x, z]. Negative Z extends away from the elevator.
 * Lengths are relative units, scaled by SEGMENT_LENGTH in the environment.
 */

/**
 * @typedef {{id: string, pos: [number, number], description?: string}} NodeDef
 */

/**
 * @typedef {{from: string, to: string, length?: number, description?: string}} EdgeDef // Length is optional, can be calculated from node positions if needed
 */

/** @type {{ nodes: NodeDef[], edges: EdgeDef[] }} */
export const CORRIDOR_MAP = {
  nodes: [
    // --- Core Layout ---
    { id: 'ELV', pos: [0, 0], description: 'Elevator Vestibule Area' },
    { id: 'C1', pos: [0, -5], description: 'Main Corridor - Point 1' },
    { id: 'C2', pos: [0, -10], description: 'Main Corridor - Junction 1 (MDR/O&D)' },
    { id: 'C3', pos: [0, -15], description: 'Main Corridor - Point 3' },
    { id: 'C4', pos: [0, -20], description: 'Main Corridor - Junction 2 (Wellness/Break)' },
    { id: 'C5', pos: [0, -25], description: 'Main Corridor - Point 5' },

    // --- MDR Wing (Right Side) ---
    { id: 'J_MDR', pos: [2, -10], description: 'Junction towards MDR' },
    { id: 'MDR1', pos: [5, -10], description: 'MDR Department Area' },

    // --- O&D Wing (Left Side) ---
    { id: 'J_OD', pos: [-2, -10], description: 'Junction towards O&D' },
    { id: 'OD1', pos: [-5, -10], description: 'O&D Department Area' },

    // --- Wellness Wing (Right Side) ---
    { id: 'J_WELL', pos: [2, -20], description: 'Junction towards Wellness' },
    { id: 'WELL1', pos: [5, -20], description: 'Wellness Department Area' },

    // --- Break Room Wing (Left Side) ---
    { id: 'J_BREAK', pos: [-2, -20], description: 'Junction towards Break Room' },
    { id: 'BREAK1', pos: [-5, -20], description: 'Break Room Area' },

    // --- Perpetuity Wing (Straight Ahead) ---
    { id: 'J_PERP', pos: [0, -30], description: 'Junction towards Perpetuity (Same as C6)' },
    { id: 'PERP1', pos: [0, -33], description: 'Perpetuity Wing Area' },

    // --- Security Wing (Left Side - Further Down) ---
    { id: 'J_SEC', pos: [-2, -30], description: 'Junction towards Security' },
    { id: 'SEC1', pos: [-5, -30], description: 'Security Department Area' },

    // --- Testing Wing (Right Side - Further Down) ---
    { id: 'J_TEST', pos: [2, -30], description: 'Junction towards Testing' },
    { id: 'TEST1', pos: [5, -30], description: 'Testing Department Area' },
  ],
  edges: [
    // --- Main Corridor ---
    { from: 'ELV', to: 'C1', description: 'Elevator to Main Corridor 1' },
    { from: 'C1', to: 'C2', description: 'Main Corridor 1 to Junction 1' },
    { from: 'C2', to: 'C3', description: 'Junction 1 to Main Corridor 3' },
    { from: 'C3', to: 'C4', description: 'Main Corridor 3 to Junction 2' },
    { from: 'C4', to: 'C5', description: 'Junction 2 to Main Corridor 5' },

    // --- MDR Wing ---
    { from: 'C2', to: 'J_MDR', description: 'Main Corridor to MDR Junction' },
    { from: 'J_MDR', to: 'MDR1', description: 'MDR Junction to MDR Area' },

    // --- O&D Wing ---
    { from: 'C2', to: 'J_OD', description: 'Main Corridor to O&D Junction' },
    { from: 'J_OD', to: 'OD1', description: 'O&D Junction to O&D Area' },

    // --- Wellness Wing ---
    { from: 'C4', to: 'J_WELL', description: 'Main Corridor to Wellness Junction' },
    { from: 'J_WELL', to: 'WELL1', description: 'Wellness Junction to Wellness Area' },

    // --- Break Room Wing ---
    { from: 'C4', to: 'J_BREAK', description: 'Main Corridor to Break Room Junction' },
    { from: 'J_BREAK', to: 'BREAK1', description: 'Break Room Junction to Break Room Area' },

    // --- Main Corridor (continued) ---
    { from: 'C5', to: 'C6', description: 'Main Corridor 5 to Junction 3' },
    { from: 'C6', to: 'C7', description: 'Junction 3 to End Point' }, // Example end

    // --- Perpetuity Wing ---
    { from: 'C6', to: 'PERP1', description: 'Main Corridor to Perpetuity Area' },

    // --- Security Wing ---
    { from: 'C6', to: 'J_SEC', description: 'Main Corridor to Security Junction' },
    { from: 'J_SEC', to: 'SEC1', description: 'Security Junction to Security Area' },

    // --- Testing Wing ---
    { from: 'C6', to: 'J_TEST', description: 'Main Corridor to Testing Junction' },
    { from: 'J_TEST', to: 'TEST1', description: 'Testing Junction to Testing Area' },
  ]
};