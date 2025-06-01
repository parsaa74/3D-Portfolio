precision highp float;

varying vec2 vUv;
uniform float time;

// Hash function for star placement
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    // Dreamy vertical gradient: deep blue to purple
    vec3 topColor = vec3(0.13, 0.09, 0.25);   // Deep purple
    vec3 midColor = vec3(0.10, 0.13, 0.30);   // Blueish
    vec3 bottomColor = vec3(0.04, 0.07, 0.18); // Near black
    float y = vUv.y;
    vec3 gradColor = mix(bottomColor, midColor, smoothstep(0.0, 0.5, y));
    gradColor = mix(gradColor, topColor, smoothstep(0.5, 1.0, y));

    // Procedural stars
    float starDensity = 0.45; // Lower for fewer, higher for more
    float star = 0.0;
    float twinkle = 0.0;
    for (int i = 0; i < 6; i++) {
        vec2 grid = vUv * (20.0 + float(i) * 10.0);
        vec2 id = floor(grid);
        vec2 offset = fract(grid);
        float rnd = hash(id + float(i) * 10.0);
        float size = mix(0.002, 0.008, hash(id + 1.23 + float(i)));
        float dist = length(offset - 0.5);
        float intensity = smoothstep(size, 0.0, dist);
        // Twinkle animation
        float t = time * (0.5 + rnd * 1.5) + rnd * 10.0;
        float tw = 0.7 + 0.3 * sin(t);
        star += intensity * step(1.0 - starDensity, rnd) * tw;
    }
    star = clamp(star, 0.0, 1.0);

    // Add a subtle dreamy glow to the stars
    gradColor += vec3(0.8, 0.7, 1.0) * pow(star, 1.5) * 0.8;

    // Optional: faint nebula (soft noise)
    float nebula = 0.0;
    nebula += 0.08 * sin(10.0 * vUv.x + time * 0.05) * smoothstep(0.2, 0.8, y);
    nebula += 0.06 * sin(20.0 * vUv.y + time * 0.07) * smoothstep(0.4, 1.0, y);
    gradColor += vec3(0.2, 0.1, 0.3) * nebula;

    gl_FragColor = vec4(gradColor, 1.0);
} 