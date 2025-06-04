import * as THREE from 'three';

// --- Constants ---
const RAIN_COUNT = 15000;
const SPLASH_COUNT = 1000;
const RAIN_COLOR = 0xaaaaaa;
const RAIN_SIZE = 0.03;
const RAIN_OPACITY = 0.6;
const SPLASH_COLOR = 0xaaaaaa;
const SPLASH_SIZE = 0.05;
const SPLASH_OPACITY = 0.4;
const GRAVITY = 9.8; // World units per second squared
const RAIN_MIN_Y_VEL = -3.0;
const RAIN_Y_VEL_RANGE = 2.0;
const RAIN_XZ_VEL_RANGE = 0.1;
const SPLASH_MIN_LIFETIME = 0.5;
const SPLASH_LIFETIME_RANGE = 0.3;
const SPLASH_MIN_RADIAL_SPEED = 0.1;
const SPLASH_RADIAL_SPEED_RANGE = 0.2;
const SPLASH_MIN_Y_VEL = 0.2;
const SPLASH_Y_VEL_RANGE = 0.2;
const MIN_THUNDER_DELAY = 5000; // ms
const THUNDER_DELAY_RANGE = 15000; // ms
const RAIN_VOLUME_FACTOR = 0.3;
const WIND_VOLUME_FACTOR = 0.2;
// -----------------

// Custom vertex shader for teardrop-shaped raindrops
const rainVertexShader = `
uniform float size;
uniform float time;
attribute vec3 velocity;
attribute vec3 customColor;
varying vec3 vColor;
varying vec2 vUv;

void main() {
    vColor = customColor;
    vUv = vec2(0.5, 0.5); // Center UV for fragment shader
    
    // Scale based on velocity (falling faster = longer streaks)
    float speedFactor = min(1.0, length(velocity) / 5.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (300.0 / -mvPosition.z) * (0.5 + speedFactor * 0.5);
}
`;

// Custom fragment shader for teardrop-shaped raindrops
const rainFragmentShader = `
uniform float opacity;
varying vec3 vColor;
varying vec2 vUv;
void main() {
    // Calculate distance from center of point
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distance = length(uv);
    
    // Create teardrop shape - narrower at the bottom, rounder at the top
    float tearShape = smoothstep(0.5, 0.0, distance + uv.y * 0.25);
    
    // Apply droplet color with opacity
    gl_FragColor = vec4(vColor, opacity * tearShape);
    
    // Discard pixels outside the teardrop
    if (tearShape < 0.1) discard;
}
`;

/**
 * RainSystem - Creates and manages a realistic rain storm effect with audio
 */
