// CODE Room Floor Shader (Tim Rodenbroeker style)
// Generative grid pattern with dynamic highlights based on player position

uniform float time;
uniform vec3 playerPos;
varying vec2 vUv;

// Pattern constants
#define GRID_SIZE 20.0
#define SMALL_GRID_SIZE 4.0
#define LINE_WIDTH 0.03
#define NODE_RADIUS 0.15
#define MAX_NODES 5

// Helper for anti-aliasing
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

// Create a grid pattern
float grid(vec2 uv, float size, float lineWidth) {
    vec2 grid = fract(uv * size);
    vec2 smoothWidth = vec2(lineWidth) / size;
    vec2 gridLines = smoothstep(vec2(0.0), smoothWidth, grid) * 
                    (1.0 - smoothstep(vec2(1.0) - smoothWidth, vec2(1.0), grid));
    return max(gridLines.x, gridLines.y);
}

// Create a circular node
float node(vec2 uv, vec2 position, float radius) {
    float dist = distance(uv, position);
    return 1.0 - smoothstep(radius - 0.01, radius, dist);
}

// Generate stable random value
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    // Get normalized UV coordinates
    vec2 uv = vUv;
    
    // Create base grid
    float mainGrid = grid(uv, GRID_SIZE, LINE_WIDTH);
    float subGrid = grid(uv, GRID_SIZE * SMALL_GRID_SIZE, LINE_WIDTH * 0.5);
    
    // Calculate base color from grid
    vec3 baseColor = vec3(0.1, 0.1, 0.12);
    vec3 gridColor = vec3(0.34, 0.85, 0.53); // green similar to 0x34a853
    vec3 color = mix(baseColor, gridColor, mainGrid * 0.7);
    color = mix(color, gridColor * 0.7, subGrid * 0.3);
    
    // Add nodes at grid intersections
    for (int i = 0; i < MAX_NODES; i++) {
        // Stable node positions based on index
        float ix = float(i) / float(MAX_NODES);
        vec2 nodePos = vec2(
            0.1 + 0.8 * fract(sin(ix * 234.5) * 43758.5453123),
            0.1 + 0.8 * fract(cos(ix * 598.3) * 13758.5123891)
        );
        
        // Make nodes pulse based on time
        float pulse = 0.5 + 0.5 * sin(time * (0.5 + ix) + ix * 10.0);
        float nodeSize = NODE_RADIUS * (0.7 + 0.3 * pulse);
        
        // Create node and add to color
        float nodeValue = node(uv, nodePos, nodeSize);
        vec3 nodeColor = mix(
            gridColor,
            vec3(0.7, 0.9, 0.8), 
            pulse
        );
        color = mix(color, nodeColor, nodeValue * pulse);
        
        // Add subtle glow around node
        float glowRadius = nodeSize * 3.0;
        float glow = (1.0 - smoothstep(nodeSize, glowRadius, distance(uv, nodePos))) * 0.15 * pulse;
        color += nodeColor * glow;
    }
    
    // Add player highlight effect
    vec2 playerUV = playerPos.xz / 20.0 + vec2(0.5); // Convert player position to UV space
    float distToPlayer = distance(uv, playerUV);
    
    // Create radial highlight around player position
    float playerHighlight = 1.0 - smoothstep(0.0, 0.2, distToPlayer);
    color = mix(color, gridColor * 1.5, playerHighlight * 0.3);
    
    // Add subtle ripple effect from player
    float ripple = sin(distToPlayer * 20.0 - time * 2.0) * 0.5 + 0.5;
    ripple *= smoothstep(0.5, 0.0, distToPlayer); // Fade out with distance
    color += gridColor * ripple * 0.15;
    
    // Output final color
    gl_FragColor = vec4(color, 1.0);
} 