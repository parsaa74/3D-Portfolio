// Procedural Acoustic Ceiling Tiles - Perfect for Office/Corporate Environment
// Creates realistic drop ceiling with subtle variations and depth

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vUv;

// Smooth noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth interpolated noise
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Four corners
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal noise for texture
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Create acoustic tile grid pattern
float acousticTiles(vec2 uv) {
    // Scale for 2x2 foot tiles (common office ceiling size)
    vec2 tileUV = uv * 8.0; // 8 tiles across a standard corridor
    
    // Create tile grid
    vec2 gridUV = fract(tileUV);
    vec2 tileID = floor(tileUV);
    
    // Tile border (recessed channels between tiles)
    float border = 0.05; // Border width
    float borderX = smoothstep(0.0, border, gridUV.x) * smoothstep(1.0, 1.0 - border, gridUV.x);
    float borderY = smoothstep(0.0, border, gridUV.y) * smoothstep(1.0, 1.0 - border, gridUV.y);
    float tileMask = borderX * borderY;
    
    // Subtle tile variations based on tile ID
    float tileVariation = noise(tileID) * 0.08 - 0.04; // ±4% variation
    
    // Acoustic holes pattern (small perforations)
    vec2 holeUV = fract(gridUV * 32.0); // 32 holes per tile
    float holeDistance = length(holeUV - 0.5);
    float holes = 1.0 - smoothstep(0.15, 0.25, holeDistance); // Small circular holes
    holes *= 0.1; // Subtle depth for acoustic holes
    
    return tileMask * (1.0 + tileVariation) - holes;
}

void main() {
    vec2 uv = vUv;
    
    // Base ceiling color - bright white for corporate feel
    vec3 baseColor = vec3(0.98, 0.98, 1.0); // Slightly cool white
    
    // Create acoustic tile pattern
    float tilePattern = acousticTiles(uv);
    
    // Add subtle texture variation using fractal noise
    float textureNoise = fbm(uv * 16.0) * 0.05; // Very subtle
    
    // Combine patterns
    float ceilingBrightness = tilePattern + textureNoise;
    
    // Apply brightness variations
    vec3 color = baseColor * (0.92 + ceilingBrightness * 0.16);
    
    // Add very subtle warm highlights in recessed areas
    float warmth = (1.0 - tilePattern) * 0.02;
    color.r += warmth;
    color.g += warmth * 0.8;
    
    // Ensure brightness for physically correct lighting
    color = clamp(color, 0.85, 1.0); // Keep it bright
    
    gl_FragColor = vec4(color, 1.0);
} 