export class RainSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isOutdoors = false;
        this.enabled = false;
        this.intensity = 1.0; // 0 to 1 scale for rain intensity

        // Initialize thunder sounds array
        this.thunderSounds = [];

        // Rain particle system setup
        this.rainCount = RAIN_COUNT;
        this.rainGeometry = new THREE.BufferGeometry();
        
        // Create custom shader material for teardrop-shaped particles
        this.rainMaterial = new THREE.ShaderMaterial({
            uniforms: {
                size: { value: RAIN_SIZE * 10.0 }, // Larger size to compensate for shape
                opacity: { value: RAIN_OPACITY },
                time: { value: 0.0 },
            },
            vertexShader: rainVertexShader,
            fragmentShader: rainFragmentShader,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        // Create rain drop positions and velocities
        this.positions = new Float32Array(this.rainCount * 3);
        this.velocities = new Float32Array(this.rainCount * 3);
        this.colors = new Float32Array(this.rainCount * 3);

        // Rain system bounds (relative to camera)
        this.bounds = {
            minX: -50, maxX: 50,
            minY: 0, maxY: 30,
            minZ: -50, maxZ: 50
        };

        // Initialize rain particles
        this.initRainParticles();

        // Create rain points system
        this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
        this.rainParticles.frustumCulled = false; // We move it with the camera

        // Thunder timing
        this.lastThunderTime = 0;
        this.nextThunderDelay = this.getRandomThunderDelay();

        // Wind parameters
        this.windDirection = new THREE.Vector3(1, 0, 0); // Default wind direction
        this.windStrength = 0.5; // Default wind strength

        // Splash system setup
        this.initSplashSystem();

        // Optimization: Pre-calculate effect values used in update loop
        this.windEffectX = 0;
        this.windEffectZ = 0;
        this.gravityEffectY = 0;

        // Optimization: Index for next available splash particle
        this.nextSplashIndex = 0;

        this.fadeDuration = 1.0; // seconds
        this.fadeElapsed = 0;
        this.fading = false;
        this.targetOpacity = this.isOutdoors ? RAIN_OPACITY : 0.0;
        this.startOpacity = this.targetOpacity;

        this.ceilings = [];
    }

    /**
     * Initialize rain particle positions and properties
     * @private
     */
    initRainParticles() {
        const { minX, maxX, minY, maxY, minZ, maxZ } = this.bounds;
        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        const rangeZ = maxZ - minZ;

        for (let i = 0; i < this.rainCount; i++) {
            const i3 = i * 3;

            // Random position within bounds
            this.positions[i3    ] = Math.random() * rangeX + minX;
            this.positions[i3 + 1] = Math.random() * rangeY + minY;
            this.positions[i3 + 2] = Math.random() * rangeZ + minZ;

            // Velocity - mostly downward with slight variations based on constants
            this.velocities[i3    ] = (Math.random() - 0.5) * RAIN_XZ_VEL_RANGE; // X velocity
            this.velocities[i3 + 1] = RAIN_MIN_Y_VEL - Math.random() * RAIN_Y_VEL_RANGE; // Y velocity (downward)
            this.velocities[i3 + 2] = (Math.random() - 0.5) * RAIN_XZ_VEL_RANGE; // Z velocity

            // Colors - slight variations in grey
            const shade = 0.6 + Math.random() * 0.2;
            this.colors[i3    ] = shade;
            this.colors[i3 + 1] = shade;
            this.colors[i3 + 2] = shade;
        }

        // --- DEBUG: Check for NaN values after calculation ---
        let nanFound = false;
        for (let i = 0; i < this.positions.length; i++) {
            if (isNaN(this.positions[i])) {
                console.error(`NaN found in rain positions at index ${i}`);
                nanFound = true;
            }
        }
        if (nanFound) {
            console.error("Rain position buffer contains NaN values immediately after initialization!");
        } else {
            console.log("Rain position buffer initialization check passed (no NaN found).");
        }
        // --- END DEBUG ---

        // Set attributes
        this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.rainGeometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
        this.rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    }

    /**
     * Initialize splash effect system
     * @private
     */
    initSplashSystem() {
        // Create splash particles geometry
        this.splashCount = SPLASH_COUNT;
        this.splashGeometry = new THREE.BufferGeometry();
        this.splashMaterial = new THREE.PointsMaterial({
            color: SPLASH_COLOR,
            size: SPLASH_SIZE,
            transparent: true,
            opacity: SPLASH_OPACITY,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });

        // Splash particles data
        this.splashPositions = new Float32Array(this.splashCount * 3);
        this.splashVelocities = new Float32Array(this.splashCount * 3);
        this.splashLifetimes = new Float32Array(this.splashCount);

        // Initialize splash particles (all inactive initially)
        for (let i = 0; i < this.splashCount; i++) {
            this.splashLifetimes[i] = 0;
            // Optional: Initialize positions off-screen
            const i3 = i * 3;
            this.splashPositions[i3] = 0;
            this.splashPositions[i3+1] = -1000; // Way below ground
            this.splashPositions[i3+2] = 0;
        }

        this.splashGeometry.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));
        // We don't need to set velocity/lifetime as attributes if managed purely on CPU
        this.splashParticles = new THREE.Points(this.splashGeometry, this.splashMaterial);
        this.splashParticles.frustumCulled = false; // Splashes are local to impact points
    }

    /**
     * Enable the rain system
     */
    enable() {
        if (!this.enabled) {
            console.log("Enabling RainSystem");
            this.enabled = true;
            this.scene.add(this.rainParticles);
            // this.scene.add(this.splashParticles); // Add splashes too - TEMPORARILY COMMENTED OUT

            // Set initial visibility based on default state (usually indoors)
            if (this.rainParticles) {
                this.rainParticles.visible = this.isOutdoors;
            }

            // Start audio if outdoors
            if (this.isOutdoors) {
                this.startAudio();
            }
            // Reset thunder timer
            this.lastThunderTime = performance.now(); // Use performance.now for higher precision
            this.nextThunderDelay = this.getRandomThunderDelay();
        }
    }

    /**
     * Disable the rain system
     */
    disable() {
        if (this.enabled) {
            console.log("Disabling RainSystem");
            this.enabled = false;
            if (this.rainParticles.parent) this.scene.remove(this.rainParticles);
            if (this.splashParticles.parent) this.scene.remove(this.splashParticles);
            this.stopAudio();
        }
    }

    /**
     * Start playing rain audio effects
     * @private
     */
    startAudio() {
        console.log("RainSystem: Starting audio");
        if (this.rainSound && this.rainSound.buffer && !this.rainSound.isPlaying) {
            this.rainSound.play();
            this.rainSound.setVolume(this.isOutdoors ? RAIN_VOLUME_FACTOR : 0); // Set initial volume
        }
        if (this.windSound && this.windSound.buffer && !this.windSound.isPlaying) {
            this.windSound.play();
            this.windSound.setVolume(this.isOutdoors ? WIND_VOLUME_FACTOR : 0); // Set initial volume
        }
    }

    /**
     * Stop all rain audio effects
     * @private
     */
    stopAudio() {
        console.log("RainSystem: Stopping audio");
        if (this.rainSound && this.rainSound.isPlaying) {
            this.rainSound.stop();
        }
        if (this.windSound && this.windSound.isPlaying) {
            this.windSound.stop();
        }
        this.thunderSounds.forEach(thunder => {
            if (thunder && thunder.isPlaying) thunder.stop();
        });
    }

    /**
     * Get random delay for next thunder sound
     * @private
     * @returns {number} Delay in milliseconds
     */
    getRandomThunderDelay() {
        return MIN_THUNDER_DELAY + Math.random() * THUNDER_DELAY_RANGE;
    }

    /**
     * Play a random thunder sound
     * @private
     */
    playThunder() {
        // Guard against undefined thunderSounds
        if (!this.thunderSounds || !Array.isArray(this.thunderSounds)) {
            console.warn("[RainSystem] No thunder sounds available");
            return;
        }

        // Filter out sounds that haven't loaded yet or are already playing
        const availableSounds = this.thunderSounds.filter(sound => sound && sound.buffer && !sound.isPlaying);
        if (availableSounds.length > 0) {
            const index = Math.floor(Math.random() * availableSounds.length);
            const thunder = availableSounds[index];
            const volume = 0.6 + Math.random() * 0.4; // Random volume
            thunder.setVolume(volume);
            thunder.play();
            console.log(`RainSystem: Playing thunder sound ${index} at volume ${volume.toFixed(2)}`);
        }
    }

    /**
     * Set whether the player is outdoors and adjust audio volumes
     * @param {boolean} outdoors Whether the player is outdoors
     */
    setOutdoors(outdoors) {
        if (this.isOutdoors !== outdoors) {
            this.isOutdoors = outdoors;
            // --- Begin fade instead of instant toggle ---
            this.startOpacity = this.rainMaterial.uniforms.opacity.value;
            this.targetOpacity = outdoors ? RAIN_OPACITY : 0.0;
            this.fadeElapsed = 0;
            this.fading = true;
            // Always make visible when starting fade in
            if (this.rainParticles && outdoors) {
                this.rainParticles.visible = true;
            }
            // ---
            // Update audio volumes based on outdoor state if enabled
            if (this.enabled) {
                const targetRainVolume = outdoors ? RAIN_VOLUME_FACTOR * this.intensity : 0.0;
                const targetWindVolume = outdoors ? WIND_VOLUME_FACTOR * this.intensity : 0.0;
                // TODO: Implement smooth volume fading instead of instant change
                if (this.rainSound) this.rainSound.setVolume(targetRainVolume);
                if (this.windSound) this.windSound.setVolume(targetWindVolume);
            }
        }
    }

    /**
     * Set the intensity of the rain (affects visuals and audio)
     * @param {number} intensity Value between 0 and 1
     */
    setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(1, intensity)); // Clamp value
        console.log(`RainSystem: Setting intensity to ${this.intensity.toFixed(2)}`);

        // Adjust visual properties
        this.rainMaterial.uniforms.opacity.value = RAIN_OPACITY * this.intensity;
        // Could also adjust rainCount or size based on intensity if needed

        // Adjust audio volumes if outdoors
        if (this.isOutdoors && this.enabled) {
            const targetRainVolume = RAIN_VOLUME_FACTOR * this.intensity;
            const targetWindVolume = WIND_VOLUME_FACTOR * this.intensity;
            if (this.rainSound) this.rainSound.setVolume(targetRainVolume);
            if (this.windSound) this.windSound.setVolume(targetWindVolume);
        }
    }

    /**
     * Create a splash effect at the given position using the next available particle.
     * @private
     * @param {THREE.Vector3} position Position to create splash (should be on the ground).
     */
    createSplash(position) {
        const index = this.nextSplashIndex;
        const i3 = index * 3;

        // Set position
        this.splashPositions[i3    ] = position.x;
        this.splashPositions[i3 + 1] = position.y; // Should be ground level
        this.splashPositions[i3 + 2] = position.z;

        // Set velocity (radial pattern)
        const angle = Math.random() * Math.PI * 2;
        const radialSpeed = SPLASH_MIN_RADIAL_SPEED + Math.random() * SPLASH_RADIAL_SPEED_RANGE;
        this.splashVelocities[i3    ] = Math.cos(angle) * radialSpeed;
        this.splashVelocities[i3 + 1] = SPLASH_MIN_Y_VEL + Math.random() * SPLASH_Y_VEL_RANGE; // Upward component
        this.splashVelocities[i3 + 2] = Math.sin(angle) * radialSpeed;

        // Set lifetime
        this.splashLifetimes[index] = SPLASH_MIN_LIFETIME + Math.random() * SPLASH_LIFETIME_RANGE;

        // Move to the next splash index, wrapping around
        this.nextSplashIndex = (this.nextSplashIndex + 1) % this.splashCount;

        // No need to set needsUpdate here, it's done once per frame in update()
    }

    setCeilings(ceilingMeshes) {
        this.ceilings = ceilingMeshes || [];
    }

    /**
     * Update the rain system state
     * @param {number} deltaTime Time since last update in seconds
     */
    update(deltaTime) {
        // Guard: deltaTime must be a valid, positive number
        if (!this.enabled || typeof deltaTime !== 'number' || !isFinite(deltaTime) || deltaTime <= 0) {
            if (typeof deltaTime !== 'number' || !isFinite(deltaTime)) {
                console.error('RainSystem: Invalid deltaTime in update:', deltaTime);
            }
            return; // Don't update if disabled or no time passed or invalid deltaTime
        }

        // Update time uniform for the shader animation
        if (this.rainMaterial.uniforms.time) {
            this.rainMaterial.uniforms.time.value += deltaTime;
        }

        // --- Pre-calculate frame-specific values ---
        this.windEffectX = this.windDirection.x * this.windStrength * deltaTime;
        this.windEffectZ = this.windDirection.z * this.windStrength * deltaTime;
        this.gravityEffectY = GRAVITY * deltaTime;
        // ---

        const rainPosAttr = this.rainGeometry.attributes.position;
        const splashPosAttr = this.splashGeometry.attributes.position;

        // Update rain particle positions
        for (let i = 0; i < this.rainCount; i++) {
            const i3 = i * 3;

            // Apply velocity and wind - USE this.velocities directly
            rainPosAttr.array[i3    ] += this.velocities[i3    ] * deltaTime + this.windEffectX;
            rainPosAttr.array[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
            rainPosAttr.array[i3 + 2] += this.velocities[i3 + 2] * deltaTime + this.windEffectZ;

            // --- Ceiling occlusion check ---
            // For each ceiling, check if the particle is under it
            let underCeiling = false;
            const particleWorld = new THREE.Vector3(
                rainPosAttr.array[i3],
                rainPosAttr.array[i3 + 1],
                rainPosAttr.array[i3 + 2]
            );
            // Transform to world space (rainParticles is centered on camera)
            if (this.rainParticles && this.rainParticles.parent) {
                this.rainParticles.updateMatrixWorld();
                particleWorld.applyMatrix4(this.rainParticles.matrixWorld);
            }
            for (const ceiling of this.ceilings) {
                ceiling.updateMatrixWorld();
                // Use bounding box for quick check
                if (!ceiling.geometry.boundingBox) {
                    ceiling.geometry.computeBoundingBox();
                }
                const box = ceiling.geometry.boundingBox.clone();
                box.applyMatrix4(ceiling.matrixWorld);
                if (box.containsPoint(particleWorld)) {
                    underCeiling = true;
                    break;
                }
            }
            if (underCeiling) {
                // Move particle to top (respawn)
                rainPosAttr.array[i3    ] = Math.random() * (this.bounds.maxX - this.bounds.minX) + this.bounds.minX;
                rainPosAttr.array[i3 + 1] = this.bounds.maxY;
                rainPosAttr.array[i3 + 2] = Math.random() * (this.bounds.maxZ - this.bounds.minZ) + this.bounds.minZ;
                continue;
            }

            // NaN guard: If any position is NaN, reset this particle and log
            if (
                !isFinite(rainPosAttr.array[i3]) ||
                !isFinite(rainPosAttr.array[i3 + 1]) ||
                !isFinite(rainPosAttr.array[i3 + 2])
            ) {
                console.warn(`RainSystem: NaN detected in rain particle ${i}, resetting.`);
                // Reset particle to a random position at the top
                rainPosAttr.array[i3    ] = Math.random() * (this.bounds.maxX - this.bounds.minX) + this.bounds.minX;
                rainPosAttr.array[i3 + 1] = this.bounds.maxY;
                rainPosAttr.array[i3 + 2] = Math.random() * (this.bounds.maxZ - this.bounds.minZ) + this.bounds.minZ;
            }

            // Check bounds and reset particles that hit the ground
            if (rainPosAttr.array[i3 + 1] < this.bounds.minY) {
                // Create splash effect if outdoors
                if (this.isOutdoors) {
                    // Reuse Vector3 to avoid allocations or pass primitives
                    this.createSplash({
                        x: rainPosAttr.array[i3],
                        y: this.bounds.minY,
                        z: rainPosAttr.array[i3 + 2]
                    });
                }

                // Reset particle to a random position at the top
                rainPosAttr.array[i3    ] = Math.random() * (this.bounds.maxX - this.bounds.minX) + this.bounds.minX;
                rainPosAttr.array[i3 + 1] = this.bounds.maxY; // Start from the top
                rainPosAttr.array[i3 + 2] = Math.random() * (this.bounds.maxZ - this.bounds.minZ) + this.bounds.minZ;
            }
        }
        rainPosAttr.needsUpdate = true; // Mark buffer for update

        // Update splash particles
        let activeSplashes = 0;
        for (let i = 0; i < this.splashCount; i++) {
            if (this.splashLifetimes[i] > 0) {
                activeSplashes++;
                const i3 = i * 3;

                // Update position based on velocity
                splashPosAttr.array[i3    ] += this.splashVelocities[i3] * deltaTime;
                splashPosAttr.array[i3 + 1] += this.splashVelocities[i3 + 1] * deltaTime;
                splashPosAttr.array[i3 + 2] += this.splashVelocities[i3 + 2] * deltaTime;

                // NaN guard: If any position is NaN, reset this splash and log
                if (
                    !isFinite(splashPosAttr.array[i3]) ||
                    !isFinite(splashPosAttr.array[i3 + 1]) ||
                    !isFinite(splashPosAttr.array[i3 + 2])
                ) {
                    console.warn(`RainSystem: NaN detected in splash particle ${i}, resetting.`);
                    // Move off-screen and deactivate
                    splashPosAttr.array[i3] = 0;
                    splashPosAttr.array[i3 + 1] = -1000;
                    splashPosAttr.array[i3 + 2] = 0;
                    this.splashLifetimes[i] = 0;
                    continue;
                }

                // Apply gravity to Y velocity
                this.splashVelocities[i3 + 1] -= this.gravityEffectY;

                // Decrease lifetime
                this.splashLifetimes[i] -= deltaTime;

                // Optional: Fade out splash particle based on lifetime
                // This requires managing opacity/color attributes or shader uniforms

            } else {
                 // Optimization: If particle is inactive, move it off-screen
                 // This prevents rendering dead particles at 0,0,0 if createSplash hasn't overwritten them yet
                 const i3 = i * 3;
                 if(splashPosAttr.array[i3 + 1] > -900) { // Check if not already off-screen
                    splashPosAttr.array[i3 + 1] = -1000;
                 }
            }
        }
        if (activeSplashes > 0) {
            splashPosAttr.needsUpdate = true; // Only update if any splashes were active
        }

        // Move rain system container relative to the camera position
        // This keeps the rain effect centered around the player
        if (this.camera) {
            // We move the *particles* relative to the container's origin (0,0,0)
            // The container itself follows the camera's XZ position.
            this.rainParticles.position.x = this.camera.position.x;
            this.rainParticles.position.z = this.camera.position.z;
            // Y position remains 0, as rain falls from the sky (defined by bounds.maxY relative to container)

             // Splashes happen at world coords, so their container should stay at origin
             this.splashParticles.position.set(0,0,0);

        }

        // Handle thunder timing
        if (this.isOutdoors && this.enabled) {
            const currentTime = performance.now();
            if (currentTime - this.lastThunderTime > this.nextThunderDelay) {
                this.playThunder();
                this.lastThunderTime = currentTime;
                this.nextThunderDelay = this.getRandomThunderDelay();
            }
        }

        // --- Handle rain fade in/out ---
        if (this.fading) {
            this.fadeElapsed += deltaTime;
            let t = Math.min(this.fadeElapsed / this.fadeDuration, 1.0);
            // Smoothstep for nicer fade
            t = t * t * (3 - 2 * t);
            const newOpacity = this.startOpacity + (this.targetOpacity - this.startOpacity) * t;
            this.rainMaterial.uniforms.opacity.value = newOpacity * this.intensity;
            if (t >= 1.0) {
                this.fading = false;
                this.rainMaterial.uniforms.opacity.value = this.targetOpacity * this.intensity;
                // Only hide particles if fully faded out
                if (this.rainParticles && this.targetOpacity === 0.0) {
                    this.rainParticles.visible = false;
                }
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        console.log("Disposing RainSystem");
        this.disable(); // Ensure scene removal and audio stop

        // Dispose geometries
        this.rainGeometry?.dispose();
        this.splashGeometry?.dispose();

        // Dispose materials
        this.rainMaterial?.dispose();
        this.splashMaterial?.dispose();

        // Clean up audio
        if (this.rainSound) {
            this.rainSound.disconnect();
        }
        if (this.windSound) {
            this.windSound.disconnect();
        }
        this.thunderSounds.forEach(thunder => thunder?.disconnect());

        // Nullify references
        this.scene = null;
        this.camera = null;
        this.rainParticles = null;
        this.splashParticles = null;
        // ... other references
    }
} 