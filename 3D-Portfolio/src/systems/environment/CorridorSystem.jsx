import { 
  vertexShader,
  wallVertexShader,
  wallFragmentShader,
  corridorShader
} from '../../shaders/shaderStrings';

// Directly use shader strings
const material = new THREE.ShaderMaterial({
  vertexShader: wallVertexShader,
  fragmentShader: wallFragmentShader,
  uniforms: {
    time: { value: 0 }
  }
}); 