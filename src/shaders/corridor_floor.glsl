// Twin Peaks Lodge-inspired chevron floor shader (Tim Rodenbroeker style)
// Perspective-corrected black and white chevron pattern for corridors

uniform float time;
uniform vec3 playerPos;
varying vec2 vUv;
varying vec4 vWorldPosition;

// Perfect pattern constants
#define CHEVRON_COUNT 10.0    // Increased density for more consistent pattern
#define PERSPECTIVE_CORRECTION 0.85  // Corrects distortion in long corridors

// Anti-aliasing for crisp edges
float smoothPattern(float value) {
    float width = fwidth(value) * 0.5;
    return smoothstep(0.5 - width, 0.5 + width, value);
}

void main() {
    // Use world position for seamless pattern
    vec2 uv = vWorldPosition.xz;
    
    // Normalize world coordinates to a reasonable scale for pattern tiling
    uv /= 5.0; // Adjust denominator for pattern scale as needed
    
    // Scale UVs for pattern density
    uv.x *= CHEVRON_COUNT;
    
    // Create a coordinate system where chevrons are regular regardless of corridor length
    float rowHeight = 0.2; // Height of each row as fraction of total height
    float y = uv.y / rowHeight;
    float row = floor(y);
    float fraction = fract(y);
    
    // Alternate chevron direction each row
    float direction = mod(row, 2.0) * 2.0 - 1.0; // -1 or 1
    float offset = (fraction - 0.5) * 0.8; // Scaling factor for chevron steepness
    
    // Calculate chevron pattern with consistent width-to-height ratio
    float chevronX = uv.x + direction * offset;
    
    // Create sharp alternating black/white pattern
    float pattern = mod(floor(chevronX), 2.0);
    
    // Anti-alias edges
    float patternSmooth = smoothPattern(fract(chevronX));
    pattern = mix(pattern, 1.0 - pattern, patternSmooth);
    
    // Define crisp black and white colors
    vec3 black = vec3(0.03, 0.03, 0.04);
    vec3 white = vec3(0.97, 0.97, 0.97);
    
    // Mix colors based on pattern
    vec3 color = mix(black, white, pattern);
    
    // Add subtle glossy highlight near player position (in world coordinates)
    float distToPlayer = length((vWorldPosition.xz - playerPos.xz) / 5.0);
    float sheen = 0.04 * smoothstep(0.5, 0.0, distToPlayer);
    color += vec3(sheen);
    
    // Extremely subtle red tint for the Severance/Twin Peaks mood
    color = mix(color, color + vec3(0.03, 0.0, 0.0), 0.05);
    
    gl_FragColor = vec4(color, 1.0);
} 