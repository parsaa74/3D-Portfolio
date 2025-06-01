#!/bin/bash

# Find all JavaScript files
find src -type f -name "*.js" | while read -r file; do
  # Skip ThreeJSLoader.js itself
  if [[ "$file" != "src/utils/ThreeJSLoader.js" ]]; then
    # Replace bare three imports with our loader
    sed -i 's/import \* as THREE from "three";/import { THREE } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    sed -i 's/import \* as THREE from '\''three'\'';/import { THREE } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    
    # Replace three addon imports with our loader functions
    sed -i 's/import { OrbitControls } from "three\/examples\/jsm\/controls\/OrbitControls";/import { getOrbitControls } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    sed -i 's/import { PointerLockControls } from "three\/examples\/jsm\/controls\/PointerLockControls";/import { getPointerLockControls } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    sed -i 's/import { GLTFLoader } from "three\/examples\/jsm\/loaders\/GLTFLoader";/import { getGLTFLoader } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    sed -i 's/import { DRACOLoader } from "three\/examples\/jsm\/loaders\/DRACOLoader";/import { getDRACOLoader } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
    sed -i 's/import { RGBELoader } from "three\/examples\/jsm\/loaders\/RGBELoader";/import { getRGBELoader } from "..\/utils\/ThreeJSLoader.js";/g' "$file"
  fi
done 