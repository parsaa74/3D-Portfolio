// Update shader loading paths
const loadShader = async (shaderPath) => {
  try {
    // Use absolute path for GitHub Pages
    const response = await fetch(`${import.meta.env.BASE_URL}${shaderPath}`);
    if (!response.ok) throw new Error(`Shader load failed: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error(`Error loading shader: ${shaderPath}`, error);
    throw error;
  }
}; 