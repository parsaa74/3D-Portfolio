precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec4 vWorldPosition;

uniform vec3 baseColor;        // Base wall color
uniform float roughness;       // Surface roughness
uniform float dirtiness;       // Subtle wall aging/dirtiness (0-1)
uniform vec2 resolution;       // Screen resolution
uniform float time;           // Time for subtle animation

// Noise functions for wall texture
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Smooth interpolation
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    // Start with base color
    vec3 color = baseColor;
    
    // Add subtle wall texture
    float scale = 50.0; // Scale of the texture
    vec2 scaledUv = vUv * scale;
    
    // Layer several noise patterns for more natural look
    float texturePattern = 
        0.5 * noise(scaledUv) +
        0.25 * noise(scaledUv * 2.0) +
        0.125 * noise(scaledUv * 4.0);
    
    // Add very subtle movement to simulate air circulation effects
    float movement = noise(scaledUv + time * 0.01) * 0.02;
    
    // Add institutional patterns - subtle grid effect
    float gridPattern = 
        smoothstep(0.45, 0.55, fract(vUv.x * 20.0)) * 
        smoothstep(0.45, 0.55, fract(vUv.y * 20.0)) * 
        0.02;
    
    // Combine patterns
    float pattern = texturePattern + movement + gridPattern;
    
    // Add aging/dirtiness in corners and edges
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float aging = (1.0 - smoothstep(0.0, 0.1, edgeDistance)) * dirtiness;
    
    // Apply patterns to color
    color = mix(color, color * (0.98 + pattern), 0.5);
    color = mix(color, color * 0.95, aging);
    
    // Add slight darkening near edges for depth
    color *= 0.98 + edgeDistance * 0.02;
    
    // Calculate fresnel effect for subtle reflection
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
    color = mix(color, vec3(1.0), fresnel * 0.02);
    
    gl_FragColor = vec4(color, 1.0);
} 