precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec4 vWorldPosition;

uniform vec3 baseColor;
uniform float reflectivity;
uniform float roughness;
uniform samplerCube envMap;

void main() {
    // Base color for the polished floor
    vec3 color = baseColor;
    
    // Calculate reflection vector
    vec3 reflectVec = reflect(-vViewDir, vNormal);
    
    // Sample environment map for reflections
    vec3 reflection = textureCube(envMap, reflectVec).rgb;
    
    // Fresnel effect for realistic reflections
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 5.0);
    
    // Mix base color with reflection based on fresnel and material properties
    vec3 finalColor = mix(color, reflection, fresnel * reflectivity);
    
    // Add subtle variation for the institutional look
    float variation = sin(vUv.x * 50.0) * sin(vUv.y * 50.0) * 0.02;
    finalColor += vec3(variation);
    
    // Output final color with subtle transparency for the polished look
    gl_FragColor = vec4(finalColor, 0.95);
} 