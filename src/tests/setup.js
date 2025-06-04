// Mock Three.js camera and other global objects
global.window = {
  threeCamera: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    updateMatrix: () => {},
    updateMatrixWorld: () => {},
  },
  threeScene: {},
  renderer: {},
  currentSegment: {
    walls: [],
  },
  playerPosition: { x: 0, y: 0, z: 0 },
  isTestEnvironment: true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Add performance.now() if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
  };
}

// Mock document for pointer lock
global.document = {
  pointerLockElement: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => ({
    addEventListener: () => {},
    requestPointerLock: () => {},
  }),
  getElementById: (id) => {
    if (id === 'three-container') {
      return {
        appendChild: () => {},
        removeChild: () => {},
        style: {},
        addEventListener: () => {},
      };
    }
    return null;
  },
  createElement: (tag) => {
    if (tag === 'canvas' || tag === 'div') {
      return {
        getContext: (type) => {
          if (type === '2d') {
            return {
              fillRect: () => {},
              clearRect: () => {},
              getImageData: () => ({ data: [] }),
              putImageData: () => {},
              createImageData: () => [],
              setTransform: () => {},
              drawImage: () => {},
              save: () => {},
              restore: () => {},
              beginPath: () => {},
              moveTo: () => {},
              lineTo: () => {},
              closePath: () => {},
              stroke: () => {},
              translate: () => {},
              scale: () => {},
              rotate: () => {},
              arc: () => {},
              fill: () => {},
              measureText: () => ({ width: 0 }),
              setLineDash: () => {},
              getLineDash: () => [],
              font: '',
              fillStyle: '',
              strokeStyle: '',
              lineWidth: 1,
              fillText: () => {},
              createLinearGradient: () => ({
                addColorStop: () => {}
              }),
            };
          } else if (type === 'webgl' || type === 'webgl2') {
            return {
              getExtension: () => ({}),
              getParameter: (param) => {
                if (param === 'VERSION' || param === 7938) { // 7938 = WebGLRenderingContext.VERSION
                  return 'WebGL 1.0';
                }
                return {};
              },
              createShader: () => ({}),
              shaderSource: () => {},
              compileShader: () => {},
              createProgram: () => ({}),
              attachShader: () => {},
              linkProgram: () => {},
              useProgram: () => {},
              getShaderParameter: () => true,
              getShaderInfoLog: () => '',
              getProgramParameter: () => true,
              getProgramInfoLog: () => '',
              createBuffer: () => ({}),
              bindBuffer: () => {},
              bufferData: () => {},
              enableVertexAttribArray: () => {},
              vertexAttribPointer: () => {},
              drawArrays: () => {},
              viewport: () => {},
              clearColor: () => {},
              clear: () => {},
              createTexture: () => ({}),
              bindTexture: () => {},
              texImage2D: () => {},
              texParameteri: () => {},
              activeTexture: () => {},
              uniform1i: () => {},
              uniformMatrix4fv: () => {},
              getUniformLocation: () => ({}),
              getAttribLocation: () => 0,
              createFramebuffer: () => ({}),
              bindFramebuffer: () => {},
              framebufferTexture2D: () => {},
              checkFramebufferStatus: () => true,
              deleteFramebuffer: () => {},
              deleteTexture: () => {},
              deleteBuffer: () => {},
              deleteProgram: () => {},
              deleteShader: () => {},
              // ... add more as needed
            };
          }
          return {};
        },
        style: {},
        appendChild: () => {},
        remove: () => {},
        addEventListener: () => {},
        requestPointerLock: () => {},
        setAttribute: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      };
    }
    return {};
  },
  createElementNS: (ns, tag) => {
    return global.document.createElement(tag);
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
    classList: { add: () => {}, remove: () => {} },
  },
};
