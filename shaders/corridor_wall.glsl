// Red Dreamscape - The Most Beautiful Red Shader
// A symphony of crimson, scarlet, and rose dancing in digital poetry

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_depth;
varying vec2 vUv;

// Mathematical constants for divine proportions
#define PHI 1.618033988749
#define TAU 6.283185307179
#define E 2.718281828459

// Smooth minimum for organic blending
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Enhanced hash functions
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(vec2(p.x * p.y, p.x + p.y));
}

// Quintic interpolated noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// Advanced domain warping
vec2 domainWarp(vec2 p, float time) {
    vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0), 4),
        fbm(p + vec2(5.2, 1.3), 4)
    );
    
    vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * time, 4),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * time, 4)
    );
    
    return p + 0.3 * r;
}

// Crimson plasma effect
float crimsonPlasma(vec2 uv, float time) {
    float t = time * 0.7;
    return sin(uv.x * 12.0 + t) +
           sin(uv.y * 9.0 + t * 1.3) +
           sin((uv.x + uv.y) * 8.0 + t * 0.9) +
           sin(sqrt(uv.x * uv.x + uv.y * uv.y) * 15.0 + t * 1.8);
}

// Organic Voronoi cells
float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float minDist = 1.0;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i + neighbor);
            point = 0.5 + 0.5 * sin(u_time * 0.6 + TAU * point);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }
    return minDist;
}

// Flowing ruby energy lines
float rubyLines(vec2 p, float time) {
    float lines = 0.0;
    for(int i = 0; i < 4; i++) {
        float fi = float(i);
        float angle = time * 0.4 + fi * TAU / 4.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        float line = abs(dot(p - 0.5, dir));
        float wave = sin(line * 25.0 - time * 3.0 + fi * 1.5);
        lines += exp(-line * 12.0) * (0.6 + 0.4 * wave);
    }
    return lines;
}

// Red palette with infinite variations
vec3 redPalette(float t, float intensity) {
    // Base red colors
    vec3 deepCrimson = vec3(0.8, 0.0, 0.0);     // Deep red
    vec3 brightScarlet = vec3(1.0, 0.2, 0.1);   // Bright scarlet
    vec3 roseGold = vec3(1.0, 0.4, 0.3);        // Rose gold
    vec3 darkMaroon = vec3(0.5, 0.0, 0.0);      // Dark maroon
    vec3 crimsonGlow = vec3(1.0, 0.1, 0.2);     // Glowing crimson
    
    // Complex mixing using trigonometric functions
    float phase1 = t * TAU;
    float phase2 = t * TAU * PHI;
    float phase3 = t * TAU * E;
    
    vec3 mix1 = mix(deepCrimson, brightScarlet, 0.5 + 0.5 * sin(phase1));
    vec3 mix2 = mix(roseGold, darkMaroon, 0.5 + 0.5 * sin(phase2));
    vec3 mix3 = mix(crimsonGlow, mix1, 0.5 + 0.5 * sin(phase3));
    
    vec3 result = mix(mix2, mix3, 0.5 + 0.5 * cos(phase1 * 0.7));
    
    // Add subtle golden highlights
    float goldHighlight = pow(sin(t * TAU * 2.0), 8.0) * 0.3;
    result += vec3(goldHighlight, goldHighlight * 0.5, 0.0);
    
    return result * intensity;
}

// Pulsing heartbeat effect
float heartbeat(float time) {
    float beat = time * 2.5;
    float pulse1 = exp(-mod(beat, 1.0) * 8.0);
    float pulse2 = exp(-(mod(beat + 0.3, 1.0)) * 12.0) * 0.6;
    return pulse1 + pulse2;
}

// Liquid fire distortion
vec2 liquidFire(vec2 p, float time) {
    float t = time * 0.8;
    vec2 flow = vec2(
        sin(p.y * 3.0 + t) * 0.1,
        cos(p.x * 2.0 + t * 1.2) * 0.08
    );
    
    // Add swirling motion
    vec2 center = p - 0.5;
    float angle = atan(center.y, center.x);
    float radius = length(center);
    float swirl = sin(radius * 8.0 - t * 2.0) * 0.05;
    
    flow += vec2(cos(angle + swirl), sin(angle + swirl)) * radius * 0.1;
    
    return p + flow;
}

// Velvet curtain folds (vertical sine waves)
float curtainFolds(vec2 uv, float time) {
    float folds = sin(uv.x * 18.0 + sin(time * 0.2) * 0.5) * 0.18;
    folds += sin(uv.x * 6.0 + time * 0.1) * 0.08;
    folds += sin(uv.x * 2.0) * 0.04;
    return folds;
}

// Increase saturation of a color
vec3 saturate(vec3 color, float amount) {
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luma), color, amount);
}

void main() {
    vec2 uv = vUv;
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    float time = u_time;
    vec2 mouse = u_mouse / u_resolution;
    // Mouse interaction with smooth following
    st += (mouse - 0.5) * 1.5;
    // Apply curtain folds
    float folds = curtainFolds(uv, time);
    // Deep red velvet base
    vec3 baseRed = vec3(0.694, 0.122, 0.102); // Twin Peaks Red
    vec3 highlightRed = vec3(1.0, 0.0, 0.0); // pure red for extra saturation
    float foldShade = 0.5 + 0.5 * folds;
    vec3 color = mix(baseRed, highlightRed, foldShade * 0.7 + 0.3);
    // Subtle vertical gradient for depth
    float verticalGrad = smoothstep(0.0, 1.0, uv.y);
    color *= 0.9 + 0.2 * verticalGrad;
    // Strong vignette for mystery
    float vignette = 1.0 - pow(length(uv - 0.5) * 1.25, 2.2);
    vignette = clamp(vignette, 0.0, 1.0);
    color *= vignette * 1.1;
    // Add a soft shadow at the bottom
    float bottomShadow = smoothstep(0.0, 0.18, uv.y);
    color *= 0.92 + 0.08 * bottomShadow;
    // Optional: very subtle heartbeat pulse for unease
    float pulse = 0.98 + 0.04 * heartbeat(time);
    color *= pulse;
    // Minimal tone mapping to keep red strong
    color = color / (0.7 + color * 0.5);
    // Boost saturation
    color = saturate(color, 1.05);
    // Darken the final color by 10%
    color *= 0.5;
    // No color boosting, preserve Twin Peaks Red hue
    gl_FragColor = vec4(color, 1.0);
}