# Severance: The Game - Project Overview

## Project Type and Goals

**Project Type:** 3D Web Application / Browser-based Game

**Primary Objectives:**

- Recreate the severed floor from the Apple TV+ show "Severance" using Three.js
- Provide an immersive, interactive experience that matches the show's aesthetic
- Implement realistic first-person navigation through the Lumon Industries environment
- Maintain high performance (60 FPS target) while delivering authentic visuals

## System Architecture

The project follows a modular, component-based architecture structured around the following key components:

### Core Systems

- **Game Engine:** Central coordinator that initializes and manages the game loop, renderer, and core systems
- **GameLoop:** Manages the render/update cycle and timing
- **Environment System:** Handles the creation and management of 3D spaces and assets
- **Movement System:** Controls player navigation and camera controls
- **Physics System:** Handles collision detection and physical interactions

### Rendering Pipeline

- **Three.js Renderer:** Main 3D rendering engine
- **Environment Management:** Handles scene setup, materials, lighting, and environment maps
- **Post-processing:** Visual effects for enhancing the Severance aesthetic
- **Performance Monitoring:** Tools to ensure consistent frame rates

### Input Management

- **Pointer Lock Controls:** For mouse-based camera movement
- **Keyboard Input:** For character movement (WASD/arrow keys)

## Technology Stack

### Core Technologies

- **JavaScript (ES6+):** Primary programming language
- **Three.js:** 3D rendering library for WebGL
- **Cannon.js:** Physics engine for realistic collisions
- **Vite:** Build tool and development server

### Development Tools

- **Vitest:** Testing framework
- **JSDoc:** Documentation generator
- **Node.js:** JavaScript runtime for development tools
- **npm:** Package management

### Asset Pipeline

- **GLTF/GLB:** 3D model format
- **Draco Compression:** For optimized 3D models
- **HDR/RGBE:** High dynamic range environment maps

## Key Features and Modules

### Environment

- **Corridor System:** Recreates the distinctive Lumon corridors with authentic materials
- **Lighting System:** Implements the characteristic fluorescent lighting of the office spaces
- **Materials Library:** Custom materials that match Severance's visual style

### Player Experience

- **First-Person Controls:** Mouse look and keyboard movement
- **Collision Detection:** Prevents walking through walls and objects
- **Interaction System:** Allows interaction with environment elements

### Rendering Features

- **PBR Materials:** Physically-based rendering for realistic surfaces
- **Ambient Occlusion:** For realistic shadowing in corners and crevices
- **Custom Shaders:** For specific visual effects matching the show

### User Interface

- **HUD Elements:** Location indicators and control information
- **Transition Screens:** Elevator transitions between areas
- **Loading Screens:** Welcome screens and loading indicators

## Data Flow

### Input Processing

1. User input (mouse/keyboard) is captured through event listeners
2. Input is processed by the movement system
3. Physics system validates movement requests
4. Camera and character positions are updated

### Rendering Pipeline

1. Game loop triggers update cycle
2. Environment and object states are updated
3. Physics calculations are processed
4. Scene is rendered via Three.js WebGLRenderer
5. Performance stats are updated

### Asset Loading

1. Assets are requested via Three.js loaders (GLTFLoader, TextureLoader, etc.)
2. Assets are processed and optimized (Draco decompression, etc.)
3. Materials and geometries are created and cached for reuse
4. Scene graph is updated with new objects

## Development and Deployment

### Development Environment

- **Local Development:** Vite dev server with hot module replacement
- **Testing:** Vitest for unit and integration tests
- **Version Control:** Git with feature branch workflow

### Performance Optimization

- **Geometry Sharing:** Reuse of geometries across instances
- **Material Caching:** Shared materials to reduce GPU state changes
- **Frustum Culling:** Rendering only what's visible to the camera
- **Draco Compression:** For optimized 3D models

### Deployment Strategy

- **Static Site:** Built as a static web application
- **Asset Optimization:** Compressed textures and models
- **Progressive Loading:** Essential assets first, background loading for others

## Visual Aids

```
Project Structure
┌─────────────────┐
│  Game Engine    │
├─────────────────┤
│     GameLoop    │
└───────┬─────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│                  Systems                     │
├───────────┬───────────┬──────────┬──────────┤
│Environment│ Movement  │ Physics  │  Input   │
└───────────┴───────────┴──────────┴──────────┘
        │           │         │         │
        ▼           ▼         ▼         ▼
┌─────────────────────────────────────────────┐
│               Three.js Core                  │
├───────────┬───────────┬──────────┬──────────┤
│  Scene    │ Renderer  │ Camera   │Materials │
└───────────┴───────────┴──────────┴──────────┘
```

## Additional Resources

### Code Organization

- **src/core/:** Core game engine components
- **src/systems/:** Game system modules (environment, physics, input, etc.)
- **src/utils/:** Utility functions and helpers
- **assets/:** Game assets (textures, models, sounds)
- **public/:** Static files served as-is

### Asset Requirements

- **Textures:** Wall, floor, ceiling, door, trim textures
- **Models:** Door, chair, desk 3D models

## Potential Questions/Clarifications

1. **Performance Considerations:**

   - What are the target devices/browsers?
   - Are there specific optimization techniques for lower-end devices?

2. **Asset Management:**

   - What is the asset loading strategy (eager vs. lazy loading)?
   - How are assets organized and referenced in the codebase?

3. **Game Mechanics:**

   - What interactions are available beyond basic movement?
   - Are there gameplay objectives or is it primarily an exploration experience?

4. **Show Authenticity:**

   - What specific elements from Severance are critical to recreate?
   - How closely does the game need to match the show's visual style?

5. **Code Structure:**
   - What is the relationship between systems like corridorSystem and the environment classes?
   - How is state managed between different systems?
