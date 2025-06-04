precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 lightColor;      // Base color of the fluorescent light
uniform float intensity;      // Overall light intensity
uniform float flicker;        // Flicker intensity (0-1)
uniform float time;          // Time for animation
uniform vec2 resolution;     // Screen resolution

// Noise function for natural light variation
float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    // Calculate base light color
    vec3 color = lightColor;
    
    // Add subtle cyan tint characteristic of fluorescent lights
    color *= vec3(0.95, 1.0, 1.0);
    
    // Calculate distance falloff
    float distanceFromCenter = length(vUv - 0.5);
    float falloff = 1.0 - smoothstep(0.0, 0.5, distanceFromCenter);
    
    // Add subtle flicker effect
    float flickerNoise = noise(vec2(time * 10.0, 0.0));
    float flickerAmount = 1.0 - (flicker * 0.1 * flickerNoise);
    
    // Add subtle color variation
    float variation = noise(vUv + time * 0.1) * 0.05;
    
    // Calculate final color with all effects
    vec3 finalColor = color * intensity * falloff * flickerAmount;
    finalColor += vec3(variation);
    
    // Add subtle bloom effect
    float bloom = smoothstep(0.7, 1.0, falloff) * 0.2;
    finalColor += bloom * lightColor;
    
    // Output final color with slight transparency for glow
    gl_FragColor = vec4(finalColor, 0.95);
} 