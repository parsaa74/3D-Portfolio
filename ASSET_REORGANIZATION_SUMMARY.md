# Asset Reorganization Summary

## Overview
This document summarizes the asset reorganization performed to follow best practices for file naming and directory structure.

## Changes Made

### 1. GLB Models Reorganization
**New Location:** `/assets/models/glb/`

#### Files Moved and Renamed:
- `assets/models/card reader.glb` → `assets/models/glb/card-reader.glb`
- `assets/models/door frame.glb` → `assets/models/glb/door-frame.glb`
- `assets/models/door pivot.glb` → `assets/models/glb/door-pivot.glb`
- `assets/models/chair.glb` → `assets/models/glb/chair.glb`
- `assets/models/lamp.glb` → `assets/models/glb/lamp.glb`
- `assets/models/projector.glb` → `assets/models/glb/projector.glb`
- `assets/models/projector_screen.glb` → `assets/models/glb/projector-screen.glb`
- `assets/models/severance_tv_show_office.glb` → `assets/models/glb/severance-tv-show-office.glb`
- `assets/models/marina.glb` → `assets/models/glb/marina.glb`
- `assets/models/ulay.glb` → `assets/models/glb/ulay.glb`
- `assets/models/realistic_film_strip_with_frames.glb` → `assets/models/glb/realistic-film-strip-with-frames.glb`

#### Root Directory GLB Files Moved:
- `chair.glb` → `assets/models/glb/chair-root.glb`
- `lamp.glb` → `assets/models/glb/lamp-root.glb`
- `projector.glb` → `assets/models/glb/projector-root.glb`
- `projector_screen.glb` → `assets/models/glb/projector-screen-root.glb`

### 2. Performance Images Reorganization
**New Location:** `/assets/images/performance/solo-performances/`

#### Directory Structure Changes:
- `assets/Images/performance/solo performances/` → `assets/images/performance/solo-performances/`
- `assets/Images/performance/solo performances/friends/` → `assets/images/performance/solo-performances/friends/`
- `assets/Images/performance/solo performances/circle of confusion/` → `assets/images/performance/solo-performances/circle-of-confusion/`
- `assets/Images/performance/solo performances/dissolve/` → `assets/images/performance/solo-performances/dissolve/`

#### Key Image File Renamed:
- `photo_2025-05-01_17-29-01.jpg` → `photo-2025-05-01-17-29-01.jpg`

### 3. Code Updates

#### Files Updated:
1. **SeveranceEnvironment.js**
   - Updated door frame GLB path: `/assets/models/glb/door-frame.glb`
   - Updated door pivot GLB path: `/assets/models/glb/door-pivot.glb`
   - Updated card reader GLB path: `/assets/models/glb/card-reader.glb`

2. **AssetLoader.js**
   - Updated chair GLB path: `/assets/models/glb/chair.glb`

## Best Practices Applied

### File Naming Conventions:
- **Kebab-case**: All spaces and underscores replaced with hyphens
- **Lowercase**: All file and directory names converted to lowercase
- **Descriptive**: Clear, descriptive names that indicate content
- **No special characters**: Removed spaces, underscores, and other special characters

### Directory Structure:
- **Organized by type**: Models grouped in `/models/glb/`, images in `/images/`
- **Logical hierarchy**: Performance images organized by category and subcategory
- **Consistent naming**: All directories follow the same naming convention

### Asset Path Benefits:
- **Easier maintenance**: Consistent paths are easier to find and update
- **Better performance**: Organized structure improves loading times
- **Cross-platform compatibility**: Kebab-case names work across all systems
- **Version control friendly**: No spaces or special characters in file names
- **SEO friendly**: Hyphenated names are better for web deployment

## File Structure After Reorganization

```
assets/
├── models/
│   └── glb/
│       ├── card-reader.glb
│       ├── chair.glb
│       ├── chair-root.glb
│       ├── door-frame.glb
│       ├── door-pivot.glb
│       ├── lamp.glb
│       ├── lamp-root.glb
│       ├── marina.glb
│       ├── projector.glb
│       ├── projector-root.glb
│       ├── projector-screen.glb
│       ├── projector-screen-root.glb
│       ├── realistic-film-strip-with-frames.glb
│       ├── severance-tv-show-office.glb
│       └── ulay.glb
└── images/
    └── performance/
        └── solo-performances/
            ├── friends/
            │   └── photo-2025-05-01-17-29-01.jpg
            ├── circle-of-confusion/
            └── dissolve/
```

## Notes
- All code references have been updated to use the new paths
- The reorganization maintains backward compatibility where possible
- Compiled/minified files in the `assets/` directory may need to be regenerated to reflect the new paths
- The old directory structure can be safely removed after verifying all functionality works with the new paths