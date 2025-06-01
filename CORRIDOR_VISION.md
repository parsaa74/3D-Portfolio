# Severance Corridor Vision Document

## 1. Overall Goal

To meticulously recreate the distinct visual and atmospheric experience of the Severed Floor corridors from the TV show "Severance". The environment should evoke feelings of disorientation, endlessness, sterile uniformity, and subtle psychological tension.

## 2. Key Visual Elements

*   **Walls:** Smooth, seamless, off-white/stark white drywall. Minimal texture variation. Sharp corners where walls meet the ceiling and floor. No baseboards or crown molding visible in most areas.
*   **Flooring:** Low-pile, institutional-grade carpet, typically a specific shade of muted green. Must feel uniform and endless.
*   **Ceiling:** Suspended ceiling grid with standard acoustic tiles (usually white or off-white).
*   **Lighting:**
    *   **Primary:** Evenly spaced, recessed linear fluorescent light fixtures embedded in the ceiling tiles.
    *   **Quality:** Cool white color temperature (~4000K-5000K), high intensity, often creating a slightly harsh, overexposed look in brighter areas. Minimal color variation. Shadows should be sharp where they exist but often washed out by the pervasive brightness.
    *   **Consistency:** Lighting should be relentlessly uniform throughout the main corridors.
*   **Doors:**
    *   **Office Doors:** Distinctive wood veneer (often oak-like), potentially with a vertical silver/metal inlay or handle plate. Sometimes feature small, high-up frosted glass windows.
    *   **Utility/Other Doors:** Plain metal doors, often painted the same off-white as the walls or a muted grey/beige.
    *   **Frames:** Simple metal frames, often flush with the walls.
*   **Signage:** Minimalist, functional signs (e.g., "EXIT", room numbers/names) in a specific sans-serif font (like Helvetica or similar). Often black text on a white or metal background.

## 3. Layout Philosophy

*   **Labyrinthine & Endless:** Corridors should feel unnaturally long, repetitive, and interconnected in a disorienting way. Use long straight sections, sharp 90-degree turns, T-junctions, and occasional four-way intersections. Avoid unique landmarks where possible in general circulation areas.
*   **Scale:** Maintain the slightly oppressive, human-scale dimensions seen in the show. Ceilings aren't excessively high. Corridor width should feel consistent.
*   **Generation (Optional):** Consider procedural generation or large, carefully designed modular map sections to enhance the feeling of endlessness and prevent easy memorization.

## 4. Materials & Textures

*   **Walls:** Matte finish, very low specularity. Subtle imperfections or scuffs should be used extremely sparingly.
*   **Floors:** Low specularity carpet texture. Tiling should be barely perceptible to sell the seamless look.
*   **Ceilings:** Standard matte ceiling tile texture.
*   **Metals:** Brushed or anodized aluminum look for door frames, handles, and signage. Moderate specularity.
*   **Wood:** Relatively low-contrast wood grain for doors, semi-matte finish.

## 5. Props & Set Dressing (Sparsity is Key)

*   **Essential:** Fire extinguishers (wall-mounted), smoke detectors, sprinkler heads, occasional thermostat panels.
*   **Occasional:** Water coolers (specific design), simple potted plants (like snake plants) in certain nodes or wider areas, maybe a subtly placed security camera dome.
*   **Avoid:** Clutter, personalization, pictures, excessive furniture. The emptiness is part of the aesthetic.

## 6. Atmosphere & Mood

*   **Sterile & Clean:** An almost unnerving lack of dirt or wear.
*   **Monotonous:** Repetitive design should contribute to a sense of time dilation or stagnation.
*   **Disorienting:** Lack of unique identifiers should make navigation feel challenging.
*   **Quietly Oppressive:** The uniformity and scale should feel institutional and slightly dehumanizing.
*   **Underlying Tension:** Despite the mundane appearance, the environment should subtly support the psychological themes of the show.

## 7. Comparison to Current Implementation

*(Based on initial review of `LumonEnvironment.js` and `public/assets/`)*

*   [~] **Lighting Accuracy:** Uses `RectAreaLight` (good), near-white color (`0xf8f8ff`), grid placement. Uses white fog. Seems uniform but might lack specific harshness/falloff. *Partially Met.*
*   [X] **Wall/Floor/Ceiling Materials and Colors:** Uses simple programmatic `MeshStandardMaterial`. Walls/Ceiling are white. Floor is light grey (`0xf0f0f0`), **not** green carpet. Textures found in `public/assets/textures` (wall.jpg, floor.jpg, etc.) do not appear to be used in `LumonEnvironment.js`. *Not Met.*
*   [?] **Corridor Layout and Scale:** Creates large floor/ceiling planes. Imports and initializes a `CorridorSystem`, which likely defines the actual layout. Specific structure unclear without checking `CorridorSystem`. *Unknown.*
*   [~] **Door Styles and Details:** Uses a generic brown (`0x8b4513`) material and loads `door.json`. Specific details (veneer, inlay, glass) from the vision are not confirmed. *Partially Met (at best).*
*   [X] **Prop Usage and Placement:** No props (fire extinguishers, plants, etc.) mentioned in `LumonEnvironment.js`. *Not Met.*
*   [~] **Overall Atmospheric Match:** Captures the sterile white/bright lighting concept but misses key elements like the green carpet, specific textures, and props. Relies heavily on programmatic materials. *Needs Improvement.* 