// Synthetic Biome (3D Version)
let threeScene, threeCamera, threeRenderer, threeFont, wordCountEl, totalScoreEl, avgDepthEl, fpsEl, cameraModeEl, targetFpsEl, wordListTitle, wordListContent;

// NEW: Variables for letter flow visualization
let letterOrgData = []; // Array to store letter organism data
let maxLetters = 400;   // Maximum number of letters to display
let letterIndex = 0;    // Index for cycling through CONFIG.types
let lastDictionaryCheckTime = {};
let wordNet = null; // Added to track cooldowns for dictionary checks per script
// Configuration parameters for the system
const CONFIG = {
  maxOrganisms: 40, // Maximum number of organisms
  initialOrganisms: 8, // Number of initial organisms
  connectionDistance: 150, // Distance for connection
  audioEnabled: true, // Enable audio
  postFx: true, // Post-processing effects (performance intensive)

  // Physical parameters
  baseSize: { min: 8, max: 35 },
  baseSpeed: { min: 0.4, max: 2.0 }, // Lowered max speed to make organisms slower and more stable
  baseMass: { min: 1, max: 9 },
  baseLifespan: { min: 450, max: 900 }, // Increased lifespan to allow more time for cluster formation
  cohesionDistance: 130, // Increased from 100 to encourage more grouping
  separationDistance: 30, // Reduced from 35 to allow organisms to get closer to each other
  alignmentDistance: 80, // Increased from 60 to make organisms follow each other more consistently
  maxForce: 0.18, // Slightly reduced to make movements more stable
  
  // NEW: Word and Poetry Settings
  wordSettings: {
    minClusterSize: 3,
    maxClusterSize: 7, // Max length of a word to check
    clusterFormationRadiusFactor: 2.0, // Increased from 1.2 to make clustering more likely
    clusterStabilityTime: 1800,    // Reduced from 2500ms to make word detection faster
    apiCooldownDictionary: 2000, // Reduced from 3000ms for more frequent API lookups
    apiCooldownTranslation: 1000, // ms between translation API lookups
    maxCollectedWords: 50,        // Max words in Poet's Palette
    wordDisplayTime3D: 15000,     // ms to display a confirmed word in 3D
    
    // Focus/Resonance Tool Settings
    focusResonanceRadius: 120,    // Increased from 100 to cover more area
    focusResonanceStrength: 0.08, // Increased from 0.05 for stronger effect
    focusResonanceDamping: 0.95,  // Increased damping effect (lower value = more damping)
    focusResonanceParticles: 12,  // Number of particles in the visual effect
    focusResonancePulseSpeed: 0.05, // Speed of the pulsing animation
    clusterGlowColor: 0xFFFF00,    // Hex color for cluster glow
    clusterBreathingRate: 0.05,    // Rate of breathing for cluster glow
  },
  // END NEW

  // Font configuration for different scripts
  fontMappings: {
    default: { family: "helvetiker_regular, Arial, 'Noto Sans'", weight: "normal", style: "normal" }, // For English, Spanish, French, Portuguese, German, Indonesian/Malay
    arabic: { family: "'Noto Sans Arabic', 'Vazirmatn', 'Arabic Typesetting', Times New Roman", weight: "normal", style: "normal" }, // For Arabic, Persian
    eastAsian: { family: "'Noto Sans CJK SC', 'SimSun', 'MS Gothic'", weight: "normal", style: "normal" }, // For Mandarin Chinese (SC for Simplified)
    indic: { family: "'Noto Sans Devanagari', Arial", weight: "normal", style: "normal" }, // For Hindi
    cyrillic: { family: "'Noto Sans', Arial, Times New Roman", weight: "normal", style: "normal" } // For Russian
    // All other entries like greek, armenian, georgian, hebrew, southeastAsian should be removed or commented out.
  },
  
  // Script to font mapping
  scriptMap: {
    // Latin-based characters for English, Spanish, French, Portuguese, German, Indonesian/Malay
    // (Many will be caught by the default Unicode block checks in getScriptCategory,
    // but explicit mapping for common accented chars can be helpful)
    "À": "default", "Á": "default", "Â": "default", "Ã": "default", "Ä": "default", "Å": "default", "Æ": "default", "Ç": "default",
    "È": "default", "É": "default", "Ê": "default", "Ë": "default", "Ì": "default", "Í": "default", "Î": "default", "Ï": "default",
    "Ð": "default", "Ñ": "default", "Ò": "default", "Ó": "default", "Ô": "default", "Õ": "default", "Ö": "default", "Ø": "default",
    "Ù": "default", "Ú": "default", "Û": "default", "Ü": "default", "Ý": "default", "Þ": "default", "ß": "default",
    "à": "default", "á": "default", "â": "default", "ã": "default", "ä": "default", "å": "default", "æ": "default", "ç": "default",
    "è": "default", "é": "default", "ê": "default", "ë": "default", "ì": "default", "í": "default", "î": "default", "ï": "default",
    "ð": "default", "ñ": "default", "ò": "default", "ó": "default", "ô": "default", "õ": "default", "ö": "default", "ø": "default",
    "ù": "default", "ú": "default", "û": "default", "ü": "default", "ý": "default", "þ": "default", "ÿ": "default",
    "Œ": "default", "œ": "default", "Š": "default", "š": "default", "Ÿ": "default",

    // Arabic / Persian
    "ا": "arabic", "ب": "arabic", "ت": "arabic", "ث": "arabic", "ج": "arabic", "ح": "arabic", "خ": "arabic",
    "د": "arabic", "ذ": "arabic", "ر": "arabic", "ز": "arabic", "س": "arabic", "ش": "arabic", "ص": "arabic",
    "ض": "arabic", "ط": "arabic", "ظ": "arabic", "ع": "arabic", "غ": "arabic", "ف": "arabic", "ق": "arabic",
    "ك": "arabic", "ل": "arabic", "م": "arabic", "ن": "arabic", "ه": "arabic", "و": "arabic", "ي": "arabic",
    "ء": "arabic", "آ": "arabic", "أ": "arabic", "ؤ": "arabic", "إ": "arabic", "ئ": "arabic", "ة": "arabic", "ى": "arabic",
    "پ": "arabic", "چ": "arabic", "ژ": "arabic", "گ": "arabic", // Persian specific

    // Mandarin Chinese (Simplified) - Add more common characters as needed from the types array later
    "你": "eastAsian", "好": "eastAsian", "谢": "eastAsian", "不": "eastAsian", "我": "eastAsian", "他": "eastAsian", "她": "eastAsian",
    "们": "eastAsian", "是": "eastAsian", "的": "eastAsian", "中": "eastAsian", "国": "eastAsian", "人": "eastAsian",
    "日": "eastAsian", "月": "eastAsian", "水": "eastAsian", "火": "eastAsian", "木": "eastAsian", "金": "eastAsian", "土": "eastAsian",
    "爱": "eastAsian", "家": "eastAsian", "学": "eastAsian", "生": "eastAsian", "老": "eastAsian", "师": "eastAsian",

    // Hindi (Devanagari)
    "अ": "indic", "आ": "indic", "इ": "indic", "ई": "indic", "उ": "indic", "ऊ": "indic", "ऋ": "indic",
    "ए": "indic", "ऐ": "indic", "ओ": "indic", "औ": "indic", "अं": "indic", "अः": "indic",
    "क": "indic", "ख": "indic", "ग": "indic", "घ": "indic", "ङ": "indic", "च": "indic", "छ": "indic",
    "ज": "indic", "झ": "indic", "ञ": "indic", "ट": "indic", "ठ": "indic", "ड": "indic", "ढ": "indic",
    "ण": "indic", "त": "indic", "थ": "indic", "द": "indic", "ध": "indic", "न": "indic", "प": "indic",
    "फ": "indic", "ब": "indic", "भ": "indic", "म": "indic", "य": "indic", "र": "indic", "ल": "indic",
    "व": "indic", "श": "indic", "ष": "indic", "स": "indic", "ह": "indic",

    // Russian (Cyrillic)
    "А": "cyrillic", "Б": "cyrillic", "В": "cyrillic", "Г": "cyrillic", "Д": "cyrillic", "Е": "cyrillic", "Ё": "cyrillic",
    "Ж": "cyrillic", "З": "cyrillic", "И": "cyrillic", "Й": "cyrillic", "К": "cyrillic", "Л": "cyrillic", "М": "cyrillic",
    "Н": "cyrillic", "О": "cyrillic", "П": "cyrillic", "Р": "cyrillic", "С": "cyrillic", "Т": "cyrillic", "У": "cyrillic",
    "Ф": "cyrillic", "Х": "cyrillic", "Ц": "cyrillic", "Ч": "cyrillic", "Ш": "cyrillic", "Щ": "cyrillic", "Ъ": "cyrillic",
    "Ы": "cyrillic", "Ь": "cyrillic", "Э": "cyrillic", "Ю": "cyrillic", "Я": "cyrillic",
    "а": "cyrillic", "б": "cyrillic", "в": "cyrillic", "г": "cyrillic", "д": "cyrillic", "е": "cyrillic", "ё": "cyrillic",
    "ж": "cyrillic", "з": "cyrillic", "и": "cyrillic", "й": "cyrillic", "к": "cyrillic", "л": "cyrillic", "м": "cyrillic",
    "н": "cyrillic", "о": "cyrillic", "п": "cyrillic", "р": "cyrillic", "с": "cyrillic", "т": "cyrillic", "у": "cyrillic",
    "ф": "cyrillic", "х": "cyrillic", "ц": "cyrillic", "ч": "cyrillic", "ш": "cyrillic", "щ": "cyrillic", "ъ": "cyrillic",
    "ы": "cyrillic", "ь": "cyrillic", "э": "cyrillic", "ю": "cyrillic", "я": "cyrillic"
    // Ensure other script mappings (Greek, Armenian, Georgian, Hebrew, other East Asian, other Indic, Southeast Asian) are removed or commented out.
  },

  types: [
    // Latin-based: English, Spanish, French, Portuguese, German, Indonesian/Malay
    // Basic Latin (A-Z, a-z, 0-9)
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    // Common Punctuation
    "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~",
    // Common Latin Extended characters for Spanish, French, Portuguese, German
    "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", "Ð", "Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "Ø", "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß",
    "à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë", "ì", "í", "î", "ï", "ð", "ñ", "ò", "ó", "ô", "õ", "ö", "ø", "ù", "ú", "û", "ü", "ý", "þ", "ÿ",
    "Œ", "œ", "Š", "š", "Ÿ", "¿", "¡", "€", "£", "¥",

    // Mandarin Chinese (Simplified - a selection of common characters)
    // For a richer experience, this list should be expanded or dynamically sourced if possible.
    "你", "好", "谢", "不", "客", "气", "我", "他", "她", "们", "是", "的", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万",
    "人", "日", "月", "水", "火", "木", "金", "土", "中", "国", "爱", "家", "学", "生", "老", "师", "再", "见", "明", "天", "风", "雨", "雪",
    "山", "河", "海", "天", "地", "春", "夏", "秋", "冬", "东", "西", "南", "北", "前", "后", "左", "右", "上", "下", "大", "小", "多", "少",
    "新", "旧", "好", "坏", "美", "丽", "高", "兴", "快", "乐", "时", "间", "世", "界", "梦", "想", "诗", "歌", "书", "画", "字", "文", "语",
    "红", "黄", "蓝", "绿", "白", "黑", "色", "光", "影", "音", "心", "情", "思", "意", "道", "理", "力", "量", "和", "平", "真", "善",
    // Punctuation for Chinese
    "，", "。", "？", "！", "：", "；", "“", "”", "‘", "’", "（", "）", "《", "》", "、",

    // Hindi (Devanagari - Vowels, Consonants, Common Matras, Numerals, Punctuation)
    "अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए", "ऐ", "ओ", "औ", "अं", "अः",
    "क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण",
    "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व",
    "श", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ",
    "०", "१", "२", "३", "४", "५", "६", "७", "८", "९", // Devanagari digits
    "ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "्", "ं", "ः", // Common Matras (vowel signs) and Halant
    "।", "॥", "ॐ", // Danda, Double Danda, Om

    // Standard Arabic & Persian (Arabic Alphabet, Perso-Arabic specific, common diacritics, numerals, punctuation)
    "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي", // Standard Arabic
    "ء", "آ", "أ", "ؤ", "إ", "ئ", "ة", "ى", "ٱ", // Variants and Hamzas
    "پ", "چ", "ژ", "گ", // Persian specific letters
    "ک", "ی", // Arabic/Persian common variants for KAF and YEH
    "َ", "ً", "ُ", "ٌ", "ِ", "ٍ", "ْ", "ّ", // Arabic Diacritics
    "ٰ", // Superscript Alef
    "٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", // Eastern Arabic Numerals
    "۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", // Persian Numerals
    "،", "؛", "؟", "۔", // Arabic/Persian Punctuation

    // Russian (Cyrillic Alphabet)
    "А", "Б", "В", "Г", "Д", "Е", "Ё", "Ж", "З", "И", "Й", "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У", "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ъ", "Ы", "Ь", "Э", "Ю", "Я",
    "а", "б", "в", "г", "д", "е", "ё", "ж", "з", "и", "й", "к", "л", "м", "н", "о", "п", "р", "с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "ъ", "ы", "ь", "э", "ю", "я",

    /* --- All other language blocks below are COMMENTED OUT --- */
    /*
    // Greek - Full Alphabet + Accented
    "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω",
    "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "ς", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
    "Ά", "Έ", "Ή", "Ί", "Ό", "Ύ", "Ώ", "ά", "έ", "ή", "ί", "ό", "ύ", "ώ", "ϊ", "ϋ", "ΐ", "ΰ",
    */
    /*
    // Armenian - Full Alphabet + Punctuation
    "Ա", "Բ", "Գ", "Դ", "Ե", "Զ", "Է", "Ը", "Թ", "Ժ", "Ի", "Լ", "Խ", "Ծ", "Կ", "Հ", "Ձ", "Ղ", "Ճ", "Մ", "Յ", "Ն", "Շ", "Ո", "Չ", "Պ", "Ջ", "Ռ", "Ս", "Վ", "Տ", "Ր", "Ց", "Ւ", "Փ", "Ք", "Օ", "Ֆ",
    "ա", "բ", "գ", "դ", "ե", "զ", "է", "ը", "թ", "ժ", "ի", "լ", "խ", "ծ", "կ", "հ", "ձ", "ղ", "ճ", "մ", "յ", "ն", "շ", "ո", "չ", "պ", "ջ", "ռ", "ս", "վ", "տ", "ր", "ց", "ւ", "փ", "ք", "օ", "ֆ",
    "և", "ՙ", "՛", "՜", "՝", "՞", "՟", "՚",
    */
    /*
    // Georgian (Mkhedruli)
    "ა", "ბ", "გ", "დ", "ე", "ვ", "ზ", "თ", "ი", "კ", "ლ", "მ", "ნ", "ო", "პ", "ჟ", "რ", "ს", "ტ", "უ", "ფ", "ქ", "ღ", "ყ", "შ", "ჩ", "ც", "ძ", "წ", "ჭ", "ხ", "ჯ", "ჰ",
    */
    /*
    // Hebrew - Full Alphabet (including final forms)
    "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "ך", "כ", "ל", "ם", "מ", "ן", "נ", "ס", "ע", "ף", "פ", "ץ", "צ", "ק", "ר", "ש", "ת",
    */
    /*
    // Indic scripts (other than Devanagari for Hindi) - e.g. Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Sinhala
    // All these extensive blocks should be commented out.
    */
    /*
    // Other scripts like Syriac, Coptic, Ethiopic, Cherokee, Canadian Aboriginal Syllabics, Tibetan, Burmese, Thai, Lao, Khmer, Mongolian, Tifinagh, Bamum
    // All these extensive blocks should be commented out.
    */
  ],


  // 3D specific configuration
  cameraControl: true, // Allow camera movement
  numLights: 3, // Number of point lights
  depthRange: { min: -600, max: 600 }, // Z-axis range for organisms
  ambientLightLevel: 80, // Base light level
  pointLightIntensity: 120, // Intensity of point lights
  defaultCameraZoom: 500, // Default camera zoom distance
  minCameraZoom: 100, // Minimum zoom distance
  maxCameraZoom: 1000, // Maximum zoom distance
  renderDistance: 2000, // Far plane for 3D rendering

  // Existing parameters for audio, colors, etc.
  audioAnalysis: {
    enabled: false,
    smoothing: 0.8,
    minFrequency: 20,
    maxFrequency: 200,
    threshold: 0.01,
    influence: 0.5,
  },

  noiseDetail: {
    octaves: 4,
    falloff: 0.5,
  },

  // Color palettes
  selectedPaletteIndex: 0,
  palettes: [
    // Nocturnal Depths - Refined with precise Swiss color theory
    [
      [10, 10, 22], // Dark background
      [25, 25, 45], // Mid background
      [40, 50, 90], // Highlight
      [100, 110, 200], // Accent
      [180, 200, 255], // Foreground
    ],

    // Neo-Swiss Minimalism
    [
      [10, 10, 12],
      [30, 30, 34],
      [80, 80, 84],
      [180, 180, 184],
      [245, 245, 250],
    ],

    // Bioluminescence
    [
      [5, 15, 25],
      [0, 50, 55],
      [0, 100, 80],
      [10, 200, 120],
      [120, 255, 170],
    ],

    // Neural Network
    [
      [30, 10, 40],
      [70, 15, 80],
      [160, 20, 110],
      [220, 40, 120],
      [255, 90, 140],
    ],

    // Precision Red - Swiss Design Classic
    [
      [20, 8, 8],
      [40, 12, 12],
      [90, 18, 18],
      [180, 30, 30],
      [240, 80, 80],
    ],
  ], // Close palettes array
}; // Close CONFIG object

// Core system variables
let organisms = []; // All active organisms
let ecosystem; // The ecosystem manager
let selectedPalette; // Current color scheme
let paletteIndex = 0; // Index of active palette
let grid = []; // Spatial partitioning grid for performance
let cellSize = 60; // Size of each grid cell
let cols, rows; // Grid dimensions

// System state tracking
let metadata = {
  generationCount: 0, // Number of generations passed
  interactionCount: 0, // Number of meaningful interactions
  totalCreated: 0, // Total organisms created
  dominantType: "", // Most common organism type
  avgLifespan: 0, // Average creature lifespan
  systemComplexity: 0, // Emergent complexity metric
  timeSinceStart: 0, // Time the system has been running
};

// Camera interaction for exhibition mode
const cameraInteraction = {
  enabled: false,
  video: null,
  previousPixels: [],
  detectionPoints: [],
  motionThreshold: 30,
  lastMotionTime: 0,
  debugView: false,
};

// Audio system
let audioEnabled = false; // Start with sound off
let oscillators = []; // Sound generators
let audioContext; // Web Audio API context
let reverb; // Reverb effect
let noiseOsc; // Noise generator for ambience
let analyzer; // For visualizing audio

// UI elements
let fontMono, fontInter; // Typography
let noiseTexture; // For artistic grain texture
let fadeInAlpha = 0; // For fade-in animation

// Camera and 3D specific variables
let cam; // 3D camera
let rotationY = 0; // Camera rotation
let rotationX = 0; // Camera tilt
let cameraZ = 500; // Camera distance
let lights = []; // Array of point lights

// Word formation variables
let potentialClusters = new Map(); // Map cluster ID -> {organisms: [], startTime: timestamp, string: "chars"}
let confirmedWords = []; // Array of {word: string, organisms: [], displayUntil: timestamp}
let collectedWords = []; // Array of {word: string, definition: string, translations: {}}
let lastDictionaryCheck = 0; // Timestamp of last dictionary API call

// Sophisticated color palettes curated for the exhibition
const PALETTES = [
  // Nocturnal Depths - Refined with precise Swiss color theory
  [
    [10, 10, 22], // Dark background
    [25, 25, 45], // Mid background
    [40, 50, 90], // Highlight
    [100, 110, 200], // Accent
    [180, 200, 255], // Foreground
  ],

  // Neo-Swiss Minimalism
  [
    [10, 10, 12],
    [30, 30, 34],
    [80, 80, 84],
    [180, 180, 184],
    [245, 245, 250],
  ],

  // Bioluminescence
  [
    [5, 15, 25],
    [0, 50, 55],
    [0, 100, 80],
    [10, 200, 120],
    [120, 255, 170],
  ],

  // Neural Network
  [
    [30, 10, 40],
    [70, 15, 80],
    [160, 20, 110],
    [220, 40, 120],
    [255, 90, 140],
  ],

  // Precision Red - Swiss Design Classic
  [
    [20, 8, 8],
    [40, 12, 12],
    [90, 18, 18],
    [180, 30, 30],
    [240, 80, 80],
  ],

  // ZHdK Inspired
  [
    [5, 10, 20],
    [10, 25, 50],
    [20, 50, 100],
    [40, 100, 200],
    [180, 220, 255],
  ],

  // Carbon Structure
  [
    [10, 10, 10],
    [30, 30, 30],
    [60, 60, 60],
    [120, 120, 120],
    [210, 210, 210],
  ],

  // Artificial Nature
  [
    [10, 30, 15],
    [20, 60, 30],
    [40, 120, 60],
    [80, 200, 100],
    [140, 255, 160],
  ],
];

// NEW: Constants and variables for script-based highlighting
const WHITE_COLOR_RGB = [255, 255, 255];
const SCRIPT_HIGHLIGHT_COLORS = {
  // Define colors for each script category.
  // These are examples; adjust as needed for aesthetics and clarity.
  default: [200, 200, 200], // Light grey for Latin/default
  greek: [0, 150, 255],   // Blue
  armenian: [255, 100, 0], // Orange
  georgian: [100, 200, 50], // Light Green
  hebrew: [150, 100, 255], // Purple
  arabic: [255, 200, 0],   // Yellow
  eastAsian: [255, 50, 100], // Pink/Red
  indic: [0, 200, 150],   // Teal
  southeastAsian: [180, 220, 0], // Lime Green
  syriac: [200, 150, 100], // Brownish
  coptic: [100, 100, 100], // Dark Grey
  ethiopic: [50, 150, 100], // Dark Green/Blue
  cherokee: [255, 150, 150], // Light Pink
  canadianAboriginal: [150, 200, 200], // Light Cyan
  tibetan: [200, 100, 100], // Desaturated Red
  burmese: [100, 150, 200], // Light Blue
  khmer: [220, 180, 100],  // Beige
  sinhala: [180, 150, 220], // Light Purple
  mongolian: [150, 180, 150], // Desaturated Green
  tifinagh: [200, 200, 150], // Pale Yellow
  nko: [100, 200, 200],     // Cyan
  vai: [220, 150, 200],     // Mauve
  osmanya: [150, 150, 100], // Olive
  adlam: [100, 100, 200],   // Indigo
  ogham: [50, 100, 50],     // Dark Green
  runic: [150, 120, 80],    // Tan
  glagolitic: [120, 80, 150], // Plum
  bamum: [80, 150, 120],     // Greenish-blue
  primordial: [120, 120, 120], // Neutral grey for primordial forms
  // Add more script categories and their colors as needed
};

let highlightedScriptCategory = "all_white"; // Initial state: all organisms are white
let availableScriptCategories = ["all_white"]; // Will be populated in setup
let currentHighlightIndex = 0; // Index for cycling through availableScriptCategories

// Variables for Focus/Resonance Tool
let focusResonanceActive = false;
let focusResonancePosition = null; // p5.Vector in 3D space
let focusResonanceRadius = CONFIG.wordSettings.focusResonanceRadius || 100; // Radius from config or default

// Camera control variables
let cameraRotation = { x: 0, y: 0 };
let cameraZoom = 500; // Initial camera distance

// Expose these for testing
window.cameraRotation = cameraRotation;
window.cameraZoom = cameraZoom;

// Fade-in animation for smooth startup

// Add these variables after the PALETTES constant but before the preload function
let loadedFonts = {}; // Cache for loaded fonts
let defaultFont; // Default font to use as fallback
let isDefaultFontReady = false; // Flag to signal when the essential 3D font is loaded

// ADDED: Create a global empty font as ultimate fallback
const createEmptyFont = () => {
  return {
    glyphs: {},
    generateShapes: function() { return []; }
  };
};

// Keep reference to an empty fallback font
let emptyFallbackFont = createEmptyFont();

// Ensure THREE.BufferGeometryUtils exists
if (!THREE.BufferGeometryUtils) {
  THREE.BufferGeometryUtils = {
    // Simplified implementation if the proper library fails to load
    mergeBufferGeometries: function(geometries) {
      // Just return the first geometry if proper merging isn't available
      console.warn("Using fallback mergeBufferGeometries - proper THREE.BufferGeometryUtils not loaded");
      return geometries[0];
    }
  };
}

function preload() {
  // Load necessary assets and prepare shaders
  fontMono = loadFont(
    "https://cdn.jsdelivr.net/npm/@fontsource/space-mono/files/space-mono-latin-400-normal.woff"
  );
  fontInter = loadFont(
    "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-300-normal.woff"
  );
  
  const loader = new THREE.FontLoader();
  
  // ADDED: Safe font loading function with error handling
  const safeLoadFont = (fontUrl, fontKey, fontName) => {
    try {
      loader.load(
        fontUrl, 
        function(font) {
          loadedFonts[fontKey] = font;
          console.log(`${fontName} loaded successfully.`);
          if (fontKey === 'default') {
            defaultFont = font;
            isDefaultFontReady = true;
          }
        },
        // onProgress callback
        undefined, 
        // onError callback
        function(error) {
          console.error(`Failed to load ${fontName}:`, error);
          if (fontKey === 'default') {
            console.warn(`Setting default font to empty fallback`);
            defaultFont = emptyFallbackFont;
            isDefaultFontReady = true; 
          }
        }
      );
    } catch (e) {
      console.error(`Exception when trying to load ${fontName}:`, e);
      if (fontKey === 'default') {
        defaultFont = emptyFallbackFont;
        isDefaultFontReady = true;
      }
    }
  };

  // Load the default Helvetiker font
  safeLoadFont('helvetiker_regular.typeface.json', 'default', 'Default 3D font (helvetiker_regular)');

  // Load Vazirmatn_Regular.json
  safeLoadFont('Vazirmatn_Regular.typeface.json', 'vazir', 'Vazirmatn_Regular.json');

  // Load Noto Sans_Regular.typeface.json
  safeLoadFont('Noto Sans_Regular.typeface.json', 'notosans', 'Noto Sans_Regular.typeface.json');

  // Load Noto Sans Armenian_Regular.typeface.json
  safeLoadFont('Noto Sans Armenian_Regular.typeface.json', 'notoArmenian', 'Noto Sans Armenian_Regular.typeface.json');

  // Load Noto Sans Bengali_Regular.typeface.json
  safeLoadFont('Noto Sans Bengali_Regular.typeface.json', 'notoBengali', 'Noto Sans Bengali_Regular.typeface.json');

  // Load Noto Sans Devanagari_Regular.typeface.json
  safeLoadFont('Noto Sans Devanagari_Regular.typeface.json', 'notoDevanagari', 'Noto Sans Devanagari_Regular.typeface.json');

  // Load Noto Sans Ethiopic_Regular.typeface.json
  safeLoadFont('Noto Sans Ethiopic_Regular.typeface.json', 'notoEthiopic', 'Noto Sans Ethiopic_Regular.typeface.json');

  // Load Noto Sans Georgian_Regular.typeface.json
  safeLoadFont('Noto Sans Georgian_Regular.typeface.json', 'notoGeorgian', 'Noto Sans Georgian_Regular.typeface.json');

  // Load Noto Sans Malayalam_Regular.typeface.json
  safeLoadFont('Noto Sans Malayalam_Regular.typeface.json', 'notoMalayalam', 'Noto Sans Malayalam_Regular.typeface.json');

  // Load Noto Sans Thai_Regular.typeface.json
  safeLoadFont('Noto Sans Thai_Regular.typeface.json', 'notoThai', 'Noto Sans Thai_Regular.typeface.json');
  
  // Load Noto Sans Hebrew Thin_Regular.typeface.json
  safeLoadFont('Noto Sans Hebrew Thin_Regular.typeface.json', 'notoHebrewThin', 'Noto Sans Hebrew Thin_Regular.typeface.json');

  // Load Noto Sans JP_Regular.typeface.json
  safeLoadFont('Noto Sans JP_Regular.typeface.json', 'notoJP', 'Noto Sans JP_Regular.typeface.json');

  // Load Noto Serif Tibetan_Regular.typeface.json
  safeLoadFont('Noto Serif Tibetan_Regular.typeface.json', 'notoTibetan', 'Noto Serif Tibetan_Regular.typeface.json');
}

// Function to load additional fonts for different scripts (primarily for CSS/2D Canvas)
function loadAdditionalWebFonts() {
  console.log("Loading essential web fonts via Google Fonts CSS API.");
  
  // Load a smaller set of most important fonts to ensure they load correctly
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400&family=Noto+Sans+JP&family=Noto+Sans+KR&family=Noto+Sans+Arabic&family=Noto+Sans+Hebrew&display=swap';
  
  // Add link element to document head
  document.head.appendChild(fontLink);
  
  // Create a test element to verify font loading
  const testElement = document.createElement('div');
  testElement.style.fontFamily = "'Noto Sans', sans-serif";
  testElement.style.position = 'absolute';
  testElement.style.visibility = 'hidden';
  testElement.textContent = 'Font Test';
  document.body.appendChild(testElement);
  
  console.log("Web font links added to document head. Loading essential fonts first.");
  
  // Add event listener to reload organisms once fonts are loaded
  document.fonts.ready.then(() => {
    console.log("System fonts have loaded!");
    
    // If no organisms yet and the default font is ready, initialize
    if (organisms.length === 0 && isDefaultFontReady) {
      console.log("Initializing organisms now that fonts are ready");
      initializeOrganisms();
    } else if (organisms.length > 0) {
      console.log("Rebuilding organism visuals with loaded fonts");
      // Refresh existing organism visuals
      for (let org of organisms) {
        if (org.mesh) {
          org.removeMesh();
          org.createVisualRepresentation();
        }
      }
    }
  }).catch(err => {
    console.warn("Font loading encountered an issue:", err);
    // Initialize anyway as fallback
    if (organisms.length === 0 && isDefaultFontReady) {
      initializeOrganisms();
    }
  });
}

function setup() {
  // --- Three.js setup FIRST ---
  const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.elt.oncontextmenu = () => false;
  pixelDensity(1);

  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(60, windowWidth / windowHeight, 1, 5000);
  threeCamera.position.set(0, 0, 800);
  threeRenderer = new THREE.WebGLRenderer({ canvas: canvas.elt, antialias: true, alpha: true });
  threeRenderer.setSize(windowWidth, windowHeight);
  threeRenderer.setClearColor(0x000000, 0);

  // Now you can add lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  threeScene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(0, 0, 1);
  threeScene.add(dirLight);

  // Configure 3D settings
  perspective(PI / 3.0, width / height, 10, CONFIG.renderDistance);

  // Initialize camera control
  if (CONFIG.cameraControl) {
    rotationY = 0;
    rotationX = 0;
    cameraZ = 500;
  }

  // Setup lighting for 3D (p5.js, can be kept for legacy visuals)
  ambientLight(CONFIG.ambientLightLevel);

  // Create dynamic point lights (p5.js, can be kept for legacy visuals)
  for (let i = 0; i < 3; i++) {
    lights.push({
      x: random(-width / 2, width / 2),
      y: random(-height / 2, height / 2),
      z: random(-200, 200),
      color: selectedPalette
        ? selectedPalette[floor(random(selectedPalette.length))]
        : [255, 255, 255],
    });
  }

  // Ensure script mapping is complete for all character types
  completeScriptMapping();

  // Initialize spatial partitioning grid (adapted for 3D)
  cols = ceil(width / cellSize);
  rows = ceil(height / cellSize);
  let depthCells = ceil(
    (CONFIG.depthRange.max - CONFIG.depthRange.min) / cellSize
  );
  grid = new Array(cols * rows * depthCells);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = [];
  }

  // Initialize camera interaction if supported
  setupCameraInteraction();

  // Initialize audio system (deferred until user interaction to prevent AudioContext errors)
  // setupAudio();

  // Select initial color palette
  paletteIndex = constrain(paletteIndex, 0, PALETTES.length - 1);
  selectedPalette = PALETTES[paletteIndex];

  // NEW: Populate availableScriptCategories for highlighting
  const uniqueScriptCategories = new Set();
  CONFIG.types.forEach(charType => {
    // Use a simplified getScriptCategory logic for setup, similar to Organism.getScriptCategory
    // This is to ensure all potential scripts from CONFIG.types are considered.
    let script = "default"; // Default value
    const code = charType.charCodeAt(0);

    // This is a simplified version of getScriptCategory for setup purposes.
    // It's important that this logic aligns with how Organism.getScriptCategory determines scripts.
    if (CONFIG.scriptMap[charType]) {
      script = CONFIG.scriptMap[charType];
    } else {
      // A condensed version of the Unicode block checks from Organism.getScriptCategory
      if (code >= 0x0370 && code <= 0x03FF) script = "greek";
      else if (code >= 0x0400 && code <= 0x04FF) script = "cyrillic"; // Ensure cyrillic is handled if present
      else if (code >= 0x0530 && code <= 0x058F) script = "armenian";
      else if (code >= 0x10A0 && code <= 0x10FF) script = "georgian";
      else if (code >= 0x0590 && code <= 0x05FF) script = "hebrew";
      else if (code >= 0x0600 && code <= 0x06FF) script = "arabic";
      else if (code >= 0x0700 && code <= 0x074F) script = "syriac";
      else if (code >= 0x2C80 && code <= 0x2CFF) script = "coptic";
      else if (code >= 0x1200 && code <= 0x137F) script = "ethiopic";
      else if (code >= 0x13A0 && code <= 0x13FF) script = "cherokee";
      else if (code >= 0x1400 && code <= 0x167F) script = "canadianAboriginal";
      else if (code >= 0x0F00 && code <= 0x0FFF) script = "tibetan";
      else if (code >= 0x1000 && code <= 0x109F) script = "burmese";
      else if (code >= 0x0E00 && code <= 0x0E7F) script = "southeastAsian"; // Thai
      else if (code >= 0x0E80 && code <= 0x0EFF) script = "southeastAsian"; // Lao
      else if (code >= 0x1780 && code <= 0x17FF) script = "khmer"; // Explicitly khmer
      else if (code >= 0x0D80 && code <= 0x0DFF) script = "sinhala";
      else if (code >= 0x0D00 && code <= 0x0D7F) script = "indic"; // Malayalam
      else if (code >= 0x0B80 && code <= 0x0BFF) script = "indic"; // Tamil
      else if (code >= 0x0C00 && code <= 0x0C7F) script = "indic"; // Telugu
      else if (code >= 0x0C80 && code <= 0x0CFF) script = "indic"; // Kannada
      else if (code >= 0x0980 && code <= 0x09FF) script = "indic"; // Bengali
      else if (code >= 0x0A80 && code <= 0x0AFF) script = "indic"; // Gujarati
      else if (code >= 0x0B00 && code <= 0x0B7F) script = "indic"; // Odia
      else if (code >= 0x0A00 && code <= 0x0A7F) script = "indic"; // Gurmukhi
      else if (code >= 0x0900 && code <= 0x097F) script = "indic"; // Devanagari
      else if (code >= 0x1800 && code <= 0x18AF) script = "mongolian";
      else if (code >= 0x2D30 && code <= 0x2D7F) script = "tifinagh";
      else if ((code >= 0x1100 && code <= 0x11FF) || (code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF) || (code >= 0x4E00 && code <= 0x9FFF)) script = "eastAsian";
      else if (code >= 0x07C0 && code <= 0x07FF) script = "nko";
      else if (code >= 0xA500 && code <= 0xA63F) script = "vai";
      else if (code >= 0x10480 && code <= 0x104AF) script = "osmanya";
      else if (code >= 0x1E900 && code <= 0x1E95F) script = "adlam";
      else if (code >= 0x1680 && code <= 0x169F) script = "ogham";
      else if (code >= 0x16A0 && code <= 0x16FF) script = "runic";
      else if ((code >= 0x2C00 && code <= 0x2C5F) || (code >= 0x1E000 && code <= 0x1E02F)) script = "glagolitic";
      else if (code >= 0x16800 && code <= 0x16A3F) script = "bamum";
    }
    uniqueScriptCategories.add(script);
  });

  availableScriptCategories = ["all_white", ...Array.from(uniqueScriptCategories).sort()];
  highlightedScriptCategory = availableScriptCategories[0]; // Start with "all_white"
  currentHighlightIndex = 0;

  // Ensure all detected script categories have a color in SCRIPT_HIGHLIGHT_COLORS
  availableScriptCategories.forEach(scriptCat => {
    if (scriptCat !== "all_white" && !SCRIPT_HIGHLIGHT_COLORS[scriptCat]) {
      console.warn(`Script category "${scriptCat}" is missing a defined highlight color. Assigning a random color.`);
      SCRIPT_HIGHLIGHT_COLORS[scriptCat] = [
        floor(random(50, 255)),
        floor(random(50, 255)),
        floor(random(50, 255)),
      ];
    }
  });
  console.log("Available script categories for highlighting:", availableScriptCategories);
  // END NEW

  // Initialize ecosystem
  ecosystem = new Ecosystem();
  
  // Load non-critical web fonts (for CSS/2D canvas)
  loadAdditionalWebFonts();

  // Create organisms only if the default 3D font is ready and they haven't been created yet
  if (isDefaultFontReady && !organisms.length) {
    initializeOrganisms();
  }

  // Setup UI elements and event listeners
  setupUI();

  // Track metadata
  metadata.timeSinceStart = millis();

  // For consistent typography
  if (fontMono) textFont(fontMono);

  // Enable smooth fading in
  fadeInAlpha = 0;

  console.log(
    "Synthetic Biome 3D setup complete - grid size:",
    cols,
    "x",
    rows
  );

  // Create noise texture for artistic grain effect
  createNoiseTexture();

  // Initialize letter flow system
  letterIndex = CONFIG.types.length - 1;
  
  // Set up letter destination regions based on scripts
  setupLetterFlowDestinations();
}

// NEW: Function to set up letter flow destinations
function setupLetterFlowDestinations() {
    // Create a truly 3D arrangement of destinations for letters to flow toward
    
    // Extract unique script categories from CONFIG.scriptMap
    const scriptCategories = new Set();
    Object.values(CONFIG.scriptMap).forEach(script => {
        scriptCategories.add(script);
    });
    
    // Add fallback categories not already in scriptMap
    ["latin", "numbers", "punctuation", "default"].forEach(cat => {
        scriptCategories.add(cat);
    });
    
    // Initialize the destinations object
    window.letterFlowDestinations3D = {};
    
    // First set up the default region which serves as fallback
    window.letterFlowDestinations3D["default"] = {
        x: [-width/6, width/6],       // Central region
        y: [-height/6, height/6],
        z: [-100, 100]
    };
    
    // Create spatial distribution for each script category
    // Map positions clockwise in a 3D sphere around the center
    const categories = Array.from(scriptCategories);
    const numCategories = categories.length;
    
    categories.forEach((category, index) => {
        // Skip default as we already defined it
        if (category === "default") return;
        
        // Calculate position based on index
        // Place different script categories in different regions of 3D space
        const angle = (index / numCategories) * TWO_PI;
        const radiusX = width/3;
        const radiusY = height/3;
        const depthZ = 200;
        
        // Calculate region center point
        const centerX = radiusX * cos(angle);
        const centerY = radiusY * sin(angle);
        // Alternate depth based on even/odd index
        const centerZ = index % 2 === 0 ? depthZ : -depthZ;
        
        // Create rectangular region around center point
        window.letterFlowDestinations3D[category] = {
            x: [centerX - width/6, centerX + width/6],
            y: [centerY - height/6, centerY + height/6],
            z: [centerZ - 100, centerZ + 100]
        };
    });
    
    console.log("Letter flow destinations set up for all script categories:", Object.keys(window.letterFlowDestinations3D));
    
    // Check if we have a font we can use - if not, try to load it
    if (!loadedFonts['default'] && !window.fontLoadAttempted) {
        window.fontLoadAttempted = true;
        
        console.log("No default font detected, attempting to load helvetiker_regular.typeface.json");
        
        try {
            const loader = new THREE.FontLoader();
            loader.load(
                'helvetiker_regular.typeface.json',
                function(font) {
                    console.log("Successfully loaded helvetiker_regular.typeface.json");
                    loadedFonts['default'] = font;
                    defaultFont = font;
                    isDefaultFontReady = true;
                },
                undefined,
                function(error) {
                    console.error("Error loading font:", error);
                }
            );
        } catch (error) {
            console.error("Exception loading font:", error);
        }
    }
}

// NEW: Add mouse moved function to create letters while moving mouse
function mouseMoved() {
   // SAFETY CHECK: Ensure letterFlowDestinations3D exists and has all required categories
    if (!window.letterFlowDestinations3D) {
        // console.warn("letterFlowDestinations3D not initialized yet. Skipping mouseMoved.");
        return;
    }

    // Ensure all necessary script categories exist
    const requiredCategories = ["default", "latin", "greek", "numbers", "punctuation"];
    for (const cat of requiredCategories) {
        if (!window.letterFlowDestinations3D[cat]) {
            // Create a fallback if category is missing
            window.letterFlowDestinations3D[cat] = window.letterFlowDestinations3D["default"] || {
                x: [-width/6, width/6],
                y: [-height/6, height/6],
                z: [-100, 100]
            };
        }
    }

  if (isMouseOverUI()) return;
    
    // Create a new letter organism at the mouse position
    if (letterIndex >= 0) {
        // Use a simplified set of characters that are more likely to work with default fonts
        const safeCharacters = [
            // Latin alphabet - most fonts support these
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            
            // Greek - Basic set often available
            'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν',
            'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν',
            
            // Punctuation and numbers
            '.', ',', '?', '!', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        ];
        
        // Get a character from our safe set
        let charIndex = Math.floor(random(0, safeCharacters.length));
        let letter = safeCharacters[charIndex];
        
        // Determine script category for this character
        let scriptCategory = "default";
        if (/[Α-Ωα-ω]/.test(letter)) {
            scriptCategory = "greek";
        } else if (/[A-Za-z]/.test(letter)) {
            scriptCategory = "latin";
        } else if (/[0-9]/.test(letter)) {
            scriptCategory = "numbers";
        } else {
            scriptCategory = "punctuation";
        }
        
        // Get 3D destination region for this script category
        const region = window.letterFlowDestinations3D[scriptCategory] || 
                       window.letterFlowDestinations3D["default"];
        
        // Get a 3D position from the mouse
        const mousePos3D = mousePositionTo3D();
        
        // Generate random destination within the 3D region for this category
        const destX = random(region.x[0], region.x[1]);
        const destY = random(region.y[0], region.y[1]);
        const destZ = random(region.z[0], region.z[1]);
        
        // Create letter flow data with true 3D positioning
        letterOrgData.push({
            letter: letter,
            // Start at the 3D mouse position
            x: mousePos3D.x,
            y: mousePos3D.y,
            z: mousePos3D.z,
            // 3D destination within the appropriate volumetric region
            destX: destX,
            destY: destY,
            destZ: destZ,
            scriptCategory: scriptCategory,
            // 3D velocities
            xVel: 0,
            yVel: 0,
            zVel: 0,
            // Size based on distance from camera for better depth perception
            size: map(mousePos3D.z, -300, 300, 30, 15),
            // Add rotation for 3D effect
            rotationX: random(-0.01, 0.01),
            rotationY: random(-0.01, 0.01),
            rotationZ: random(-0.01, 0.01)
        });
        
        // Limit the number of letters
        if (letterOrgData.length > maxLetters) {
            letterOrgData.splice(0, 1);
        }
    }
}

// Function to ensure all character types have script mappings
function completeScriptMapping() {
  // Add script mappings for any characters not explicitly defined
  CONFIG.types.forEach(charType => {
    if (!CONFIG.scriptMap[charType]) {
      // Use unicode detection to assign script
      const code = charType.charCodeAt(0);
      
      // Detect script ranges
      if (code >= 0x0370 && code <= 0x03FF) 
        CONFIG.scriptMap[charType] = "greek";
      else if (code >= 0x0530 && code <= 0x058F) 
        CONFIG.scriptMap[charType] = "armenian";
      else if (code >= 0x10A0 && code <= 0x10FF) 
        CONFIG.scriptMap[charType] = "georgian";
      else if (code >= 0x0590 && code <= 0x05FF)
        CONFIG.scriptMap[charType] = "hebrew";
      else if (code >= 0x0600 && code <= 0x06FF)
        CONFIG.scriptMap[charType] = "arabic";
      else if (code >= 0x0700 && code <= 0x074F)
        CONFIG.scriptMap[charType] = "syriac";
      else if (code >= 0x2C80 && code <= 0x2CFF)
        CONFIG.scriptMap[charType] = "coptic";
      else if (code >= 0x1200 && code <= 0x137F)
        CONFIG.scriptMap[charType] = "ethiopic";
      else if (code >= 0x13A0 && code <= 0x13FF)
        CONFIG.scriptMap[charType] = "cherokee";
      else if (code >= 0x1400 && code <= 0x167F)
        CONFIG.scriptMap[charType] = "canadianAboriginal";
      else if (code >= 0x0F00 && code <= 0x0FFF)
        CONFIG.scriptMap[charType] = "tibetan";
      else if (code >= 0x1000 && code <= 0x109F)
        CONFIG.scriptMap[charType] = "burmese";
      else if (code >= 0x0E00 && code <= 0x0E7F)
        CONFIG.scriptMap[charType] = "southeastAsian"; // Thai
      else if (code >= 0x0E80 && code <= 0x0EFF)
        CONFIG.scriptMap[charType] = "southeastAsian"; // Lao
      else if (code >= 0x1780 && code <= 0x17FF)
        CONFIG.scriptMap[charType] = "khmer";
      else if (code >= 0x0D80 && code <= 0x0DFF)
        CONFIG.scriptMap[charType] = "sinhala";
      else if (code >= 0x0D00 && code <= 0x0D7F)
        CONFIG.scriptMap[charType] = "indic"; // Malayalam
      else if (code >= 0x0B80 && code <= 0x0BFF)
        CONFIG.scriptMap[charType] = "indic"; // Tamil
      else if (code >= 0x0C00 && code <= 0x0C7F)
        CONFIG.scriptMap[charType] = "indic"; // Telugu
      else if (code >= 0x0C80 && code <= 0x0CFF)
        CONFIG.scriptMap[charType] = "indic"; // Kannada
      else if (code >= 0x0980 && code <= 0x09FF)
        CONFIG.scriptMap[charType] = "indic"; // Bengali
      else if (code >= 0x0A80 && code <= 0x0AFF)
        CONFIG.scriptMap[charType] = "indic"; // Gujarati
      else if (code >= 0x0B00 && code <= 0x0B7F)
        CONFIG.scriptMap[charType] = "indic"; // Odia
      else if (code >= 0x0A00 && code <= 0x0A7F)
        CONFIG.scriptMap[charType] = "indic"; // Gurmukhi
      else if (code >= 0x0900 && code <= 0x097F)
        CONFIG.scriptMap[charType] = "indic"; // Devanagari
      else if (code >= 0x1800 && code <= 0x18AF)
        CONFIG.scriptMap[charType] = "mongolian";
      else if (code >= 0x2D30 && code <= 0x2D7F)
        CONFIG.scriptMap[charType] = "tifinagh";
      else if (code >= 0x1100 && code <= 0x11FF) // Hangul Jamo
        CONFIG.scriptMap[charType] = "eastAsian";
      else if (code >= 0xAC00 && code <= 0xD7AF) // Hangul Syllables
        CONFIG.scriptMap[charType] = "eastAsian";
      else if (code >= 0x3040 && code <= 0x309F)
        CONFIG.scriptMap[charType] = "eastAsian"; // Hiragana
      else if (code >= 0x30A0 && code <= 0x30FF)
        CONFIG.scriptMap[charType] = "eastAsian"; // Katakana
      else if (code >= 0x4E00 && code <= 0x9FFF)
        CONFIG.scriptMap[charType] = "eastAsian"; // CJK
      else if (code >= 0x07C0 && code <= 0x07FF)
        CONFIG.scriptMap[charType] = "nko";
      else if (code >= 0xA500 && code <= 0xA63F)
        CONFIG.scriptMap[charType] = "vai";
      else if (code >= 0x10480 && code <= 0x104AF)
        CONFIG.scriptMap[charType] = "osmanya";
      else if (code >= 0x1E900 && code <= 0x1E95F)
        CONFIG.scriptMap[charType] = "adlam";
      else if (code >= 0x1680 && code <= 0x169F)
        CONFIG.scriptMap[charType] = "ogham";
      else if (code >= 0x16A0 && code <= 0x16FF)
        CONFIG.scriptMap[charType] = "runic";
      else if (code >= 0x2C00 && code <= 0x2C5F) // Glagolitic (main block)
        CONFIG.scriptMap[charType] = "glagolitic";
      else if (code >= 0x1E000 && code <= 0x1E02F) // Glagolitic Supplement
        CONFIG.scriptMap[charType] = "glagolitic";
      else if (code >= 0x16800 && code <= 0x16A3F)
        CONFIG.scriptMap[charType] = "bamum";
      else
        CONFIG.scriptMap[charType] = "default";
    }
  });
  
  console.log("Script mapping completed for all character types");
} // This closes completeScriptMapping

// This was duplicated, removing the one here. The original is later in the file.
// // In windowResized, comment out the call if not needed
// function windowResized() {
// resizeCanvas(windowWidth, windowHeight);
// // ecosystem.generateFieldLines(); // Commented out if not needed
// }

// Add setupCameraInteraction function before the setup function
function setupCameraInteraction() {
  // Check if we're running in an exhibition setting with a URL parameter
  if (window.location.search.includes("exhibition=true")) {
    try {
      cameraInteraction.enabled = true;
      cameraInteraction.video = createCapture(VIDEO);
      cameraInteraction.video.size(320, 240);
      cameraInteraction.video.hide();

      // Initialize previous pixels array
      cameraInteraction.previousPixels = new Array(320 * 240 * 4).fill(0);

      console.log("Camera interaction enabled for exhibition mode");
    } catch (e) {
      console.warn("Could not initialize camera:", e);
      cameraInteraction.enabled = false;
    }
  }
}

class Organism {
  constructor(x, y) {
    // Physical properties - now in 3D
    this.pos = createVector(
      x,
      y,
      random(CONFIG.depthRange.min, CONFIG.depthRange.max)
    );
    this.vel = p5.Vector.random3D().mult(random(0.5, 1.5)); // Random 3D velocity
    this.acc = createVector(0, 0, 0);

    // Unique identifier
    this.id = floor(random(100000));

    // Genetic properties - the "DNA" of the organism
    this.dna = {
      // Core physical properties
      size: random(CONFIG.baseSize.min, CONFIG.baseSize.max),
      speed: random(CONFIG.baseSpeed.min, CONFIG.baseSpeed.max),
      mass: random(CONFIG.baseMass.min, CONFIG.baseMass.max),

      // Visual properties
      colorIndex: floor(random(selectedPalette.length)),
      opacity: random(0.7, 1),

      // Behavioral properties
      attraction: random() > 0.5,
      socialFactor: random(0.2, 1), // How much it's influenced by others
      explorationFactor: random(0.1, 0.9), // How much it explores

      // 3D specific properties
      depthPreference: random(-1, 1), // Preference for depth positioning
      rotationSpeed: random(-0.02, 0.02), // 3D rotation speed

      // Advanced properties
      specialization: random([
        "gatherer",
        "explorer",
        "defender",
        "communicator",
      ]),
      adaptability: random(0.2, 1), // How quickly it adapts to environment
      energyEfficiency: random(0.4, 0.9), // Efficiency metabolism
      mutationRate: random(0.01, 0.1), // Chance of mutation
      lifespan: random(CONFIG.baseLifespan.min, CONFIG.baseLifespan.max),
      signalStrength: random(0.2, 1), // How strongly it influences others
    };

    // Current state
    this.age = 0;
    this.energy = 100;
    this.reproduction = 0;
    this.trail = [];
    this.maxTrail = floor(map(this.dna.speed, 0.5, 3, 5, 15));
    this.hasInteracted = false;
    this.interactionPartners = new Set();
    this.lastSound = 0;

    // 3D rotation state
    this.rotation = {
      x: random(TWO_PI),
      y: random(TWO_PI),
      z: random(TWO_PI),
    };

    // For emergent behaviors
    this.state = "exploring";
    this.stateCounter = 0;
    this.target = null;
    this.memories = []; // Simple memory system
    
    // Mesh for THREE.js rendering
    this.mesh = null;
    
    // Determine text type - IMPROVED character selection logic
    // Increase probability of using actual text characters instead of shapes
    const useTextCharacter = random() < 0.85; // 85% chance to use text characters
    
    if (useTextCharacter) {
      // Select a character from CONFIG.types based on available fonts
      // Choose from categories where we have more confidence in font support
      const availableFontScripts = [];
      
      // Add script categories based on which fonts are actually loaded
      if (loadedFonts.notosans && isDefaultFontReady) availableFontScripts.push("default", "greek");
      if (loadedFonts.notoArmenian) availableFontScripts.push("armenian");
      if (loadedFonts.notoGeorgian) availableFontScripts.push("georgian");
      if (loadedFonts.notoHebrewThin) availableFontScripts.push("hebrew");
      if (loadedFonts.vazir) availableFontScripts.push("arabic");
      if (loadedFonts.notoDevanagari) availableFontScripts.push("indic");
      if (loadedFonts.notoBengali) availableFontScripts.push("indic");
      if (loadedFonts.notoJP) availableFontScripts.push("eastAsian");
      if (loadedFonts.notoThai) availableFontScripts.push("southeastAsian");
      
      // If no fonts are loaded yet, default to a small set of Latin characters
      if (availableFontScripts.length === 0 || !isDefaultFontReady) {
        // Use simple Latin characters that should work with most fonts
        this.dna.type = random(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", 
                               "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]);
      } else {
        // Select a script category from available ones
        const scriptCategory = random(availableFontScripts);
        
        // Get all characters from CONFIG.types that belong to this script category
        const charactersInScript = CONFIG.types.filter(char => {
          try {
            const code = char.charCodeAt(0);
            const charScript = this.getScriptCategory(char);
            return charScript === scriptCategory;
          } catch (e) {
            return false;
          }
        });
        
        // If we found characters for this script, choose one randomly
        if (charactersInScript.length > 0) {
          this.dna.type = random(charactersInScript);
        } else {
          // Fallback to Latin or geometric shapes
          this.dna.type = random([
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
            "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
          ]);
        }
      }
    } else {
      // Use geometric shapes for the remaining 15% probability
      this.dna.type = random(["circle", "triangle", "square", "spiral", "asterisk", "cross"]);
    }
    
    this.textType = this.dna.type;
    this.scriptCategory = this.getScriptCategory(this.textType);
    
    // Create the appropriate visual representation
    this.createVisualRepresentation();
  }
  
  // Helper method to determine the script category for a character
  getScriptCategory(character) {
    // First check if the character is in our script map
    if (CONFIG.scriptMap[character]) {
      return CONFIG.scriptMap[character];
    }
    
    // If not found in map, try to detect by Unicode ranges
    const code = character.charCodeAt(0);
    
    // Greek: U+0370 to U+03FF
    if (code >= 0x0370 && code <= 0x03FF) return "greek";
    
    // Cyrillic: U+0400 to U+04FF
    if (code >= 0x0400 && code <= 0x04FF) return "cyrillic";
    
    // Hebrew: U+0590 to U+05FF
    if (code >= 0x0590 && code <= 0x05FF) return "hebrew";
    
    // Arabic: U+0600 to U+06FF
    if (code >= 0x0600 && code <= 0x06FF) return "arabic";
    
    // Devanagari: U+0900 to U+097F
    if (code >= 0x0900 && code <= 0x097F) return "indic";
    
    // Thai: U+0E00 to U+0E7F
    if (code >= 0x0E00 && code <= 0x0E7F) return "southeastAsian";
    
    // CJK Unified Ideographs: U+4E00 to U+9FFF
    if (code >= 0x4E00 && code <= 0x9FFF) return "eastAsian";
    
    // Default to Latin-based
    return "default";
  }
  
  // Create the visual representation based on the character and script
  createVisualRepresentation() {
    // Get color from palette - THIS WILL BE OVERRIDDEN BY HIGHLIGHTING LOGIC
    // const color = selectedPalette ? selectedPalette[this.dna.colorIndex] : [255,255,255];
    
    // Determine color based on script category and highlighting
    let organismColorRGB;
    
    // Check if we're in all-white mode (default)
    if (highlightedScriptCategory === "all_white") {
      // In all-white mode, everything is white
      organismColorRGB = WHITE_COLOR_RGB;
    } 
    else {
      // We're in a specific language highlight mode
      if (this.scriptCategory === highlightedScriptCategory) {
        // This is the specifically highlighted script category
        organismColorRGB = SCRIPT_HIGHLIGHT_COLORS[this.scriptCategory] || WHITE_COLOR_RGB;
      } 
      else {
        // All other script categories should be white when a specific one is highlighted
        organismColorRGB = WHITE_COLOR_RGB;
      }
    }
    
    // Safely create THREE.Color with proper error handling
    let threeColor;
    try {
      threeColor = new THREE.Color(`rgb(${organismColorRGB[0]},${organismColorRGB[1]},${organismColorRGB[2]})`);
    } catch (e) {
      console.warn("Error creating THREE.Color, using default white:", e);
      threeColor = new THREE.Color(0xffffff);
    }
    
    let geometry;
    let material;

    // First check if this is a geometric shape character
    if (["circle", "triangle", "square", "spiral", "asterisk", "cross"].includes(this.textType)) {
      // ... (geometric shape logic remains the same) ...
      try {
        switch(this.textType) {
          case "circle":
            geometry = new THREE.CircleGeometry(this.dna.size / 2, 32);
            break;
          case "triangle":
            geometry = new THREE.ConeGeometry(this.dna.size / 2, this.dna.size, 3);
            break;
          case "square":
            geometry = new THREE.BoxGeometry(this.dna.size, this.dna.size, this.dna.size / 4);
            break;
          case "spiral":
            geometry = new THREE.TorusKnotGeometry(this.dna.size / 3, this.dna.size / 9, 64, 8, 2, 3);
            break;
          case "asterisk":
            geometry = new THREE.CircleGeometry(this.dna.size / 2, 5);
            break;
          case "cross":
            const crossBar1 = new THREE.BoxGeometry(this.dna.size, this.dna.size / 3, this.dna.size / 4);
            const crossBar2 = new THREE.BoxGeometry(this.dna.size / 3, this.dna.size, this.dna.size / 4);
            if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) {
              geometry = THREE.BufferGeometryUtils.mergeBufferGeometries([crossBar1, crossBar2]);
            } else {
              console.warn("THREE.BufferGeometryUtils.mergeBufferGeometries not available. Cross shape will be simpler.");
              geometry = crossBar1; // Fallback to one bar
            }
            break;
          default:
            geometry = new THREE.CircleGeometry(this.dna.size / 2, 32);
        }
      } catch (e) {
        console.warn("Error creating geometry for shape, using fallback circle:", e);
        geometry = new THREE.CircleGeometry(this.dna.size / 2, 16); // Simpler circle as fallback
      }
      
      try {
        material = new THREE.MeshPhongMaterial({ 
          color: threeColor, 
          shininess: 80,
          transparent: true,
          opacity: this.dna.opacity
        });
      } catch (e) {
        console.warn("Error creating material, using fallback basic material:", e);
        material = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          transparent: true,
          opacity: this.dna.opacity
        });
      }
      
      try {
        this.mesh = new THREE.Mesh(geometry, material);
      } catch (e) {
        console.error("Failed to create mesh for geometric shape:", e);
        // Create an extremely simple fallback mesh
        const fallbackGeom = new THREE.BoxGeometry(this.dna.size, this.dna.size, this.dna.size);
        const fallbackMat = new THREE.MeshBasicMaterial({color: 0xffffff});
        this.mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
      }
      
    } else {
      // Attempt to render as 3D text
      let fontForText = null;
      let fontNameForLog = "";
      const originalTextType = this.textType; // Store the original character for logging

      // ADDED: Wrap font selection in try-catch
      try {
        if (this.scriptCategory === 'arabic' && loadedFonts.vazir) {
          fontForText = loadedFonts.vazir;
          fontNameForLog = "Vazirmatn";
        } else if (this.scriptCategory === 'armenian' && loadedFonts.notoArmenian) {
          fontForText = loadedFonts.notoArmenian;
          fontNameForLog = "Noto Sans Armenian";
        } else if (this.scriptCategory === 'georgian' && loadedFonts.notoGeorgian) {
          fontForText = loadedFonts.notoGeorgian;
          fontNameForLog = "Noto Sans Georgian";
        } else if (this.scriptCategory === 'hebrew' && loadedFonts.notoHebrewThin) {
          fontForText = loadedFonts.notoHebrewThin;
          fontNameForLog = "Noto Sans Hebrew Thin";
        } else if (this.scriptCategory === 'ethiopic' && loadedFonts.notoEthiopic) {
          fontForText = loadedFonts.notoEthiopic;
          fontNameForLog = "Noto Sans Ethiopic";
        } 
        // Greek characters covered by Noto Sans Regular
        else if (this.scriptCategory === 'greek' && loadedFonts.notosans) {
          fontForText = loadedFonts.notosans;
          fontNameForLog = "Noto Sans Regular (for Greek)";
        }
        // Tibetan
        else if (this.scriptCategory === 'tibetan' && loadedFonts.notoTibetan) {
          fontForText = loadedFonts.notoTibetan;
          fontNameForLog = "Noto Serif Tibetan";
        }
        // East Asian - specifically checking for Japanese characters first
        else if (this.scriptCategory === 'eastAsian') {
          const charCode = this.textType.charCodeAt(0);
          // Check if it's a Japanese character (Hiragana, Katakana) and notoJP is loaded
          if (((charCode >= 0x3040 && charCode <= 0x309F) || (charCode >= 0x30A0 && charCode <= 0x30FF)) && loadedFonts.notoJP) {
            fontForText = loadedFonts.notoJP;
            fontNameForLog = "Noto Sans JP";
          } else if (loadedFonts.notosans) { // Fallback for other East Asian or if Noto JP not specific enough/loaded
            fontForText = loadedFonts.notosans;
            fontNameForLog = "Noto Sans Regular (East Asian Fallback)";
          } else if (defaultFont) { // Further fallback
            fontForText = defaultFont;
            fontNameForLog = "Helvetiker (East Asian Fallback)";
          }
        }
        // Specific checks for Indic scripts
        else if (this.scriptCategory === 'indic') {
          const charCode = this.textType.charCodeAt(0);
          if (charCode >= 0x0980 && charCode <= 0x09FF && loadedFonts.notoBengali) { // Bengali
            fontForText = loadedFonts.notoBengali;
            fontNameForLog = "Noto Sans Bengali";
          } else if (charCode >= 0x0900 && charCode <= 0x097F && loadedFonts.notoDevanagari) { // Devanagari
            fontForText = loadedFonts.notoDevanagari;
            fontNameForLog = "Noto Sans Devanagari";
          } else if (charCode >= 0x0D00 && charCode <= 0x0D7F && loadedFonts.notoMalayalam) { // Malayalam
            fontForText = loadedFonts.notoMalayalam;
            fontNameForLog = "Noto Sans Malayalam";
          } else if (loadedFonts.notoDevanagari) { // Fallback to Devanagari for other Indic
              fontForText = loadedFonts.notoDevanagari;
              fontNameForLog = "Noto Sans Devanagari (Indic Fallback)";
          } else if (loadedFonts.notosans) { // Further fallback for Indic
              fontForText = loadedFonts.notosans;
              fontNameForLog = "Noto Sans Regular (Indic Fallback)";
          }
        } 
        // Specific checks for Southeast Asian scripts
        else if (this.scriptCategory === 'southeastAsian') {
          const charCode = this.textType.charCodeAt(0);
          if (charCode >= 0x0E00 && charCode <= 0x0E7F && loadedFonts.notoThai) { // Thai
            fontForText = loadedFonts.notoThai;
            fontNameForLog = "Noto Sans Thai";
          } else if (loadedFonts.notoThai) { // Fallback for other SEA to Thai if available
              fontForText = loadedFonts.notoThai;
              fontNameForLog = "Noto Sans Thai (SEA Fallback)";
          } else if (loadedFonts.notosans) { // Further fallback for SEA
              fontForText = loadedFonts.notosans;
              fontNameForLog = "Noto Sans Regular (SEA Fallback)";
          }
        }
      } catch (e) {
        console.warn("Error during font mapping selection, using default font:", e);
        fontForText = null; // Will be handled by the fallback logic below
      }
      
      // NEW: If no specific font was found by the above checks for the script category,
      // then fontForText is still null. In this case, decide to use a digit or sign.
      if (!fontForText) {
        try {
          const useDigit = Math.random() < 0.5; // 50% chance to use a digit
          const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
          const signs = ['*', '+', '-', '=', '?', '!', '@', '#', '$', '%', '^', '&', '<', '>', '~', '/', '\\\\', '|'];

          if (useDigit && defaultFont) { // Use Helvetiker for digits
              this.textType = digits[Math.floor(Math.random() * digits.length)];
              fontForText = defaultFont; // Helvetiker
              fontNameForLog = "Helvetiker (digit fallback)";
          } else { // Use a sign. Try Noto Sans, then Helvetiker.
              this.textType = signs[Math.floor(Math.random() * signs.length)];
              if (loadedFonts.notosans) {
                  fontForText = loadedFonts.notosans;
                  fontNameForLog = "Noto Sans Regular (sign fallback)";
              } else if (defaultFont) {
                  fontForText = defaultFont;
                  fontNameForLog = "Helvetiker (sign fallback)";
              } else {
                  // Ultimate fallback - use empty font and a simple shape
                  fontForText = emptyFallbackFont;
                  fontNameForLog = "Empty fallback font";
              }
          }
        } catch (e) {
          console.warn("Error in fallback character selection:", e);
          // Set ultimate fallback to use a box instead
          fontForText = null;
        }
      }

      // ADDED: Ensure fontForText is valid, otherwise use a box
      if (!fontForText || typeof fontForText.generateShapes !== 'function') {
        console.warn(`No valid font available. Using box geometry fallback.`);
        
        try {
          // Use box geometry instead of text
          geometry = new THREE.BoxGeometry(this.dna.size * 0.7, this.dna.size * 0.7, this.dna.size * 0.2);
          material = new THREE.MeshPhongMaterial({ 
            color: threeColor, 
            transparent: true, 
            opacity: this.dna.opacity 
          });
          this.mesh = new THREE.Mesh(geometry, material);
        } catch (e) {
          console.error("Failed to create fallback mesh:", e);
          // Create an extremely simple fallback mesh that should work in any case
          const fallbackGeom = new THREE.BoxGeometry(this.dna.size, this.dna.size, this.dna.size);
          const fallbackMat = new THREE.MeshBasicMaterial({color: 0xffffff});
          this.mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
        }
      } else {
          try {
              const charSize = this.dna.size * 1.0; 
              geometry = new THREE.TextGeometry(this.textType, { // this.textType might be a digit/sign now
                  font: fontForText,
                  size: charSize,
                  height: charSize / 10, 
                  curveSegments: 3, 
                  bevelEnabled: true,
                  bevelThickness: charSize / 50,
                  bevelSize: charSize / 100, 
                  bevelOffset: 0,
                  bevelSegments: 1 
              });

              geometry.computeBoundingBox();
              const textBoundingBox = geometry.boundingBox;
              const centerOffset = new THREE.Vector3(
                  -0.5 * (textBoundingBox.max.x - textBoundingBox.min.x),
                  -0.5 * (textBoundingBox.max.y - textBoundingBox.min.y),
                  -0.5 * (textBoundingBox.max.z - textBoundingBox.min.z) 
              );
              geometry.translate(centerOffset.x, centerOffset.y, centerOffset.z);
              
              material = new THREE.MeshPhongMaterial({
                  color: threeColor, // Use the new threeColor based on highlighting
                  shininess: 50,
                  transparent: true,
                  opacity: this.dna.opacity,
              });

              this.mesh = new THREE.Mesh(geometry, material);

          } catch (e) {
              console.warn(`Error creating 3D text geometry for type '${this.textType}' (original '${originalTextType}') with ${fontNameForLog}:`, e);
              
              // Fallback to a simple box
              try {
                geometry = new THREE.BoxGeometry(this.dna.size * 0.7, this.dna.size * 0.7, this.dna.size * 0.2);
                material = new THREE.MeshPhongMaterial({
                    color: threeColor,
                    transparent: true,
                    opacity: this.dna.opacity
                });
                this.mesh = new THREE.Mesh(geometry, material);
              } catch(e2) {
                console.error("Failed to create even fallback mesh, using minimal fallback:", e2);
                // Minimal possible fallback that should never fail
                const fallbackGeom = new THREE.BoxGeometry(this.dna.size, this.dna.size, this.dna.size);
                const fallbackMat = new THREE.MeshBasicMaterial({color: 0xffffff});
                this.mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
              }
          }
      }
    }
    
    // ADDED: Final safety check to ensure this.mesh is defined
    if (!this.mesh) {
      console.error("Mesh creation totally failed, creating minimal mesh");
      const fallbackGeom = new THREE.BoxGeometry(this.dna.size, this.dna.size, this.dna.size);
      const fallbackMat = new THREE.MeshBasicMaterial({color: 0xffffff});
      this.mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
    }

    // Add the mesh to the THREE.js scene
    try {
      if (threeScene) threeScene.add(this.mesh);
    } catch (e) {
      console.error("Failed to add mesh to scene:", e);
    }
  }

  update(localDensity = 0) {
    // 3D movement and update
    this.vel.add(this.acc);
    this.vel.limit(this.dna.speed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Apply Focus/Resonance Tool Influence
    if (focusResonanceActive && focusResonancePosition) {
      let distToFocus = p5.Vector.dist(this.pos, focusResonancePosition);
      // Check if the organism is within the spherical radius of the focus tool
      if (distToFocus < focusResonanceRadius) {
        let forceToFocus = p5.Vector.sub(focusResonancePosition, this.pos);
        forceToFocus.normalize();
        
        // Apply a gentle force towards the center of the focus area
        // Use configuration value for strength
        let focusStrength = CONFIG.maxForce * CONFIG.wordSettings.focusResonanceStrength;
        forceToFocus.mult(focusStrength);
        this.applyForce(forceToFocus);

        // Apply velocity damping to encourage stabilization within the zone
        this.vel.mult(CONFIG.wordSettings.focusResonanceDamping);
      }
    }

    // Update 3D rotation
    this.rotation.x += this.dna.rotationSpeed * 0.5;
    this.rotation.y += this.dna.rotationSpeed;
    this.rotation.z += this.dna.rotationSpeed * 0.3;

    // Track position history for trail
    if (frameCount % 3 === 0) {
      this.trail.push(createVector(this.pos.x, this.pos.y, this.pos.z));
      if (this.trail.length > this.maxTrail) {
        this.trail.shift();
      }
    }

    // Age and energy management
    this.age++;
    this.energy -= map(
      this.dna.size,
      CONFIG.baseSize.min,
      CONFIG.baseSize.max,
      0.01,
      0.04
    );
    this.energy = constrain(this.energy, 0, 100);

    // Reproduction chance increases with age and energy
    if (this.age > 100 && this.energy > 60) {
      this.reproduction += this.dna.adaptability * 0.01;
    }

    // Try to reproduce
    if (this.reproduction > 1 && organisms.length < CONFIG.maxOrganisms) {
      this.reproduction = 0;

      // Create child with possible mutation
      let childX = this.pos.x + random(-20, 20);
      let childY = this.pos.y + random(-20, 20);
      let childZ = this.pos.z + random(-20, 20);

      // Stay within canvas and depth bounds
      childX = constrain(childX, -width / 2, width / 2);
      childY = constrain(childY, -height / 2, height / 2);
      childZ = constrain(childZ, CONFIG.depthRange.min, CONFIG.depthRange.max);

      let child = createOrganism(childX, childY, true);

      // Inherit traits from parent
      if (child) {
        child.pos.z = childZ;
        child.inheritFrom(this);
        metadata.generationCount++;
      }
    }

    // Depth preference behavior
    let depthForce = createVector(0, 0, this.dna.depthPreference * 0.05);
    this.applyForce(depthForce);

    // Boundary behavior (3D boundaries)
    this.checkEdges();

    // Metabolic sounds when energy changes significantly
    if (
      audioEnabled &&
      frameCount % 30 === 0 &&
      random() < 0.1 &&
      millis() - this.lastSound > 2000
    ) {
      this.playSound();
      this.lastSound = millis();
    }

    // Update state machine for complex behaviors
    this.stateCounter++;

    // State transitions based on environment and internal conditions
    if (this.stateCounter > 100) {
      this.stateCounter = 0;

      // Environmental response (density affects behavior)
      if (localDensity > 3) {
        // When crowded
        if (this.dna.specialization === "explorer") {
          this.state = "exploring"; // Explorers move away from crowds
        } else if (random() < 0.3) {
          this.state = random() < 0.5 ? "searching" : "grouping";
        }
      } else {
        // When isolated
        if (this.dna.specialization === "communicator") {
          this.state = "grouping"; // Communicators seek others
        } else {
          this.state =
            random() < this.dna.explorationFactor ? "exploring" : "searching";
        }
      }

      // Energy affects behavior
      if (this.energy < 30) {
        this.state = "searching"; // Low energy increases search behavior
      }

      // Store memory of current state and position
      if (this.memories.length > 5) this.memories.shift();
      this.memories.push({
        position: createVector(this.pos.x, this.pos.y, this.pos.z),
        state: this.state,
        frame: frameCount,
      });
    }
  }

  // 3D display method
  display() {
    try {
      if (this.mesh) {
        try {
          // Update mesh position and rotation
          this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
          
          // Apply script-specific animation styles
          try {
            switch(this.scriptCategory) {
              case "greek":
                this.mesh.rotation.x = this.rotation.x;
                this.mesh.rotation.y = this.rotation.y + sin(frameCount * 0.01 + this.id) * 0.1;
                this.mesh.rotation.z = this.rotation.z; 
                break;
              case "arabic":
                this.mesh.rotation.x = this.rotation.x + sin(frameCount * 0.02 + this.id) * 0.15;
                this.mesh.rotation.y = this.rotation.y + cos(frameCount * 0.015) * 0.2;
                this.mesh.rotation.z = this.rotation.z + sin(frameCount * 0.01) * 0.1;
                break;
              case "hebrew":
                this.mesh.rotation.x = this.rotation.x;
                this.mesh.rotation.y = this.rotation.y - sin(frameCount * 0.015) * 0.2; 
                this.mesh.rotation.z = this.rotation.z + cos(frameCount * 0.02 + this.id) * 0.1;
                break;
              case "eastAsian":
                this.mesh.rotation.x = this.rotation.x + sin(frameCount * 0.025) * 0.2;
                this.mesh.rotation.y = this.rotation.y;
                this.mesh.rotation.z = this.rotation.z + cos(frameCount * 0.01 + this.id) * 0.05;
                break;
              case "indic":
                this.mesh.rotation.x = this.rotation.x + sin(frameCount * 0.02) * 0.1;
                this.mesh.rotation.y = this.rotation.y + cos(frameCount * 0.025 + this.id) * 0.2;
                this.mesh.rotation.z = this.rotation.z;
                break;
              case "southeastAsian":
                this.mesh.rotation.x = this.rotation.x + cos(frameCount * 0.015) * 0.15;
                this.mesh.rotation.y = this.rotation.y + sin(frameCount * 0.01 + this.id) * 0.1;
                this.mesh.rotation.z = this.rotation.z;
                break;
              default:
                this.mesh.rotation.x = this.rotation.x;
                this.mesh.rotation.y = this.rotation.y;
                this.mesh.rotation.z = this.rotation.z;
            }
          } catch (e) {
            console.warn("Error setting rotation:", e);
            // Set simple rotation if the complex one fails
            try {
              this.mesh.rotation.set(0, 0, 0);
            } catch (e2) {
              console.error("Failed to set even basic rotation:", e2);
            }
          }

          // Determine color based on script category and highlighting for dynamic updates
          try {
            let currentOrganismColorRGB;
            
            // Check if we're in all-white mode (default)
            if (highlightedScriptCategory === "all_white") {
              // In all-white mode, everything is white
              currentOrganismColorRGB = WHITE_COLOR_RGB;
            } 
            else {
              // We're in a specific language highlight mode
              if (this.scriptCategory === highlightedScriptCategory) {
                // This is the specifically highlighted script category
                currentOrganismColorRGB = SCRIPT_HIGHLIGHT_COLORS[this.scriptCategory] || WHITE_COLOR_RGB;
              } 
              else {
                // All other script categories should be white when a specific one is highlighted
                currentOrganismColorRGB = WHITE_COLOR_RGB;
              }
            }
            
            // Safely check if material exists and is writable
            if (this.mesh.material && this.mesh.material.color && typeof this.mesh.material.color.setRGB === 'function') {
              if (Array.isArray(currentOrganismColorRGB) && currentOrganismColorRGB.length >= 3) {
                const r = currentOrganismColorRGB[0]/255;
                const g = currentOrganismColorRGB[1]/255;
                const b = currentOrganismColorRGB[2]/255;
                
                // Check for valid RGB values
                if (isFinite(r) && isFinite(g) && isFinite(b)) {
                  this.mesh.material.color.setRGB(r, g, b);
                }
              }
            }
          } catch (e) {
            console.warn("Error setting color:", e);
            // Try to set a default color if the dynamic one fails
            try {
              if (this.mesh.material && this.mesh.material.color) {
                this.mesh.material.color.set(0xffffff);
              }
            } catch (e2) {
              console.error("Failed to set even default color:", e2);
            }
          }

          // Apply opacity with safety checks
          try {
            if (this.mesh.material) {
              let baseOpacity = this.dna.opacity; // Assumed to be in 0-1 range
              let currentOpacity = baseOpacity;

              // Fade in when young
              if (this.age < 30) {
                currentOpacity = map(this.age, 0, 30, 0, baseOpacity);
              }
              // Fade out when near death
              if (this.age > this.dna.lifespan * 0.85) {
                currentOpacity = map(
                  this.age,
                  this.dna.lifespan * 0.85,
                  this.dna.lifespan,
                  currentOpacity, // Start from current Opacity before fading
                  0
                );
              }
              
              // Ensure opacity is a valid value
              if (isFinite(currentOpacity)) {
                this.mesh.material.opacity = constrain(currentOpacity, 0, 1);
                this.mesh.material.transparent = true;
              }
            }
          } catch (e) {
            console.warn("Error setting opacity:", e);
          }

          // Apply dynamic scale based on energy and script
          try {
            if (this.mesh.scale && typeof this.mesh.scale.set === 'function') {
              let energyFactor = map(this.energy, 0, 100, 0.7, 1.1);
              
              // Script-specific scaling behaviors
              if (this.scriptCategory === "arabic" || this.scriptCategory === "southeastAsian") {
                energyFactor *= (1 + sin(frameCount * 0.05 + this.id) * 0.1);
              } else if (this.scriptCategory === "eastAsian") {
                energyFactor *= (1 + sin(frameCount * 0.02 + this.id) * 0.05);
              }
              
              // Ensure scale factor is valid
              if (isFinite(energyFactor) && energyFactor > 0) {
                this.mesh.scale.set(energyFactor, energyFactor, energyFactor);
              } else {
                // Fallback to default scale
                this.mesh.scale.set(1, 1, 1);
              }
            }
          } catch (e) {
            console.warn("Error setting scale:", e);
            // Try to set a default scale
            try {
              this.mesh.scale.set(1, 1, 1);
            } catch (e2) {
              console.error("Failed to set even default scale:", e2);
            }
          }
          
          // Apply emissive effect with safety checks
          try {
            if (this.mesh.material && this.mesh.material.emissive) {
              if (this.inCluster && this.clusterId) {
                // Organism is in a cluster - apply cluster glow
                const clusterColorHex = CONFIG.wordSettings.clusterGlowColor || 0xFFFF00;
                this.mesh.material.emissive.setHex(clusterColorHex);
                this.mesh.material.emissiveIntensity = this.clusterGlowIntensity;

                // Optional: Subtle size pulsing for clustered organisms
                const breathFactor = 1 + sin(frameCount * CONFIG.wordSettings.clusterBreathingRate + this.id) * 0.05;
                // Apply breathFactor based on current scale to avoid issues if scale is non-uniform or animated elsewhere
                let baseScale = this.mesh.scale.x; // Assuming uniform scale or using x as reference
                // This direct multiplication might be an issue if this.mesh.scale is already being animated by script-specific logic.
                // For KISS, we'll keep it simple but be aware of potential conflict.
                // A safer way might be to store an original scale and apply breathFactor to that.
                // this.mesh.scale.set(baseScale * breathFactor, baseScale * breathFactor, baseScale * breathFactor);
                // Simpler: this.mesh.scale.multiplyScalar(breathFactor); // if baseScale is always 1 or relative pulsing is OK

              } else if (this.clusterGlowIntensity < 0.01) {
                // Organism is NOT in a cluster, AND any previous cluster glow has faded out.
                // Now, apply regular script-specific emissive effects or reset.
                let regularEmissiveSet = false;
                if (frameCount % 3 === 0) { // Keep frameCount modulation
                  switch (this.scriptCategory) {
                    case "arabic":
                    case "indic":
                      const pulseValue = (sin(frameCount * 0.05 + this.id) * 0.1) + 0.15;
                      if (isFinite(pulseValue)) {
                        // For simplicity, let these scripts glow with their default material color or a predefined bright emissive
                        // this.mesh.material.emissive.copy(this.mesh.material.color); // Example: glow with base color
                        // Or use a specific color for these scripts' pulse if defined
                        this.mesh.material.emissiveIntensity = pulseValue;
                        regularEmissiveSet = true;
                      }
                      break;
                    // Add other script-specific emissive cases here if needed
                  }
                }

                if (!regularEmissiveSet) {
                  // If no specific script emissive was set, reset to black
                  this.mesh.material.emissive.setRGB(0, 0, 0);
                  this.mesh.material.emissiveIntensity = 0;
                }
              } 
              // If this.clusterGlowIntensity >= 0.01 and not inCluster, it means the glow is still fading out.
              // In this case, we do nothing, allowing the lerp in update() to continue fading it.
            }
          } catch (e) {
            console.warn("Error setting emissive properties:", e);
          }
        } catch (e) {
          console.error("Error in mesh properties update:", e);
          // Try to recreate the mesh if serious issues occur
          try {
            if (threeScene && this.mesh) {
              threeScene.remove(this.mesh);
              this.mesh = null;
              this.createVisualRepresentation();
            }
          } catch (e2) {
            console.error("Failed to recreate mesh:", e2);
          }
        }
      } else {
        // If no mesh exists, try to create it
        this.createVisualRepresentation();
      }

      // Calculate trail with safety checks
      try {
        // Calculate color and alpha for the trail (p5.js context)
        let trailColorRGB_p5;
        
        // Use same coloring logic as for the 3D objects to be consistent
        if (highlightedScriptCategory === "all_white") {
          // In all-white mode, everything is white
          trailColorRGB_p5 = WHITE_COLOR_RGB;
        } 
        else {
          // We're in a specific language highlight mode
          if (this.scriptCategory === highlightedScriptCategory) {
            // This is the specifically highlighted script category
            trailColorRGB_p5 = SCRIPT_HIGHLIGHT_COLORS[this.scriptCategory] || WHITE_COLOR_RGB;
          } 
          else {
            // All other script categories should be white when a specific one is highlighted
            trailColorRGB_p5 = WHITE_COLOR_RGB;
          }
        }
        
        // Ensure trail color array is valid
        if (!Array.isArray(trailColorRGB_p5) || trailColorRGB_p5.length < 3) {
          trailColorRGB_p5 = [255, 255, 255]; // White fallback
        }

        let trailAlpha_p5 = 200 * this.dna.opacity; // p5 alpha is 0-255

        if (this.age < 30) {
          trailAlpha_p5 = map(this.age, 0, 30, 0, trailAlpha_p5);
        }
        if (this.age > this.dna.lifespan * 0.85) {
          trailAlpha_p5 = map(
            this.age,
            this.dna.lifespan * 0.85,
            this.dna.lifespan,
            trailAlpha_p5,
            0
          );
        }
        
        // Ensure alpha is valid
        if (!isFinite(trailAlpha_p5)) {
          trailAlpha_p5 = 100; // Default alpha
        }

        let trailStyle = "default";
        switch(this.scriptCategory) {
          case "greek": trailStyle = "classical"; break;
          case "arabic": case "hebrew": trailStyle = "flowing"; break;
          case "eastAsian": trailStyle = "structured"; break;
          case "indic": case "southeastAsian": trailStyle = "ornate"; break;
        }

        if (this.trail.length > 2) {
          push(); 
          noFill();
          if (trailStyle === "flowing") {
            stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.4);
            strokeWeight(1.2);
            curveTightness(0.5);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
              curveVertex(this.trail[i].x, this.trail[i].y, this.trail[i].z);
            }
            endShape();
          } else if (trailStyle === "structured") {
            stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.3);
            strokeWeight(1);
            beginShape(LINES);
            for (let i = 1; i < this.trail.length; i++) {
              vertex(this.trail[i-1].x, this.trail[i-1].y, this.trail[i-1].z);
              vertex(this.trail[i].x, this.trail[i].y, this.trail[i].z);
            }
            endShape();
          } else if (trailStyle === "ornate") {
            stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.35);
            strokeWeight(0.9);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
              vertex(this.trail[i].x, this.trail[i].y, this.trail[i].z);
            }
            endShape();
            if (frameCount % 3 === 0 && this.trail.length > 3) {
              for (let i = 2; i < this.trail.length-1; i += 3) {
                push();
                translate(this.trail[i].x, this.trail[i].y, this.trail[i].z);
                rotateX(frameCount * 0.01);
                rotateY(frameCount * 0.02);
                stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.2);
                noFill();
                circle(0, 0, 3);
                pop();
              }
            }
          } else if (trailStyle === "classical") {
            stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.3);
            strokeWeight(1);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
              vertex(this.trail[i].x, this.trail[i].y, this.trail[i].z);
            }
            endShape();
          } else {
            stroke(trailColorRGB_p5[0], trailColorRGB_p5[1], trailColorRGB_p5[2], trailAlpha_p5 * 0.25);
            strokeWeight(0.8);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
              vertex(this.trail[i].x, this.trail[i].y, this.trail[i].z);
            }
            endShape();
          }
          pop(); 
        }
      } catch (e) {
        console.warn("Error rendering trail:", e);
      }
    } catch (e) {
      console.error("Critical error in display method:", e);
    }
  }

  // Add the rest of the organism methods
  // ...

  // Method to check 3D boundaries
  checkEdges() {
    // Bounce off x edges
    if (this.pos.x > width / 2 || this.pos.x < -width / 2) {
      this.vel.x *= -0.8;
      this.pos.x = constrain(this.pos.x, -width / 2, width / 2);
    }

    // Bounce off y edges
    if (this.pos.y > height / 2 || this.pos.y < -height / 2) {
      this.vel.y *= -0.8;
      this.pos.y = constrain(this.pos.y, -height / 2, height / 2);
    }

    // Bounce off z edges (depth)
    if (
      this.pos.z > CONFIG.depthRange.max ||
      this.pos.z < CONFIG.depthRange.min
    ) {
      this.vel.z *= -0.8;
      this.pos.z = constrain(
        this.pos.z,
        CONFIG.depthRange.min,
        CONFIG.depthRange.max
      );
    }
  }

  // Apply a force to the organism
  applyForce(force) {
    // F = ma, so divide by mass
    let f = p5.Vector.div(force, this.dna.mass);
    this.acc.add(f);
  }

  // Check if organism has died
  isDead() {
    return this.age > this.dna.lifespan || this.energy <= 0;
  }

  // React to external stimulus (like mouse)
  react(mx, my) {
    // Calculate distance to stimulus in 2D (x, y)
    let d = dist(this.pos.x, this.pos.y, mx, my);

    // If within reaction distance
    if (d < 150) {
      // Vector pointing away from stimulus
      let away = createVector(this.pos.x - mx, this.pos.y - my, 0);
      away.normalize();
      away.mult(0.5); // Reaction strength

      // Apply force
      this.applyForce(away);

      // Change state in response
      if (random() < 0.2) {
        this.state = "exploring";
        this.stateCounter = 0;
      }
    }
  }

  // Make sound based on organism properties
  playSound() {
    if (!audioEnabled) return;

    try {
      // Calculate pitch based on size and energy
      let sizeVal = map(
        this.dna.size,
        CONFIG.baseSize.min,
        CONFIG.baseSize.max,
        200,
        100
      );
      let freq = sizeVal + this.energy * 0.5;

      // Calculate pan based on x position (3D stereo effect)
      let pan = map(this.pos.x, -width / 2, width / 2, -1, 1);

      // Play sound
      playSound(freq, pan);
    } catch (e) {
      console.warn("Error playing sound:", e);
    }
  }

  // Mutate organism properties for evolution
  mutate() {
    // Only mutate if random() < mutation rate
    if (random() < this.dna.mutationRate) {
      // Choose a property to mutate
      let choices = [
        "size",
        "speed",
        "colorIndex",
        "type",
        "opacity",
        "attraction",
      ];
      let prop = random(choices);

      // Apply mutation
      switch (prop) {
        case "size":
          this.dna.size = constrain(
            this.dna.size + random(-5, 5),
            CONFIG.baseSize.min,
            CONFIG.baseSize.max
          );
          break;
        case "speed":
          this.dna.speed = constrain(
            this.dna.speed + random(-0.3, 0.3),
            CONFIG.baseSpeed.min,
            CONFIG.baseSpeed.max
          );
          break;
        case "colorIndex":
          this.dna.colorIndex = floor(random(selectedPalette.length));
          break;
        case "type":
          // For type mutation, try to pick a character from the same script
          const currentScript = this.scriptCategory;
          
          // 30% chance to completely change script
          if (random() < 0.3) {
            this.dna.type = random(CONFIG.types);
            this.textType = this.dna.type;
            this.scriptCategory = this.getScriptCategory(this.textType);
            
            // Recreate visual with new character
            if (this.mesh) {
              this.removeMesh();
            }
            this.createVisualRepresentation();
          } else {
            // 70% chance to stay within same script family
            const sameScriptChars = CONFIG.types.filter(char => 
              this.getScriptCategory(char) === currentScript
            );
            
            if (sameScriptChars.length > 0) {
              this.dna.type = random(sameScriptChars);
              this.textType = this.dna.type;
              
              // Recreate visual with new character
              if (this.mesh) {
                this.removeMesh();
              }
              this.createVisualRepresentation();
            }
          }
          break;
        case "opacity":
          this.dna.opacity = constrain(
            this.dna.opacity + random(-0.1, 0.1),
            0.5,
            1
          );
          break;
        case "attraction":
          this.dna.attraction = !this.dna.attraction;
          break;
        case "rotationSpeed": // 3D specific mutation
          this.dna.rotationSpeed = constrain(
            this.dna.rotationSpeed + random(-0.01, 0.01),
            -0.03,
            0.03
          );
          break;
        case "depthPreference": // 3D specific mutation
          this.dna.depthPreference = constrain(
            this.dna.depthPreference + random(-0.5, 0.5),
            -1,
            1
          );
          break;
      }

      // 3D specific mutations - additional chance to mutate 3D properties
      if (random() < 0.3) {
        if (random() < 0.5) {
          this.dna.rotationSpeed = constrain(
            this.dna.rotationSpeed + random(-0.01, 0.01),
            -0.03,
            0.03
          );
        } else {
          this.dna.depthPreference = constrain(
            this.dna.depthPreference + random(-0.5, 0.5),
            -1,
            1
          );
        }
      }
    }
  }

  // Inherit traits from parent organism
  inheritFrom(parent) {
    // Copy most DNA from parent with small variations
    this.dna.size = constrain(
      parent.dna.size + random(-2, 2),
      CONFIG.baseSize.min,
      CONFIG.baseSize.max
    );

    this.dna.speed = constrain(
      parent.dna.speed + random(-0.1, 0.1),
      CONFIG.baseSpeed.min,
      CONFIG.baseSpeed.max
    );

    this.dna.mass = constrain(
      parent.dna.mass + random(-0.5, 0.5),
      CONFIG.baseMass.min,
      CONFIG.baseMass.max
    );

    // Visual traits
    this.dna.colorIndex = parent.dna.colorIndex; // Inherit color
    if (random() < 0.1)
      this.dna.colorIndex = floor(random(selectedPalette.length)); // Small chance to change

    // Handle text character inheritance
    if (random() < 0.8) {
      // 80% chance to inherit parent's character
      this.dna.type = parent.dna.type;
      this.textType = parent.dna.type;
    } else {
      // 20% chance to mutate, but try to preserve script family
      const parentScript = this.getScriptCategory(parent.dna.type);
      
      // Find all characters from the same script
      const sameScriptChars = CONFIG.types.filter(char => 
        this.getScriptCategory(char) === parentScript
      );
      
      // If we found characters in the same script, choose one
      if (sameScriptChars.length > 0) {
        this.dna.type = random(sameScriptChars);
      } else {
        // Otherwise just pick a random character
        this.dna.type = random(CONFIG.types);
      }
      
      this.textType = this.dna.type;
    }
    
    // Update script category
    this.scriptCategory = this.getScriptCategory(this.textType);
    
    // If the mesh already exists, remove it and create a new one
    if (this.mesh) {
      this.removeMesh();
    }
    
    // Create new visual representation
    this.createVisualRepresentation();

    this.dna.opacity = constrain(
      parent.dna.opacity + random(-0.05, 0.05),
      0.5,
      1
    );

    // Behavioral traits
    this.dna.attraction = parent.dna.attraction;
    if (random() < 0.1) this.dna.attraction = !parent.dna.attraction; // Small chance to flip

    this.dna.socialFactor = constrain(
      parent.dna.socialFactor + random(-0.1, 0.1),
      0.1,
      1
    );
    this.dna.explorationFactor = constrain(
      parent.dna.explorationFactor + random(-0.1, 0.1),
      0.1,
      1
    );

    // 3D specific traits
    this.dna.depthPreference = constrain(
      parent.dna.depthPreference + random(-0.2, 0.2),
      -1,
      1
    );

    this.dna.rotationSpeed = constrain(
      parent.dna.rotationSpeed + random(-0.005, 0.005),
      -0.03,
      0.03
    );

    // Advanced traits
    this.dna.specialization = parent.dna.specialization;
    if (random() < 0.05) {
      this.dna.specialization = random([
        "gatherer",
        "explorer",
        "defender",
        "communicator",
      ]);
    }

    this.dna.adaptability = constrain(
      parent.dna.adaptability + random(-0.05, 0.05),
      0.1,
      1
    );
    this.dna.energyEfficiency = constrain(
      parent.dna.energyEfficiency + random(-0.05, 0.05),
      0.3,
      1
    );
    this.dna.mutationRate = constrain(
      parent.dna.mutationRate + random(-0.01, 0.01),
      0.01,
      0.2
    );

    this.dna.lifespan = constrain(
      parent.dna.lifespan + random(-50, 50),
      CONFIG.baseLifespan.min,
      CONFIG.baseLifespan.max
    );

    this.dna.signalStrength = constrain(
      parent.dna.signalStrength + random(-0.1, 0.1),
      0.1,
      1
    );

    // Apply random mutation
    if (random() < this.dna.mutationRate * 2) {
      this.mutate();
    }
  }

  // When organism dies, remove mesh from scene
  removeMesh() {
    try {
      if (this.mesh) {
        if (threeScene) {
          threeScene.remove(this.mesh);
        }
        
        // Safely dispose of geometry
        if (this.mesh.geometry && typeof this.mesh.geometry.dispose === 'function') {
          this.mesh.geometry.dispose();
        }
        
        // Safely dispose of material (handle both single and array materials)
        if (this.mesh.material) {
          if (Array.isArray(this.mesh.material)) {
            this.mesh.material.forEach(mat => {
              if (mat && typeof mat.dispose === 'function') {
                mat.dispose();
              }
            });
          } else if (typeof this.mesh.material.dispose === 'function') {
            this.mesh.material.dispose();
          }
        }
        
        this.mesh = null;
      }
    } catch (e) {
      console.error("Error in removeMesh:", e);
      // Ensure mesh reference is cleared even if disposal fails
      this.mesh = null;
    }
  }
} // Correctly closing the Organism class here

function draw() {
  // Clear and set background first
  setGradientBackground();

  // Update and draw Focus/Resonance tool visuals if active
  if (focusResonanceActive) {
    // Update position continuously if active (might be redundant if only updated on drag, but good for key-based activation later)
    // For now, position is updated in mousePressed/mouseDragged
  }
  drawFocusResonanceVisual(); // Draw the visual if active
  
  // Display any confirmed words (with error handling)
  try {
    displayConfirmedWords();
  } catch (error) {
    console.warn("Error displaying confirmed words:", error);
  }

  // Camera position for both p5.js and Three.js
  let finalEyeX, finalEyeY, finalEyeZ;
  const centerX = 0;
  const centerY = 0;
  const centerZ = 0;

  // Calculate camera position using spherical coordinates
  // cameraRotation.x is the elevation angle (pitch)
  // cameraRotation.y is the azimuth angle (yaw)
  // cameraZoom is the distance from the origin (0,0,0)
  finalEyeY = cameraZoom * sin(cameraRotation.x); // Using p5.js sin/cos
  const radiusOnXZPlane = cameraZoom * cos(cameraRotation.x);
  finalEyeX = radiusOnXZPlane * sin(cameraRotation.y);
  finalEyeZ = radiusOnXZPlane * cos(cameraRotation.y);

  // Update p5.js camera (for p5-drawn elements like trails, environment grid)
  camera(finalEyeX, finalEyeY, finalEyeZ, centerX, centerY, centerZ, 0, 1, 0);

  // Update Three.js camera (for Three.js meshes)
  threeCamera.position.set(finalEyeX, finalEyeY, finalEyeZ);
  threeCamera.lookAt(new THREE.Vector3(centerX, centerY, centerZ)); // Look at the scene origin

  // Process camera for exhibition mode if enabled
  if (cameraInteraction.enabled) {
    processCamera();

    // Show camera debug view if enabled
    if (cameraInteraction.debugView) {
      displayCameraDebug();
    }
  }

  // Update and display the ecosystem
  ecosystem.display();

  // Update the organisms
  updateOrganisms();

  // Draw connections between organisms
  drawConnections();

  // Draw 3D environment elements
  drawEnvironment();

  // Apply post-processing effects
  if (CONFIG.postFx) {
    applyPostProcessing();
  }

  // Update statistics display
  if (frameCount % 30 === 0) {
    updateStats();
  }

  // Render the Three.js scene
  try {
    // Check if all required components are ready for rendering
    if (threeRenderer && threeScene && threeCamera) {
      threeRenderer.resetState(); // Reset WebGL state before Three.js renders
      threeRenderer.render(threeScene, threeCamera);
    } else {
      console.warn("THREE.js renderer, scene or camera not ready for rendering");
    }
  } catch (e) {
    console.error("Error rendering THREE.js scene:", e);
  }

  // Call drawFocusResonanceVisual LAST to try and avoid being overwritten
  // and ensure p5.js context is active for it.
  if (focusResonanceActive) {
      drawFocusResonanceVisual(); // Draw the visual if active
  }

  // After all existing objects are drawn, add our letter flow visualization
  drawLetterFlow();
}

// Draw 3D environment elements
function drawEnvironment() {
  push();
  noFill();
  stroke(
    selectedPalette[1][0],
    selectedPalette[1][1],
    selectedPalette[1][2],
    40
  );
  strokeWeight(0.5);

  // Draw a grid on the "floor" (bottom of the world)
  let gridSize = 80;
  let gridExtent = 1000;

  // Horizontal grid lines
  for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
    beginShape();
    vertex(x, -gridExtent, CONFIG.depthRange.min);
    vertex(x, gridExtent, CONFIG.depthRange.min);
    endShape();
  }

  // Vertical grid lines
  for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
    beginShape();
    vertex(-gridExtent, y, CONFIG.depthRange.min);
    vertex(gridExtent, y, CONFIG.depthRange.min);
    endShape();
  }

  // Draw depth markers
  let depthStep = 100;
  for (
    let z = CONFIG.depthRange.min;
    z <= CONFIG.depthRange.max;
    z += depthStep
  ) {
    push();
    translate(0, 0, z);
    stroke(
      selectedPalette[1][0],
      selectedPalette[1][1],
      selectedPalette[1][2],
      map(z, CONFIG.depthRange.min, CONFIG.depthRange.max, 30, 10)
    );

    // Draw a subtle plane at each depth level
    if (frameCount % 2 === 0) {
      // Only render every other frame for performance
      beginShape(LINES);
      for (let i = 0; i < 10; i++) {
        let x1 = random(-width / 2, width / 2);
        let y1 = random(-height / 2, height / 2);
        let x2 = x1 + random(-100, 100);
        let y2 = y1 + random(-100, 100);
        vertex(x1, y1, 0);
        vertex(x2, y2, 0);
      }
      endShape();
    }
    pop();
  }

  // Add some depth markers/axis indicators
  stroke(
    selectedPalette[3][0],
    selectedPalette[3][1],
    selectedPalette[3][2],
    120
  );
  strokeWeight(2);

  // Z-axis indicator is removed to create a cleaner visual space

  // Removing elliptical markers as well for a cleaner composition

  pop();
}

// Modified gradient background for 3D (simpler version)
function setGradientBackground() {
  // Clear the background first
  clear();

  // Set basic ambient lighting
  ambientLight(
    CONFIG.ambientLightLevel,
    CONFIG.ambientLightLevel,
    CONFIG.ambientLightLevel
  );

  // Add gradient background using a background plane
  // We'll draw a large plane at the back of our scene with a gradient shader
  push();
  noStroke();

  // Move far back in the Z dimension
  translate(0, 0, CONFIG.depthRange.min - 500);

  // Create gradient plane large enough to cover viewport
  let planeWidth = width * 2;
  let planeHeight = height * 2;

  // Create gradient colors from the palette
  let bgColor = selectedPalette[0];
  let accentColor = selectedPalette[1];

  // Draw using custom shader or use a simplified version
  if (drawingContext.createLinearGradient) {
    // WebGL context - use standard gradient
    let grd = drawingContext.createLinearGradient(
      -planeWidth / 2,
      -planeHeight / 2,
      planeWidth / 2,
      planeHeight / 2
    );

    grd.addColorStop(0, `rgba(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]}, 1)`);
    grd.addColorStop(
      1,
      `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, 0.4)`
    );

    drawingContext.fillStyle = grd;
    plane(planeWidth, planeHeight);
  } else {
    // Fallback with solid color
    fill(bgColor[0], bgColor[1], bgColor[2]);
    plane(planeWidth, planeHeight);
  }

  pop();

  // Update dynamic point lights
  for (let i = 0; i < lights.length; i++) {
    let light = lights[i];

    // Animate light position with some subtle motion
    light.x += sin(frameCount * 0.01 + i) * 0.5;
    light.y += cos(frameCount * 0.008 + i * 2) * 0.3;
    light.z += sin(frameCount * 0.005 + i * 0.5) * 0.2;

    // Add some randomness occasionally
    if (frameCount % 60 === 0) {
      light.x += random(-3, 3);
      light.y += random(-3, 3);
      light.z += random(-3, 3);
    }

    // Keep within bounds
    light.x = constrain(light.x, -width / 2, width / 2);
    light.y = constrain(light.y, -height / 2, height / 2);
    light.z = constrain(light.z, CONFIG.depthRange.min, CONFIG.depthRange.max);

    // Apply point light
    let c = light.color;
    pointLight(
      c[0],
      c[1],
      c[2],
      light.x,
      light.y,
      light.z,
      CONFIG.pointLightIntensity
    );
  }

  // Fade-in effect during startup
  if (fadeInAlpha < 255) {
    fadeInAlpha += 3;

    push();
    noStroke();
    fill(0, 255 - fadeInAlpha);
    translate(0, 0, 1000); // In front of everything
    plane(width, height);
    pop();
  }
}

// Add mouse drag for camera control
function mouseDragged() {
  // If Focus/Resonance tool is active (right mouse button held), update its position
  if (mouseButton === RIGHT && focusResonanceActive) { // Check for RIGHT button specifically
    if (!isMouseOverUI()) { // Only update if not over UI
      // Use proper 3D position instead of Z=0 plane
      focusResonancePosition = mousePositionTo3D();
      
      // NEW: Handle letter attraction for word formation when right-clicking
      handleRightClickWordAttraction();
    }
    return false; // Prevent other default actions for right-drag
  }
  // Else, if LEFT mouse button is dragged and not over UI, handle camera rotation
  else if (mouseButton === LEFT && !isMouseOverUI()) {
    // Calculate rotation amount based on mouse movement
    let rotateAmountX = (mouseY - pmouseY) * 0.01;
    let rotateAmountY = (mouseX - pmouseX) * 0.01;

    // Update camera rotation, applying some constraints to prevent awkward angles
    cameraRotation.x = constrain(
      cameraRotation.x + rotateAmountX,
      -PI / 2 + 0.1,
      PI / 2 - 0.1
    );
    cameraRotation.y += rotateAmountY;
    
    // Update window object for testing
    window.cameraRotation = cameraRotation;

    return false; // Prevent default behavior to avoid page scrolling while rotating
  }
}

// NEW: Handle attraction between letters when right-clicking
function handleRightClickWordAttraction() {
  if (!focusResonancePosition) return;
  
  // Use the current focus position as the center of attraction
  const attractionCenter = focusResonancePosition;
  
  // Find all organisms near the focus point
  const nearbyOrganisms = organisms.filter(org => {
    // Calculate 3D distance from organism to focus point
    const distance = p5.Vector.dist(org.pos, attractionCenter);
    return distance < focusResonanceRadius;
  });
  
  // Early exit if not enough organisms to potentially form a word
  if (nearbyOrganisms.length < 2) return;
  
  // Filter organisms based on the currently highlighted script category
  const filteredOrganisms = nearbyOrganisms.filter(org => {
    if (highlightedScriptCategory === "all_white") return true; // All organisms if no specific script highlighted
    return org.scriptCategory === highlightedScriptCategory; // Only organisms of the highlighted script
  });
  
  // Apply attraction forces to filtered organisms
  filteredOrganisms.forEach(org => {
    // Vector pointing from organism to attraction center (now in true 3D)
    const attractionForce = p5.Vector.sub(attractionCenter, org.pos);
    
    // Scale force based on 3D distance (closer = less force to prevent overshooting)
    const distance = attractionForce.mag();
    // Adjust max force based on depth difference to make 3D movement more natural
    const depthDifference = Math.abs(attractionCenter.z - org.pos.z);
    const maxForce = map(depthDifference, 0, 100, 0.5, 0.3); // Reduce force for organisms far in depth
    
    // Apply force only if organism is not too close to center
    if (distance > 5) {
      attractionForce.normalize();
      attractionForce.mult(maxForce);
      org.applyForce(attractionForce);
      
      // Set organism state to indicate attraction
      org.state = "attracted";
    }
    
    // If organisms are very close together, immediately check for word formation
    if (filteredOrganisms.length >= 2 && frameCount % 10 === 0) {
      checkForImmediateWordFormation(filteredOrganisms);
    }
  });
}

// NEW: Check if the currently attracted organisms form a valid word
function checkForImmediateWordFormation(attractedOrganisms) {
  // Skip if too few organisms
  if (attractedOrganisms.length < 2) return;
  
  // Get current time for API cooldown checks
  const currentTime = millis();
  
  // Sort organisms by X position for left-to-right reading
  const sortedOrganisms = [...attractedOrganisms].sort((a, b) => a.pos.x - b.pos.x);
  
  // Create a unique identifier and string for this potential word
  const clusterIds = sortedOrganisms.map(org => org.id).sort().join(',');
  const wordString = sortedOrganisms.map(org => org.textType).join('');
  
  // Check if this is already a confirmed word
  if (confirmedWords.some(word => word.id === clusterIds)) {
    return; // Already confirmed, no need to check again
  }
  
  // If we already have a potential word, update its timestamp to keep it alive
  if (potentialClusters.has(clusterIds)) {
    const existingCluster = potentialClusters.get(clusterIds);
    
    // If it's been stable long enough, validate it
    if (currentTime - existingCluster.startTime >= CONFIG.wordSettings.clusterStabilityTime) {
      // This cluster has been stable long enough - check if it's a valid word
      checkWordValidity(clusterIds, wordString, sortedOrganisms, currentTime, true);
    }
  } else {
    // New potential word discovered through right-click attraction
    potentialClusters.set(clusterIds, {
      organisms: sortedOrganisms,
      startTime: currentTime,
      string: wordString
    });
    
    // Provide immediate feedback that letters are forming a potential word
    sortedOrganisms.forEach(org => {
      // Visual effect to show these organisms are part of a potential word
      if (org.mesh) {
        // Scale up slightly
        org.mesh.scale.set(1.2, 1.2, 1.2);
        
        // Highlight color (temporary effect)
        if (org.material && org.material.color) {
          // Store original color if not already stored
          if (!org._originalColor) {
            org._originalColor = {
              r: org.material.color.r,
              g: org.material.color.g,
              b: org.material.color.b
            };
          }
          
          // Change to highlight color
          const highlightColor = new THREE.Color(1.0, 0.8, 0.2); // Yellowish glow
          org.material.color.lerp(highlightColor, 0.3);
          
          // Schedule restoration of original color
          setTimeout(() => {
            if (org.material && org.material.color && org._originalColor) {
              org.material.color.setRGB(
                org._originalColor.r,
                org._originalColor.g,
                org._originalColor.b
              );
            }
          }, 300);
        }
      }
    });
  }
}

// Handle mouse release to deactivate the Focus/Resonance tool
function mouseReleased() {
  try {
    // If RIGHT mouse button was released, deactivate Focus/Resonance tool
    if (mouseButton === RIGHT) {
      focusResonanceActive = false;
      focusResonancePosition = null;
      return false; // Prevent default browser behavior
    }
    return true; // Allow default browser behavior for other mouse buttons
  } catch (error) {
    console.warn("Error in mouseReleased:", error);
    // Safety cleanup
    focusResonanceActive = false;
    focusResonancePosition = null;
    return true;
  }
}

// Add mouse wheel for zoom
function mouseWheel(event) {
  // Only zoom if we're not over UI elements
  if (!isMouseOverUI()) {
    // Zoom in or out based on wheel direction
    window.zoomCamera(event.delta * 0.5);
    
    // Prevent default behavior to avoid page scrolling while zooming
    return false;
  }
}

// Draw connections between organisms in 3D space
function drawConnections() {
  // Pre-calculate distance-based relationships
  let connections = [];

  // Each organism checks others for connections
  for (let i = 0; i < organisms.length; i++) {
    let org1 = organisms[i];

    // We'll use a spatial hash approach for better performance in 3D
    let nearby = getNeighbors(
      org1.pos.x,
      org1.pos.y,
      org1.pos.z,
      CONFIG.cohesionDistance
    );

    for (let j = 0; j < nearby.length; j++) {
      let org2 = nearby[j];

      // Don't connect to self
      if (org1 === org2) continue;

      // Calculate actual 3D distance
      let d = p5.Vector.dist(org1.pos, org2.pos);

      // Only connect if within cohesion distance
      if (d < CONFIG.cohesionDistance) {
        // Calculate thickness based on distance and mass
        let thickness = map(d, 0, CONFIG.cohesionDistance, 2, 0.1);

        // Calculate alpha based on distance
        let alpha = map(d, 0, CONFIG.cohesionDistance, 120, 10);

        // Adjust for depth - connections in foreground should be more visible
        let depthFactor = map(
          (org1.pos.z + org2.pos.z) / 2,
          CONFIG.depthRange.min,
          CONFIG.depthRange.max,
          1.2,
          0.7
        );

        alpha *= depthFactor;
        thickness *= depthFactor;

        // Different line styles based on organism types and states
        let lineStyle = "";

        // Communication type organisms have special connections
        if (
          org1.dna.specialization === "communicator" ||
          org2.dna.specialization === "communicator"
        ) {
          lineStyle = "dotted";
          alpha *= 1.5; // More visible
        }
        // Shared specialization creates stronger bonds
        else if (org1.dna.specialization === org2.dna.specialization) {
          lineStyle = "solid";
          thickness *= 1.2;
        }
        // Different states create different connection styles
        else if (org1.state === "grouping" && org2.state === "grouping") {
          lineStyle = "dashed";
        } else {
          lineStyle = "thin";
        }

        // Store all valid connections for rendering
        connections.push({
          org1: org1,
          org2: org2,
          thickness: thickness,
          alpha: alpha,
          style: lineStyle,
          distance: d,
        });

        // If they're interacting for the first time, record it
        if (!org1.interactionPartners.has(org2.id)) {
          org1.interactionPartners.add(org2.id);
          org2.interactionPartners.add(org1.id);

          org1.hasInteracted = true;
          org2.hasInteracted = true;

          // Count meaningful interactions
          metadata.interactionCount++;

          // Audio response to connection
          if (audioEnabled && random() < 0.1) {
            let panValue = map(org1.pos.x, -width / 2, width / 2, -1, 1);
            let noteSize = (org1.dna.size + org2.dna.size) / 2;
            playSound(noteSize, panValue);
          }

          // Exchange some energy between organisms
          let energyTransfer = random(5, 10);
          if (org1.energy > energyTransfer) {
            org1.energy -= energyTransfer;
            org2.energy += energyTransfer * 0.8; // Some loss in transfer
          }
        }
      }
    }
  }

  // Render all connections
  push();
  for (let i = 0; i < connections.length; i++) {
    let c = connections[i];

    // Get color based on organism type (blend the two colors)
    // let org1Color = selectedPalette[c.org1.dna.colorIndex]; // OLD
    // let org2Color = selectedPalette[c.org2.dna.colorIndex]; // OLD

    // NEW: Determine colors based on highlighted script category
    let color1_rgb, color2_rgb;

    if (highlightedScriptCategory === "all_white" || !c.org1.scriptCategory) {
      color1_rgb = WHITE_COLOR_RGB;
    } else if (c.org1.scriptCategory === highlightedScriptCategory) {
      color1_rgb = SCRIPT_HIGHLIGHT_COLORS[c.org1.scriptCategory] || WHITE_COLOR_RGB;
    } else {
      color1_rgb = WHITE_COLOR_RGB;
    }

    if (highlightedScriptCategory === "all_white" || !c.org2.scriptCategory) {
      color2_rgb = WHITE_COLOR_RGB;
    } else if (c.org2.scriptCategory === highlightedScriptCategory) {
      color2_rgb = SCRIPT_HIGHLIGHT_COLORS[c.org2.scriptCategory] || WHITE_COLOR_RGB;
    } else {
      color2_rgb = WHITE_COLOR_RGB;
    }
    // END NEW

    let r = (color1_rgb[0] + color2_rgb[0]) / 2;
    let g = (color1_rgb[1] + color2_rgb[1]) / 2;
    let b = (color1_rgb[2] + color2_rgb[2]) / 2;

    // Render based on style
    if (c.style === "dotted") {
      noFill();
      stroke(r, g, b, c.alpha);
      strokeWeight(c.thickness);
      drawDottedLine3D(
        c.org1.pos.x,
        c.org1.pos.y,
        c.org1.pos.z,
        c.org2.pos.x,
        c.org2.pos.y,
        c.org2.pos.z,
        c.thickness * 2,
        c.distance / 10,
        r,
        g,
        b,
        c.alpha
      );
    } else if (c.style === "dashed") {
      noFill();
      stroke(r, g, b, c.alpha);
      strokeWeight(c.thickness);
      drawDashedLine3D(
        c.org1.pos.x,
        c.org1.pos.y,
        c.org1.pos.z,
        c.org2.pos.x,
        c.org2.pos.y,
        c.org2.pos.z,
        c.distance / 8,
        c.distance / 15,
        r,
        g,
        b,
        c.alpha
      );
    } else {
      stroke(r, g, b, c.alpha);
      strokeWeight(c.thickness);
      line(
        c.org1.pos.x,
        c.org1.pos.y,
        c.org1.pos.z,
        c.org2.pos.x,
        c.org2.pos.y,
        c.org2.pos.z
      );
    }
  }
  pop();
}

// Helper for 3D dotted lines
function drawDottedLine3D(
  x1,
  y1,
  z1,
  x2,
  y2,
  z2,
  dotSize,
  spacing,
  r,
  g,
  b,
  a
) {
  // Calculate direction vector
  let dir = createVector(x2 - x1, y2 - y1, z2 - z1);
  let len = dir.mag();
  dir.normalize();

  // Draw dots along line
  push();
  noStroke();
  fill(r, g, b, a);

  let steps = floor(len / spacing);
  for (let i = 0; i <= steps; i++) {
    let pos = createVector(
      x1 + dir.x * i * spacing,
      y1 + dir.y * i * spacing,
      z1 + dir.z * i * spacing
    );

    push();
    translate(pos.x, pos.y, pos.z);
    sphere(dotSize);
    pop();
  }
  pop();
}

// Helper for 3D dashed lines
function drawDashedLine3D(
  x1,
  y1,
  z1,
  x2,
  y2,
  z2,
  dashLength,
  gapLength,
  r,
  g,
  b,
  a
) {
  // Calculate direction vector
  let dir = createVector(x2 - x1, y2 - y1, z2 - z1);
  let len = dir.mag();
  dir.normalize();

  // Calculate segments
  let totalLength = len;
  let segmentLength = dashLength + gapLength;
  let segmentCount = ceil(totalLength / segmentLength);

  // Draw segments
  stroke(r, g, b, a);
  beginShape(LINES);
  for (let i = 0; i < segmentCount; i++) {
    let startFraction = (i * segmentLength) / totalLength;
    let endFraction = min((i * segmentLength + dashLength) / totalLength, 1);

    if (startFraction >= 1) break;

    let x1Dash = x1 + dir.x * totalLength * startFraction;
    let y1Dash = y1 + dir.y * totalLength * startFraction;
    let z1Dash = z1 + dir.z * totalLength * startFraction;

    let x2Dash = x1 + dir.x * totalLength * endFraction;
    let y2Dash = y1 + dir.y * totalLength * endFraction;
    let z2Dash = z1 + dir.z * totalLength * endFraction;

    vertex(x1Dash, y1Dash, z1Dash);
    vertex(x2Dash, y2Dash, z2Dash);
  }
  endShape();
}

// Helper function to get nearby organisms efficiently using 3D spatial partitioning
function getNeighbors(x, y, z, radius) {
  let neighbors = [];

  // Convert to grid coordinates
  let col = floor((x + width / 2) / cellSize);
  let row = floor((y + height / 2) / cellSize);
  let depth = floor((z - CONFIG.depthRange.min) / cellSize);

  // Check bounds
  col = constrain(col, 0, cols - 1);
  row = constrain(row, 0, rows - 1);

  // Get depth cells
  let depthCells = ceil(
    (CONFIG.depthRange.max - CONFIG.depthRange.min) / cellSize
  );
  depth = constrain(depth, 0, depthCells - 1);

  // Calculate radius in grid cells
  let cellRadius = ceil(radius / cellSize);

  // Check all cells in radius
  for (let i = -cellRadius; i <= cellRadius; i++) {
    for (let j = -cellRadius; j <= cellRadius; j++) {
      for (let k = -cellRadius; k <= cellRadius; k++) {
        let ci = col + i;
        let rj = row + j;
        let dk = depth + k;

        // Skip if out of bounds
        if (
          ci < 0 ||
          ci >= cols ||
          rj < 0 ||
          rj >= rows ||
          dk < 0 ||
          dk >= depthCells
        ) {
          continue;
        }

        // Get cell index
        let cellIndex = dk * cols * rows + rj * cols + ci;

        // Add all organisms in this cell
        for (let org of grid[cellIndex]) {
          neighbors.push(org);
        }
      }
    }
  }

  return neighbors;
}

// 3D Ecosystem class
class Ecosystem {
  constructor() {
    this.organisms = [];
    // You can add more properties for field lines, events, etc.
  }

  // Add an organism to the ecosystem
  addOrganism(org) {
    this.organisms.push(org);
  }

  // Display or update all organisms (expand as needed)
  display() {
    for (let org of this.organisms) {
      if (org.display) org.display();
    }
  }

  // Evolve or update the ecosystem (expand as needed)
  evolve() {
    // Placeholder for evolutionary logic
  }

  // Add a stub for generateFieldLines
  generateFieldLines() {
    // Stub for compatibility
  }
}

// Functions for external camera controls
window.resetCamera = function () {
  cameraRotation.x = 0;
  cameraRotation.y = 0;
  cameraZoom = CONFIG.defaultCameraZoom;
  console.log("Camera reset to default position");
};

window.zoomCamera = function (amount) {
  cameraZoom = constrain(cameraZoom + amount, CONFIG.minCameraZoom, CONFIG.maxCameraZoom);
  // Update the window object for testing
  window.cameraZoom = cameraZoom;
};

// Create initial organisms for the 3D environment
function initializeOrganisms() {
  // Start with a small set of organisms
  let initialCount = 25;

  // Distribute organisms throughout 3D space
  for (let i = 0; i < initialCount; i++) {
    // Create organisms with artistic positioning
    let x = random(-width / 2, width / 2); // Keep them more centered
    let y = random(-height / 2, height / 2);
    let z = random(CONFIG.depthRange.min, CONFIG.depthRange.max);

    let organism = createOrganism(x, y);
    organism.pos.z = z; // Set initial z position

    // Add some initial genetic diversity
    if (random() < 0.3) {
      organism.mutate();
    }
  }

  console.log(`Created ${organisms.length} initial organisms in 3D space`);
}

// Create a new organism
function createOrganism(x, y, isMutation = false) {
  if (organisms.length >= CONFIG.maxOrganisms) {
    // Find oldest organism to replace
    let oldestIndex = 0;
    let oldestAge = 0;

    for (let i = 0; i < organisms.length; i++) {
      if (organisms[i].age > oldestAge) {
        oldestAge = organisms[i].age;
        oldestIndex = i;
      }
    }

    // Remove oldest
    organisms.splice(oldestIndex, 1);
  }

  let organism = new Organism(x, y);
  organisms.push(organism);
  metadata.totalCreated++;

  return organism;
}

// Update organisms for 3D space
function updateOrganisms() {
  // Clear spatial partitioning grid
  for (let i = 0; i < grid.length; i++) {
    grid[i] = [];
  }

  // Calculate z-depth cells
  const depthCells = ceil(
    (CONFIG.depthRange.max - CONFIG.depthRange.min) / cellSize
  );

  // Add organisms to grid for spatial partitioning
  for (let i = 0; i < organisms.length; i++) {
    let organism = organisms[i];

    // Convert to grid coordinates
    let col = floor((organism.pos.x + width / 2) / cellSize);
    let row = floor((organism.pos.y + height / 2) / cellSize);
    let depth = floor((organism.pos.z - CONFIG.depthRange.min) / cellSize);

    // Check bounds
    col = constrain(col, 0, cols - 1);
    row = constrain(row, 0, rows - 1);
    depth = constrain(depth, 0, depthCells - 1);

    // Get cell index (3D grid)
    let cellIndex = depth * cols * rows + row * cols + col;

    // Add to grid
    if (cellIndex >= 0 && cellIndex < grid.length) {
      grid[cellIndex].push(organism);
    }
  }

  // Update all organisms
  for (let i = organisms.length - 1; i >= 0; i--) {
    let organism = organisms[i];

    // Get cell index for local density calculation
    let col = floor((organism.pos.x + width / 2) / cellSize);
    let row = floor((organism.pos.y + height / 2) / cellSize);
    let depth = floor((organism.pos.z - CONFIG.depthRange.min) / cellSize);

    // Check bounds
    col = constrain(col, 0, cols - 1);
    row = constrain(row, 0, rows - 1);
    depth = constrain(depth, 0, depthCells - 1);

    // Get local density (counts neighbors in same cell)
    let cellIndex = depth * cols * rows + row * cols + col;
    let localDensity =
      cellIndex >= 0 && cellIndex < grid.length ? grid[cellIndex].length : 0;

    // Apply flocking behaviors in 3D
    applyFlockingBehaviors(organism);

    // Update organism state
    organism.update(localDensity);

    // Check if organism should die
    if (organism.isDead()) {
      organism.removeMesh();
      organisms.splice(i, 1);
      continue;
    }

    // React to mouse or camera position
    if (mouseIsPressed) {
      // Calculate mouse position in 3D space
      // This is a simplification - accurate 3D picking would require raycasting
      let mouseVector = createVector(
        mouseX - width / 2,
        mouseY - height / 2,
        0
      );
      organism.react(mouseVector.x, mouseVector.y);
    }

    // Display the organism
    organism.display();
  }
  
  // Detect and process word clusters (with error handling)
  try {
    detectWordClusters();
  } catch (error) {
    console.warn("Error detecting word clusters:", error);
  }
}

// Detect and track potential word clusters
function detectWordClusters() {
  const currentTime = millis();
  const allClustersFoundThisFrameIds = new Set(); // To store IDs of all valid clusters found this frame

  // Step 0: Filter for active organisms (not part of already confirmed words and are text types)
  const confirmedOrganismIds = new Set();
  confirmedWords.forEach(cw => {
    if (cw.organisms && Array.isArray(cw.organisms)) {
        cw.organisms.forEach(org => confirmedOrganismIds.add(org.id));
    }
  });

  const activeOrganisms = organisms.filter(org =>
    !confirmedOrganismIds.has(org.id) &&
    org.textType &&
    !["circle", "triangle", "square", "spiral", "asterisk", "cross"].includes(org.textType)
  );

  // Group active organisms by script category
  const organismsByScript = activeOrganisms.reduce((acc, org) => {
    const script = org.scriptCategory || "default"; // Fallback if scriptCategory is missing
    if (!acc[script]) {
      acc[script] = [];
    }
    acc[script].push(org);
    return acc;
  }, {});

  // Process each script group independently
  for (const scriptCategory in organismsByScript) {
    const scriptOrganisms = organismsByScript[scriptCategory];
    if (scriptOrganisms.length < CONFIG.wordSettings.minClusterSize) {
      continue; // Not enough organisms in this script group
    }

    // Step 1: Build proximity map for the current script group
    const proximityMap = new Map();
    for (let i = 0; i < scriptOrganisms.length; i++) {
      for (let j = i + 1; j < scriptOrganisms.length; j++) {
        const org1 = scriptOrganisms[i];
        const org2 = scriptOrganisms[j];

        // Distance check (already same script category)
        const d = dist(org1.pos.x, org1.pos.y, org1.pos.z, org2.pos.x, org2.pos.y, org2.pos.z);
        if (d < CONFIG.connectionDistance * (CONFIG.wordSettings.clusterFormationRadiusFactor || 1.0) ) { // Apply radius factor
          if (!proximityMap.has(org1.id)) proximityMap.set(org1.id, []);
          if (!proximityMap.has(org2.id)) proximityMap.set(org2.id, []);
          proximityMap.get(org1.id).push(org2);
          proximityMap.get(org2.id).push(org1);
        }
      }
    }

    // Step 2: Find connected components (clusters) within this script group
    const visitedInScript = new Set();
    const clustersInScript = [];

    function dfs(orgId, currentCluster) {
      if (visitedInScript.has(orgId)) return;
      visitedInScript.add(orgId);

      const org = scriptOrganisms.find(o => o.id === orgId);
      if (!org) return;

      currentCluster.push(org);
      const neighbors = proximityMap.get(orgId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          // Ensure neighbor is also in the current scriptOrganisms list and not visited
          if (scriptOrganisms.find(o => o.id === neighbor.id) && !visitedInScript.has(neighbor.id)) {
             dfs(neighbor.id, currentCluster);
          }
        }
      }
    }

    for (let org of scriptOrganisms) {
      if (!visitedInScript.has(org.id) && proximityMap.has(org.id)) {
        const currentCluster = [];
        dfs(org.id, currentCluster);
        if (currentCluster.length >= CONFIG.wordSettings.minClusterSize &&
            currentCluster.length <= CONFIG.wordSettings.maxClusterSize) {
          clustersInScript.push(currentCluster);
        }
      }
    }

    // Step 3: Process clusters for this script group
    for (let cluster of clustersInScript) {
      // Sort organisms for consistent ID and string generation.
      // For LTR scripts (default, cyrillic, indic, eastAsian): sort by X-position.
      // For RTL scripts (arabic): sort by X-position descending.
      if (scriptCategory === 'arabic' || scriptCategory === 'hebrew') { // Added hebrew just in case, though not in current target list
        cluster.sort((a, b) => b.pos.x - a.pos.x); // Right-to-Left
      } else {
        cluster.sort((a, b) => a.pos.x - b.pos.x); // Left-to-Right
      }

      const clusterOrgIdsSorted = cluster.map(org => org.id).sort((a,b) => a-b); // Sort IDs numerically for a stable clusterId
      const clusterId = clusterOrgIdsSorted.join(',');
      allClustersFoundThisFrameIds.add(clusterId); // Track this valid cluster

      const clusterString = cluster.map(org => org.textType).join('');

      if (potentialClusters.has(clusterId)) {
        const existingCluster = potentialClusters.get(clusterId);
        if (!existingCluster.checked && (currentTime - existingCluster.startTime >= CONFIG.wordSettings.clusterStabilityTime)) {
          checkWordValidity(clusterId, clusterString, cluster, currentTime, false, scriptCategory);
          existingCluster.checked = true; // Mark as checked to prevent re-checking
        }
      } else {
        potentialClusters.set(clusterId, {
          organisms: cluster,
          startTime: currentTime,
          string: clusterString,
          script: scriptCategory,
          checked: false // Flag to ensure it's checked for validity only once after stable
        });
      }
    }
  }

  // Step 4: Remove from potentialClusters those that no longer exist
  for (let [id, clusterData] of potentialClusters.entries()) {
    if (!allClustersFoundThisFrameIds.has(id)) {
      potentialClusters.delete(id);
    }
  }

  // Step 5: Clean up expired confirmed words (no change needed here)
  confirmedWords = confirmedWords.filter(word => word.displayUntil > currentTime);
}

// Dictionary API endpoints and cache
const dictionaryAPIs = {
  english: {
    url: "https://api.dictionaryapi.dev/api/v2/entries/en/", // HTTPS
    headers: {}
  },
  multilingual: { // For translation and validation of non-English words
    url: "https://api.mymemory.translated.net/get?q=", // HTTPS
    headers: {}
  }
};

// Cache for validated words to reduce API calls
const validatedWordsCache = new Map();

// Detect the probable language of a word based on character script (primarily for API lang codes)
// This function becomes less critical for internal logic if scriptCategory is passed reliably.
function detectWordLanguage(wordString, scriptHint = 'default') {
  if (!wordString || wordString.length === 0) return scriptToLang(scriptHint);

  // Prefer scriptHint if available and valid
  const hintedLang = scriptToLang(scriptHint);
  if (hintedLang !== 'english' || scriptHint !== 'default') { // if hint is specific
      // Test if first char matches the hinted script. If not, then try to autodetect.
      const firstChar = wordString.charAt(0);
      const code = firstChar.charCodeAt(0);
      let matchesHint = false;
      if (scriptHint === 'arabic' && (code >= 0x0600 && code <= 0x06FF || code >= 0x0750 && code <= 0x077F || code >= 0x08A0 && code <= 0x08FF)) matchesHint = true;
      else if (scriptHint === 'indic' && (code >= 0x0900 && code <= 0x097F)) matchesHint = true; // Devanagari for Hindi
      else if (scriptHint === 'eastAsian' && ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF))) matchesHint = true; // Common Chinese
      else if (scriptHint === 'cyrillic' && (code >= 0x0400 && code <= 0x04FF)) matchesHint = true;
      else if (scriptHint === 'default') matchesHint = true; // Assume Latin characters are fine for default

      if (matchesHint) return hintedLang;
  }

  // Fallback to character-based detection if hint is not strong or doesn't match
  const firstChar = wordString.charAt(0);
  const code = firstChar.charCodeAt(0);

  if (code >= 0x0600 && code <= 0x06FF || code >= 0x0750 && code <= 0x077F || code >= 0x08A0 && code <= 0x08FF) return "arabic"; // Arabic, Persian
  if (code >= 0x0900 && code <= 0x097F) return "hindi";    // Devanagari
  if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) return "chinese"; // Common CJK
  if (code >= 0x0400 && code <= 0x04FF) return "russian";  // Cyrillic
  // Latin script based languages (English, Spanish, French, etc.) will fall through to 'english'
  return "english"; // Default for Latin script and others
}

function scriptToLang(scriptCategory) {
  switch (scriptCategory) {
    case 'default': return 'english'; // Covers Latin-based: Eng, Spa, Fre, Por, Ger, Ind/Mal
    case 'arabic': return 'arabic';   // Arabic, Persian
    case 'eastAsian': return 'chinese'; // Mandarin
    case 'indic': return 'hindi';     // Hindi
    case 'cyrillic': return 'russian';   // Russian
    default: return 'english';
  }
}

// Function to check if a string is a valid word
async function checkWordValidity(clusterId, wordString, organisms, currentTime, isRightClickFormed = false, scriptCategory = 'default') {
  if (currentTime - (lastDictionaryCheckTime[scriptCategory] || 0) < CONFIG.wordSettings.apiCooldownDictionary) {
    // console.log(`Cooldown active for ${scriptCategory}, word: ${wordString}`);
    return;
  }
  lastDictionaryCheckTime[scriptCategory] = currentTime;

  if (!wordString || wordString.length < CONFIG.wordSettings.minClusterSize) {
    return;
  }

  const wordStringLower = wordString.toLowerCase();
  // console.log(`Checking word: "${wordString}" (Script: ${scriptCategory})`);

  if (validatedWordsCache.has(wordStringLower)) {
    const cachedResult = validatedWordsCache.get(wordStringLower);
    if (cachedResult.isValid) {
      // console.log(`Cache hit for "${wordString}": Valid`);
      confirmWord(clusterId, wordString, organisms, currentTime, cachedResult.definition, scriptCategory, cachedResult.language);
    } else {
      // console.log(`Cache hit for "${wordString}": Invalid`);
    }
    return;
  }

  let language = scriptToLang(scriptCategory); // Use mapping from scriptCategory
  let isValidWord = false;
  let definition = "";
  let apiUsed = "none";


  // --- WordNet Integration Placeholder ---
  // If WordNet is loaded and script is 'default' (English), check WordNet first for offline.
  if (wordNet && scriptCategory === 'default' && typeof wordNet.lookup === 'function') {
    try {
      const results = await wordNet.lookup(wordStringLower);
      if (results && results.length > 0) {
        isValidWord = true;
        definition = results[0].gloss; // Use the first definition
        // console.log(`WordNet SUCCESS for "${wordString}": ${definition}`);
        apiUsed = "wordnet";
      } else {
        // console.log(`WordNet lookup FAILED for "${wordString}"`);
      }
    } catch (e) {
      console.warn(`WordNet lookup error for "${wordStringLower}":`, e);
    }
  }
  // --- End WordNet Integration Placeholder ---

  if (!isValidWord && navigator.onLine) { // Only try API if not found in WordNet (for English) and online
    apiUsed = "online_api";
    try {
      if (language === "english") {
        const response = await fetch(`${dictionaryAPIs.english.url}${encodeURIComponent(wordStringLower)}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].meanings) {
            isValidWord = true;
            definition = data[0].meanings[0]?.definitions[0]?.definition || "Definition not found.";
          }
        }
      } else { // For other target languages, use MyMemory to check existence by translating
        const langCode = targetLanguageToCode(language); // Get appropriate lang code for API
        const langPair = `${langCode}|en`; // Translate to English for validation by difference
        const apiUrl = `${dictionaryAPIs.multilingual.url}${encodeURIComponent(wordString)}&langpair=${langPair}`;

        // console.log(`Attempting MyMemory API for ${wordString} (${language} / ${langCode}) -> English: ${apiUrl}`);
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.responseStatus === 200 && data.responseData) {
            const translatedText = data.responseData.translatedText;
            // If translated text is different from original (and not just case), it's likely a word.
            // Also handle cases where MyMemory might return the same word if it doesn't know it but translation is requested.
            // A small matchQuality threshold can help.
            if (translatedText && translatedText.toLowerCase() !== wordStringLower && (data.responseData.match || 0) > 0.1) {
              isValidWord = true;
              definition = `Translation (${language} to EN): ${translatedText}`;
            } else if (translatedText && translatedText.toLowerCase() === wordStringLower && (data.responseData.match || 0) < 0.7) {
              // If it returns the same word but low confidence, assume it's not a known word.
              isValidWord = false;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`API error checking word "${wordString}" (Lang: ${language}):`, error);
      // Fallback to offline if API fails
    }
  }
    
     // Offline Fallback (if not validated by WordNet for English or API for others)
  if (!isValidWord) {
    apiUsed = apiUsed === "none" ? "offline_fallback" : apiUsed + "+offline_fallback";
    // console.log(`Using offline fallback for "${wordString}" (Script: ${scriptCategory}, Lang: ${language})`);
    if (scriptCategory === 'default' || language === 'english') { // Primarily for English and other Latin scripts
      const commonWords = [
        // Original list
        "art", "the", "and", "you", "for", "not", "with", "this", "but", "his", "from", "they",
        "say", "she", "will", "one", "all", "would", "there", "their", "what", "out", "about",
        "who", "get", "which", "when", "make", "can", "like", "time", "just", "him", "know",
        "take", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than",
        "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
        "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want",
        "because", "any", "these", "give", "day", "most", "creative", "design", "poem", "word",
        "life", "dream", "flow", "nature", "mind", "idea", "form", "light", "dark", "space",
        "echo", "voice", "sound", "image", "color", "shape", "move", "pulse", "wave", "rhythm",
        "energy", "being", "soul", "earth", "water", "fire", "air", "void", "chaos", "order",
        
        // Additional common English words
        "about", "above", "across", "act", "active", "add", "afraid", "after", "again", "age",
        "ago", "agree", "air", "allow", "alone", "along", "already", "always", "am", "amount",
        "an", "ancient", "anger", "angry", "animal", "answer", "any", "anyone", "anything",
        "appear", "apple", "are", "area", "arm", "army", "around", "arrive", "art", "as", "ask",
        "at", "away", "baby", "back", "bad", "bag", "ball", "bank", "base", "basket", "bath", "be",
        "beautiful", "bed", "bee", "been", "before", "begin", "behind", "bell", "belong", "below",
        "beside", "best", "better", "between", "big", "bird", "birth", "birthday", "bit", "bite",
        "black", "blame", "blank", "blind", "block", "blood", "blow", "blue", "board", "boat",
        "body", "book", "border", "born", "both", "bottle", "bottom", "bowl", "box", "boy",
        "branch", "brave", "bread", "break", "breath", "bridge", "bright", "bring", "brother",
        "brown", "brush", "build", "burn", "bus", "busy", "but", "buy", "by", "cake", "call",
        "can", "candle", "cap", "car", "card", "care", "carry", "case", "cat", "catch", "cause",
        "center", "certain", "chain", "chair", "chance", "change", "chase", "cheap", "cheese",
        "chicken", "chief", "child", "choose", "circle", "city", "class", "clean", "clear",
        "climb", "clock", "close", "cloth", "cloud", "coffee", "cold", "color", "come", "common",
        "complete", "contain", "continue", "control", "cook", "cool", "copper", "copy", "corn",
        "corner", "correct", "cost", "count", "country", "cover", "cow", "crack", "crash",
        "create", "cross", "crowd", "cry", "cup", "cut", "dance", "dark", "date", "day", "dead",
        "deaf", "dear", "death", "decide", "deep", "deer", "depend", "desk", "destroy", "die",
        "different", "difficult", "dig", "dinner", "direct", "dirt", "discover", "dish", "do",
        "dog", "door", "down", "drag", "draw", "dream", "dress", "drink", "drive", "drop", "dry",
        "duck", "dust", "duty", "each", "ear", "early", "earn", "earth", "east", "easy", "eat",
        "edge", "egg", "eight", "either", "else", "empty", "end", "enemy", "enjoy", "enough",
        "enter", "equal", "even", "event", "ever", "every", "exact", "except", "excite", "expect",
        "explain", "eye", "face", "fact", "fail", "fall", "false", "family", "famous", "far",
        "farm", "fast", "fat", "father", "fault", "fear", "feed", "feel", "fever", "few", "field",
        "fight", "fill", "film", "final", "find", "fine", "finger", "finish", "fire", "first",
        "fish", "fit", "five", "fix", "flag", "flat", "float", "floor", "flow", "flower", "fly",
        "fold", "food", "fool", "foot", "force", "forest", "forget", "fork", "form", "four",
        "free", "fresh", "friend", "from", "front", "fruit", "full", "fun", "funny", "future",
        "game", "garden", "gate", "gentle", "get", "gift", "girl", "give", "glad", "glass", "go",
        "goat", "gold", "good", "grass", "gray", "great", "green", "group", "grow", "guess",
        "guide", "gun", "hair", "half", "hall", "hand", "hang", "happen", "happy", "hard", "hat",
        "hate", "have", "head", "hear", "heart", "heat", "heavy", "hello", "help", "hen", "here",
        "hide", "high", "hill", "hit", "hold", "hole", "home", "hope", "horse", "hot", "hour",
        "house", "how", "huge", "human", "humor", "hunt", "hurry", "hurt", "ice", "idea", "if",
        "imagine", "in", "indeed", "inside", "instead", "into", "invite", "iron", "is", "island",
        "it", "its", "join", "joke", "joy", "jump", "just", "keep", "key", "kill", "kind", "king",
        "kitchen", "knee", "knife", "knock", "know", "lady", "lake", "land", "large", "last",
        "late", "laugh", "law", "lay", "lazy", "lead", "leaf", "learn", "least", "leave", "leg",
        "lend", "less", "let", "letter", "level", "lie", "life", "lift", "light", "like", "line",
        "lion", "lip", "list", "listen", "little", "live", "lock", "lonely", "long", "look",
        "lose", "lot", "loud", "love", "low", "luck", "lunch", "main", "make", "male", "man",
        "many", "map", "mark", "market", "matter", "may", "me", "meal", "mean", "meat", "meet",
        "member", "men", "mend", "milk", "mind", "mine", "miss", "mix", "moment", "money", "month",
        "moon", "more", "morning", "most", "mother", "mountain", "mouth", "move", "much", "music",
        "must", "name", "narrow", "nation", "nature", "near", "neat", "neck", "need", "needle",
        "neighbor", "neither", "net", "never", "new", "news", "next", "nice", "night", "nine", "no",
        "noble", "noise", "none", "nor", "north", "nose", "not", "note", "nothing", "notice", "now",
        "number", "obey", "object", "ocean", "of", "off", "offer", "office", "often", "oh", "oil",
        "old", "on", "once", "one", "only", "open", "or", "orange", "order", "other", "our", "out",
        "over", "own", "page", "pain", "paint", "pair", "pan", "paper", "parent", "park", "part",
        "party", "pass", "past", "path", "pay", "peace", "pen", "people", "person", "pick",
        "picture", "piece", "pig", "pin", "pink", "place", "plan", "plant", "plate", "play",
        "please", "plenty", "plow", "point", "police", "pool", "poor", "power", "press", "pretty",
        "price", "prince", "prison", "prize", "pull", "pure", "purple", "push", "put", "queen",
        "quick", "quiet", "quite", "race", "radio", "rain", "raise", "reach", "read", "ready",
        "real", "red", "rest", "rice", "rich", "ride", "right", "ring", "rise", "river", "road",
        "roar", "rock", "room", "root", "rope", "rose", "round", "rub", "rule", "run", "rush",
        "sad", "safe", "sail", "salt", "same", "sand", "save", "say", "school", "science",
        "scissors", "search", "seat", "second", "see", "seed", "seem", "sell", "send", "sense",
        "serve", "seven", "several", "shade", "shadow", "shake", "shall", "shape", "share", "sharp",
        "she", "sheep", "sheet", "shelf", "shine", "ship", "shirt", "shoe", "shoot", "shop",
        "short", "should", "shoulder", "shout", "show", "sick", "side", "sign", "signal", "silent",
        "silver", "simple", "since", "sing", "single", "sink", "sister", "sit", "six", "size",
        "skill", "skin", "skirt", "sky", "sleep", "slide", "slow", "small", "smell", "smile",
        "smoke", "smooth", "snake", "snow", "so", "soap", "sock", "soft", "some", "son", "song",
        "soon", "sorry", "sound", "soup", "south", "space", "speak", "special", "speed", "spell",
        "spend", "spill", "spin", "spirit", "spit", "split", "sport", "spread", "spring", "square",
        "staff", "stage", "stand", "star", "start", "state", "stay", "steal", "steam", "step",
        "stick", "stiff", "still", "stone", "stop", "store", "storm", "story", "stove", "strange",
        "street", "stretch", "string", "strong", "student", "study", "stupid", "such", "sudden",
        "sugar", "suit", "summer", "sun", "supper", "sure", "sweet", "swim", "sword", "table",
        "take", "talk", "tall", "teach", "team", "tear", "tell", "ten", "tennis", "test", "than",
        "that", "the", "their", "then", "there", "these", "thick", "thin", "thing", "think",
        "third", "this", "those", "though", "threat", "three", "throat", "through", "throw",
        "thumb", "thunder", "thus", "tie", "tiger", "tight", "till", "time", "tin", "tiny", "tip",
        "tire", "to", "today", "toe", "together", "tomorrow", "tongue", "tonight", "too", "tool",
        "tooth", "top", "total", "touch", "town", "train", "tram", "travel", "tree", "trouble",
        "true", "trust", "try", "turn", "twice", "two", "ugly", "uncle", "under", "understand",
        "unit", "until", "up", "use", "usual", "valley", "value", "various", "very", "village",
        "visit", "voice", "wait", "wake", "walk", "wall", "want", "war", "warm", "wash", "waste",
        "watch", "water", "wave", "way", "we", "weak", "wear", "weather", "week", "weight",
        "welcome", "well", "west", "wet", "what", "wheel", "when", "where", "which", "while",
        "white", "who", "why", "wide", "wife", "wild", "will", "win", "wind", "window", "wine",
        "wing", "winter", "wire", "wise", "wish", "with", "without", "woman", "wonder", "word",
        "work", "world", "worry", "yard", "yell", "yesterday", "yet", "you", "young", "your", "zero"
      ];
      if (commonWords.includes(wordStringLower)) {
        isValidWord = true;
        definition = definition || "A common word."; // Keep API/WordNet definition if it existed
      }
    }

    // Generic fallback rules (apply if still not valid, for any language)
    if (!isValidWord) {
        if (wordString.length >= 5) { // Test rule: 5+ letter words are valid
            isValidWord = true;
            definition = definition || "A sequence of characters.";
        } else if (wordString.length >= CONFIG.wordSettings.minClusterSize && wordString.length <= 4) { // 3-4 char words
            if (Math.random() < 0.25) { // 25% chance for shorter non-dictionary words
                isValidWord = true;
                definition = definition || "A short sequence of characters.";
            }
        }
    }
  }
    
    // Add to cache
    validatedWordsCache.set(wordStringLower, {
      isValid: isValidWord,
      definition: definition,
      timestamp: currentTime,
      language: language, // Store the detected language
      api: apiUsed
    });
  
    if (isValidWord) {
      // console.log(`Word VALIDATED: "${wordString}" (Lang: ${language}, Def: ${definition}, API: ${apiUsed})`);
      if (isRightClickFormed && wordString.length >= 3 && language === 'english') { // generatePossibleWords is likely English-centric
        const possibleWords = generatePossibleWords(wordString); // This needs to be WordNet-aware if possible
        if (possibleWords && possibleWords.length > 1) {
          showWordSelectionUI(clusterId, possibleWords, organisms, currentTime);
          return;
        }
      }
      confirmWord(clusterId, wordString, organisms, currentTime, definition, scriptCategory, language);
      metadata.validWordCount = (metadata.validWordCount || 0) + 1;
  
      let notificationElement = document.getElementById("notification");
      if (notificationElement) {
        notificationElement.innerHTML = `Word Found: <strong>${wordString}</strong> (${language})`;
        notificationElement.classList.add("visible");
        setTimeout(() => { notificationElement.classList.remove("visible"); }, 3000);
      }
      // Play success sound for valid word
      if (CONFIG.audioEnabled) {
        try {
          // Play successively higher notes as a "success" sequence
          let baseNote = 300;
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              playSound(baseNote + (i * 100), 0); // Center pan
            }, i * 150);
          }
        } catch (e) {
          console.warn("Error playing success sound:", e);
        }
      }
    } else {
      // console.log(`Word INVALIDATED: "${wordString}" (Lang: ${language}, API: ${apiUsed})`);
      console.log(`Invalid word attempt: ${wordString}`); 
    }
  }

// NEW: Generate possible words from a set of letters
function generatePossibleWords(letters) {
  if (!letters || letters.length < 2) return [];
  
  // For demonstration purposes, we'll include some predefined examples:
  // In a full implementation, this would call a dictionary service to find valid anagrams
  const letterSort = letters.toLowerCase().split('').sort().join('');
  
  const predefinedAnagrams = {
    // Some common anagram sets for demonstration
    'aelst': ['least', 'stale', 'steal', 'tales'],
    'aepst': ['paste', 'pates', 'peats', 'septa', 'spate', 'tapes'],
    'aerst': ['rates', 'stare', 'tears', 'tares'],
    'airst': ['stair', 'stria', 'tarsi', 'trais'],
    'ginre': ['reign', 'giner'],
    'eginr': ['reign', 'niger'],
    'elost': ['stole', 'lotes', 'toles'],
    'host': ['shot', 'tosh'],
    'post': ['pots', 'spot', 'stop', 'tops'],
    'rst': ['str', 'tsr'],
    'ast': ['sat', 'tas'],
    'eht': ['the', 'teh'],
    'dna': ['and', 'dan'],
    'rof': ['for', 'fro'],
    'eginr': ['reign', 'niger'],
    'abcde': ['beacd', 'cebad'],
  };
  
  // Check if we have predefined anagrams for these letters or subsets
  let possibleWords = [];
  
  // First check for exact matches in our predefined sets
  if (predefinedAnagrams[letterSort]) {
    possibleWords = predefinedAnagrams[letterSort];
  } else {
    // If no exact match, try to find words that could be made from a subset of the letters
    for (const [key, words] of Object.entries(predefinedAnagrams)) {
      // Check if the key is contained within our letter set
      if (key.length >= 3 && letterSort.includes(key)) {
        possibleWords.push(...words);
      }
    }
    
    // Deduplicate the list
    possibleWords = [...new Set(possibleWords)];
  }
  
  // If we didn't find any words, return the original as the only option
  if (possibleWords.length === 0) {
    possibleWords.push(letters);
  }
  
  return possibleWords;
}

// NEW: Show UI for selecting between multiple possible words
function showWordSelectionUI(clusterId, possibleWords, organisms, currentTime) {
  console.log("Showing word selection UI for:", possibleWords);
  
  // Create UI element for word selection
  const container = document.createElement('div');
  container.id = 'word-selection-container';
  container.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.8);
    border: 2px solid #fff;
    border-radius: 10px;
    padding: 20px;
    z-index: 100;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
    max-width: 80%;
  `;
  
  // Create title
  const title = document.createElement('h3');
  title.textContent = 'Multiple Words Possible';
  title.style.cssText = `
    margin-top: 0;
    color: #fff;
    font-size: 18px;
  `;
  container.appendChild(title);
  
  // Create subtitle
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Select a word to form:';
  subtitle.style.cssText = `
    margin-bottom: 15px;
    color: #ccc;
    font-size: 14px;
  `;
  container.appendChild(subtitle);
  
  // Create buttons for each word
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  `;
  
  possibleWords.forEach(word => {
    const button = document.createElement('button');
    button.textContent = word;
    button.style.cssText = `
      background-color: #444;
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#666';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#444';
    });
    
    button.addEventListener('click', () => {
      // Remove the selection UI
      document.body.removeChild(container);
      
      // Process the selected word
      console.log("Selected word:", word);
      confirmWord(clusterId, word, organisms, currentTime, "A word discovered in the biome.");
      
      // Provide feedback for selection
      let notificationElement = document.getElementById("notification");
      if (notificationElement) {
        notificationElement.innerHTML = `Word Selected: <strong>${word}</strong>`;
        notificationElement.classList.add("visible");
        
        setTimeout(() => {
          notificationElement.classList.remove("visible");
        }, 3000);
      }
      
      // Play success sound
      if (audioEnabled) {
        try {
          let baseNote = 300;
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              playSound(baseNote + (i * 100), 0);
            }, i * 150);
          }
        } catch (e) {
          console.warn("Error playing success sound:", e);
        }
      }
    });
    
    buttonContainer.appendChild(button);
  });
  container.appendChild(buttonContainer);
  
  // Add cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    background-color: #222;
    color: #ccc;
    border: none;
    border-radius: 5px;
    padding: 8px 15px;
    font-size: 14px;
    cursor: pointer;
    margin-top: 15px;
  `;
  
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(container);
  });
  container.appendChild(cancelButton);
  
  // Add to the document
  document.body.appendChild(container);
}

// Helper function to confirm a valid word
function confirmWord(clusterId, wordString, organisms, currentTime, definition) {
  // Add to confirmed words
  confirmedWords.push({
    word: wordString,
    organisms: organisms,
    displayUntil: currentTime + CONFIG.wordSettings.wordDisplayTime3D,
    definition: definition || "A word discovered in the biome."
  });
  
  console.log(`Word confirmed: ${wordString} - ${definition}`);
  
  // Remove from potential clusters to avoid duplicate confirmations
  potentialClusters.delete(clusterId);
}

// Function to display confirmed words in the 3D environment
function displayConfirmedWords() {
  if (confirmedWords.length === 0) return;
  
  const currentTime = millis();
  
      push();
  
  // Use p5's text functions to display the words over the clusters
        textAlign(CENTER, CENTER);
  textSize(24);
  
  for (const word of confirmedWords) {
    // Calculate center position of all organisms in this word's cluster
    let centerX = 0, centerY = 0, centerZ = 0;
    for (const org of word.organisms) {
      centerX += org.pos.x;
      centerY += org.pos.y;
      centerZ += org.pos.z;
    }
    centerX /= word.organisms.length;
    centerY /= word.organisms.length;
    centerZ /= word.organisms.length;
    
    // Add slight offset above the cluster
    centerY -= 30;
    
    // Calculate fade based on remaining display time
    const remainingTime = word.displayUntil - currentTime;
    let opacity = 1;
    
    // Fade in first 500ms, fade out last 1000ms
    if (remainingTime < 1000) {
      opacity = map(remainingTime, 0, 1000, 0, 1);
    } else if (word.displayUntil - currentTime > CONFIG.wordSettings.wordDisplayTime3D - 500) {
      const elapsed = CONFIG.wordSettings.wordDisplayTime3D - (word.displayUntil - currentTime);
      opacity = map(elapsed, 0, 500, 0, 1);
    }
    
    // Draw a subtle glow behind the text
    push();
    translate(centerX, centerY, centerZ);
    
    // Always face camera (use billboard technique)
    // This is a simplified solution that works with p5.js 3D
    rotateY(-cameraRotation.y);
    rotateX(-cameraRotation.x);
    
    // Draw enhanced glow behind text
    noStroke();
    
    // Stronger outer glow
    fill(255, 255, 255, 25 * opacity);
    ellipse(0, 0, word.word.length * 16 + 30, 60);
    
    // Medium glow
    fill(255, 255, 255, 40 * opacity);
    ellipse(0, 0, word.word.length * 15 + 25, 55);
    
    // Inner glow (more visible)
    fill(255, 255, 255, 60 * opacity);
    ellipse(0, 0, word.word.length * 14 + 20, 50);
    
    // Draw text with stronger contrast
    fill(255, 255, 255, 230 * opacity);
    
    // Draw slight shadow for better readability
    push();
    translate(1, 1, -0.5);
    fill(0, 0, 0, 100 * opacity);
    text(word.word, 0, 0);
    pop();
    
    // Main text
    fill(255, 255, 255, 230 * opacity);
    text(word.word, 0, 0);
    
    // Draw subtle particles around confirmed word
    for (let i = 0; i < 8; i++) {
      push();
      const angle = i * (TWO_PI / 8) + frameCount * 0.02;
      const radius = 30 + sin(frameCount * 0.05 + i) * 5;
      translate(cos(angle) * radius, sin(angle) * radius, 0);
      fill(255, 255, 255, 70 * opacity);
      noStroke();
      // Use a smaller sphere for particles
      sphere(2);
      pop();
    }
    
    // Also highlight the organisms that form this word
    for (const org of word.organisms) {
      // Draw a connection line from word to organism
      stroke(255, 255, 255, 100 * opacity);
      strokeWeight(1);
      line(0, 0, 0, org.pos.x - centerX, org.pos.y - centerY, org.pos.z - centerZ);
      
      // If organism has a mesh, temporarily highlight it
      if (org.mesh && org.mesh.material) {
        org.mesh.material.emissive = new THREE.Color(0.3, 0.3, 0.5);
        org.mesh.material.emissiveIntensity = 0.7 * opacity;
        
        // Reset emissive after a short delay (in next frame)
        setTimeout(() => {
          if (org.mesh && org.mesh.material) {
            org.mesh.material.emissive = new THREE.Color(0, 0, 0);
            org.mesh.material.emissiveIntensity = 0;
          }
        }, 100);
      }
    }
    
    pop();
  }
  
  pop();
   // Update stats for HTML display (if elements exist)
  if (wordCountEl) {
    wordCountEl.textContent = `WORDS: ${collectedWords.length}`;
  }
  if (totalScoreEl) {
    let score = 0;
    collectedWords.forEach(w => score += w.word.length);
    totalScoreEl.textContent = `SCORE: ${score}`;
  }
  
  // NEW: Update the word list box UI
  const wordListContent = document.getElementById('wordListContent');
  if (wordListContent) {
    wordListContent.innerHTML = ''; // Clear previous words

    // Display newest words first, from collectedWords array
    for (let i = collectedWords.length - 1; i >= 0; i--) {
      const wordObj = collectedWords[i]; 
      const wordP = document.createElement('p');
      wordP.textContent = wordObj.word; 
      wordP.style.margin = '3px 0';
      wordP.style.padding = '3px 0';
      wordP.style.fontSize = '11px';
      wordP.style.lineHeight = '1.3';
      
      if (i === 0 && collectedWords.length > 1) { 
        wordP.style.borderBottom = 'none';
      } else if (collectedWords.length > 0) {
         wordP.style.borderBottom = '1px dotted #444';
      }
      wordListContent.appendChild(wordP);
    }
  }
} // End of displayConfirmedWords


// Apply flocking behaviors (separation, alignment, cohesion) in 3D space
function applyFlockingBehaviors(organism) {
  // Get neighbors efficiently using spatial partitioning
  let neighbors = getNeighbors(
    organism.pos.x,
    organism.pos.y,
    organism.pos.z,
    CONFIG.cohesionDistance
  );

  // Initialize steering forces
  let separation = createVector(0, 0, 0);
  let alignment = createVector(0, 0, 0);
  let cohesion = createVector(0, 0, 0);
  let scriptCohesion = createVector(0, 0, 0); // NEW: Special force for same-script attraction

  // Count valid neighbors for each behavior
  let sepCount = 0;
  let aliCount = 0;
  let cohCount = 0;
  let scriptCount = 0; // NEW: Count for same-script neighbors

  // Check each neighbor
  for (let i = 0; i < neighbors.length; i++) {
    let other = neighbors[i];

    // Skip self
    if (other === organism) continue;

    // Calculate 3D distance
    let d = p5.Vector.dist(organism.pos, other.pos);

    // Separation (avoid crowding)
    if (d < CONFIG.separationDistance) {
      // Calculate vector pointing away from neighbor
      let diff = p5.Vector.sub(organism.pos, other.pos);
      diff.normalize();
      diff.div(d * d); // NEW: Weight by inverse square distance for more natural spacing
      separation.add(diff);
      sepCount++;
    }

    // Alignment (steer towards average heading)
    if (d < CONFIG.alignmentDistance) {
      alignment.add(other.vel);
      aliCount++;
    }

    // Cohesion (steer towards center of neighbors)
    if (d < CONFIG.cohesionDistance) {
      cohesion.add(other.pos);
      cohCount++;
      
      // NEW: Special script-based cohesion
      // If this organism shares the same script category with neighbor, create stronger attraction
      if (organism.scriptCategory === other.scriptCategory && 
          organism.scriptCategory !== "default" && 
          !["circle", "triangle", "square", "spiral", "asterisk", "cross"].includes(organism.textType)) {
        // Create vector pointing toward the same-script neighbor
        let sameScriptDiff = p5.Vector.sub(other.pos, organism.pos);
        sameScriptDiff.normalize();
        // Closer neighbors have stronger effect
        sameScriptDiff.mult(map(d, 0, CONFIG.cohesionDistance, 1.5, 0.5));
        scriptCohesion.add(sameScriptDiff);
        scriptCount++;
      }
    }
  }

  // Calculate average and apply steering
  if (sepCount > 0) {
    separation.div(sepCount);
    separation.normalize();
    separation.mult(organism.dna.speed);
    separation.sub(organism.vel);
    separation.limit(CONFIG.maxForce * 1.3); // Slightly reduced from 1.5 to allow closer clustering
  }

  if (aliCount > 0) {
    alignment.div(aliCount);
    alignment.normalize();
    alignment.mult(organism.dna.speed);
    alignment.sub(organism.vel);
    alignment.limit(CONFIG.maxForce * 0.9); // Increased from 0.8 for better group movement
  }

  if (cohCount > 0) {
    cohesion.div(cohCount);
    cohesion.sub(organism.pos);
    cohesion.normalize();
    cohesion.mult(organism.dna.speed);
    cohesion.sub(organism.vel);
    cohesion.limit(CONFIG.maxForce * 0.7); // Increased from 0.6 for stronger grouping
  }
  
  // NEW: Process script cohesion force if it exists
  if (scriptCount > 0) {
    scriptCohesion.normalize();
    scriptCohesion.mult(organism.dna.speed * 0.7); // Apply a strong attractive force
    scriptCohesion.limit(CONFIG.maxForce * 1.0); // Allow full strength for script cohesion
  }

  // Apply steering forces with weights based on DNA
  let sepWeight = map(organism.dna.socialFactor, 0, 1, 1.5, 0.5);
  let aliWeight = organism.dna.socialFactor;
  let cohWeight =
    organism.dna.socialFactor * (organism.dna.attraction ? 1 : -0.5);
    
  // NEW: Script cohesion weight - always positive to encourage word formation
  let scriptWeight = organism.dna.socialFactor * 1.2;

  // Apply forces to organism
  separation.mult(sepWeight);
  alignment.mult(aliWeight);
  cohesion.mult(cohWeight);
  if (scriptCount > 0) {
    scriptCohesion.mult(scriptWeight);
  }

  organism.applyForce(separation);
  organism.applyForce(alignment);
  organism.applyForce(cohesion);
  
  // NEW: Apply script cohesion force if applicable
  if (scriptCount > 0) {
    organism.applyForce(scriptCohesion);
  }
  
  // NEW: Add a slight dampening force to reduce chaotic movement
  const dampening = organism.vel.copy();
  dampening.mult(-0.01); // Small resistance like air friction
  organism.applyForce(dampening);
  
  // NEW: If focus resonance is active, enhance its effect to encourage word formation
  if (focusResonanceActive && focusResonancePosition) {
    const distToFocus = p5.Vector.dist(organism.pos, focusResonancePosition);
    
    if (distToFocus < focusResonanceRadius) {
      // Calculate force strength based on distance (stronger closer to center)
      const forceMag = map(
        distToFocus,
        0,
        focusResonanceRadius,
        CONFIG.wordSettings.focusResonanceStrength,
        0
      );
      
      // Create force vector toward focus point
      const focusForce = p5.Vector.sub(focusResonancePosition, organism.pos);
      focusForce.normalize();
      focusForce.mult(forceMag * CONFIG.maxForce);
      
      // Apply force to organism
      organism.applyForce(focusForce);
      
      // Apply damping to slow organisms in the focus area
      organism.vel.mult(CONFIG.wordSettings.focusResonanceDamping);
      
      // If an organism is in focus area and has same-script neighbors, make it more likely to form words
      if (scriptCount > 0) {
        // Subtle rotation adjustment to face similar organisms
        organism.rotation.y += 0.01 * (random() - 0.5);
        organism.rotation.x += 0.01 * (random() - 0.5);
      }
    }
  }
}

// Setup UI elements for 3D version
function setupUI() {
  // Create notification element for word validation and other messages
  const notification = document.createElement("div");
  notification.id = "notification";
  notification.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 18px;
    z-index: 2000;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  `;
  // Start with the notification hidden (opacity: 0)
  document.body.appendChild(notification);

  // Info panel toggle
  const infoToggle = document.getElementById("info-toggle");
  const infoPanel = document.getElementById("info-panel");

  if (infoToggle && infoPanel) {
    infoToggle.addEventListener("click", () => {
      infoPanel.classList.toggle("hidden");
      infoToggle.classList.toggle("active");
    });
  }

  // Palette toggle
  const paletteToggle = document.getElementById("palette-toggle");

  if (paletteToggle) {
    paletteToggle.addEventListener("click", () => {
      // cyclePalette(); // OLD: Was cycling color palettes
      cycleHighlightScript(); // NEW: Now cycles script highlight modes
    });
    // Initialize button text
    let initialDisplayName = highlightedScriptCategory;
    if (initialDisplayName === "all_white") initialDisplayName = "All White";
    else initialDisplayName = initialDisplayName.charAt(0).toUpperCase() + initialDisplayName.slice(1);
    paletteToggle.textContent = `Highlight: ${initialDisplayName}`;
  }

  // Sound toggle
  const soundToggle = document.getElementById("sound-toggle");

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      toggleSound();
      soundToggle.classList.toggle("active", audioEnabled);
    });
  }

  // Add QR code click behavior
  const qrCode = document.getElementById("qr-code");

  if (qrCode) {
    qrCode.addEventListener("click", () => {
      window.open("https://timrodenbroeker.de", "_blank");
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "c":
        // cyclePalette(); // OLD: Was cycling color palettes
        cycleHighlightScript(); // NEW: Now cycles script highlight modes
        break;
      case "s":
        toggleSound();
        if (soundToggle) soundToggle.classList.toggle("active", audioEnabled);
        break;
      case "i":
        if (infoPanel) infoPanel.classList.toggle("hidden");
        if (infoToggle) infoToggle.classList.toggle("active");
        break;
      case "r":
        window.resetCamera();
        break;
    }
  });

  // Update stats initially
  updateStats();
  
  // Stats display
  const statsDiv = document.createElement('div');
  statsDiv.id = 'statsDisplay';
  statsDiv.style.position = 'absolute';
  statsDiv.style.top = '10px';
  statsDiv.style.right = '10px';
  statsDiv.style.padding = '10px';
  statsDiv.style.background = 'rgba(0,0,0,0.7)';
  statsDiv.style.color = 'white';
  statsDiv.style.border = '1px solid #555';
  statsDiv.style.borderRadius = '5px';
  statsDiv.style.fontFamily = 'Arial, sans-serif';
  statsDiv.style.fontSize = '12px';
  statsDiv.style.width = '220px'; // Fixed width
  document.body.appendChild(statsDiv);
 
  // Create the stats display elements
  wordCountEl = document.createElement('div'); // Make this global (no const)
  totalScoreEl = document.createElement('div'); // Make this global (no const)
  avgDepthEl = document.createElement('div');
  fpsEl = document.createElement('div');
  cameraModeEl = document.createElement('div');
  targetFpsEl = document.createElement('div');

  // Add them to statsDiv
  statsDiv.appendChild(wordCountEl);
  statsDiv.appendChild(totalScoreEl);
  statsDiv.appendChild(avgDepthEl);
  statsDiv.appendChild(fpsEl);
  statsDiv.appendChild(cameraModeEl);
  statsDiv.appendChild(targetFpsEl);

  // Then create the wordListBox
  let wordListBoxTop = 10;
  if (statsDiv && statsDiv.offsetHeight > 0) {
    wordListBoxTop = statsDiv.offsetTop + statsDiv.offsetHeight + 10;
  } else {
    wordListBoxTop = 10 + (6 * 20) + 10; // Approximately 140px
  }

  const wordListBox = document.createElement('div');
  wordListBox.id = 'wordListBox';
  wordListBox.style.position = 'absolute';
  wordListBox.style.top = wordListBoxTop + 'px';
  wordListBox.style.right = '10px';
  wordListBox.style.width = '220px'; // Same as statsDiv
  wordListBox.style.height = '150px';
  wordListBox.style.background = 'rgba(0,0,0,0.7)';
  wordListBox.style.color = 'white';
  wordListBox.style.border = '1px solid #555';
  wordListBox.style.borderRadius = '5px';
  wordListBox.style.padding = '10px';
  wordListBox.style.fontFamily = 'Arial, sans-serif';
  wordListBox.style.fontSize = '12px';
  // wordListBox.style.overflowY = 'auto'; // Let content div handle scrolling
  document.body.appendChild(wordListBox);

  // Using the global variable declared at the top
  wordListTitle = document.createElement('h4');
  wordListTitle.textContent = 'Collected Words';
  wordListTitle.style.margin = '0 0 8px 0';
  wordListTitle.style.paddingBottom = '5px';
  wordListTitle.style.borderBottom = '1px solid #444';
  wordListTitle.style.fontWeight = 'bold';
  wordListTitle.style.fontSize = '13px'; // Slightly larger title
  wordListBox.appendChild(wordListTitle);

  // Create word list content container using the global variable
  wordListContent = document.createElement('div');
  wordListContent.id = 'wordListContent';
  
  // Calculate available height for content dynamically
  // Box inner height is 150px - 2*10px padding = 130px.
  // Title approx height: 13px font + 8px margin-bottom + 5px padding-bottom ~ 26px.
  // Initial calculation:
  let contentHeightCalc = 130 - 26; // Approximately
  // Fallback if title offsetHeight isn't ready during initial call:
  if (wordListTitle && typeof wordListTitle.offsetHeight !== 'undefined' && wordListTitle.offsetHeight > 0) {
    contentHeightCalc = 130 - (wordListTitle.offsetHeight + parseInt(wordListTitle.style.marginBottom || '0') + parseInt(wordListTitle.style.paddingBottom || '0'));
  }
  wordListContent.style.height = Math.max(20, contentHeightCalc) + 'px'; // Ensure a minimum height
  wordListContent.style.overflowY = 'auto'; // Make this part scrollable
  wordListBox.appendChild(wordListContent);
}

// Mouse click in 3D space
function mousePressed() {
  // Handle RIGHT mouse button for Focus/Resonance tool
  if (mouseButton === RIGHT) {
    if (!isMouseOverUI()) {
      focusResonanceActive = true;
      // Use proper 3D position instead of Z=0 plane
      focusResonancePosition = mousePositionTo3D();
    }
    return false; // IMPORTANT: Prevent default browser context menu
  }
  // Handle LEFT mouse button
  else if (mouseButton === LEFT) {
    if (!isMouseOverUI()) {
      // Check if the user clicked on a confirmed word
      if (tryClickConfirmedWord()) {
        // Handled by the word click function
        return false;
      }
      
      // No longer creating new organisms on left-click
    }
    return false; // Prevent default action
  }
  // Allow default behavior if over UI or other mouse buttons for future use
}

// Try to click on a confirmed word
function tryClickConfirmedWord() {
  if (confirmedWords.length === 0) return false;
  
  // Convert mouse position to 3D space coordinates
  const mousePos = createVector(mouseX - width / 2, mouseY - height / 2, 0);
  
  // Calculate camera position and direction
  let cameraPos = createVector(
    cameraZoom * cos(cameraRotation.x) * sin(cameraRotation.y),
    cameraZoom * sin(cameraRotation.x),
    cameraZoom * cos(cameraRotation.x) * cos(cameraRotation.y)
  );
  
  // Simplified ray casting for word selection
  // For each word, check if mouse is roughly over its 2D projection
  for (let i = 0; i < confirmedWords.length; i++) {
    const word = confirmedWords[i];
    
    // Calculate center of the word cluster
    let centerX = 0, centerY = 0, centerZ = 0;
    for (const org of word.organisms) {
      centerX += org.pos.x;
      centerY += org.pos.y;
      centerZ += org.pos.z;
    }
    centerX /= word.organisms.length;
    centerY /= word.organisms.length;
    centerZ /= word.organisms.length;
    
    // Adjust for the offset we applied when displaying
    centerY -= 30;
    
    // Project 3D word position to 2D screen space (simplified)
    // This is a very simplified approach - real 3D picking would be more complex
    const wordScreenPos = projectPoint(centerX, centerY, centerZ);
    
    // Check if mouse is over this word (with some tolerance)
    const clickDistance = dist(mousePos.x, mousePos.y, wordScreenPos.x, wordScreenPos.y);
    const wordRadius = word.word.length * 5 + 20; // Rough size based on word length
    
    if (clickDistance < wordRadius) {
      // Word clicked! Collect it
      collectWord(word);
      
      // Remove from confirmed words display
      confirmedWords.splice(i, 1);
      
      return true;
    }
  }
  
  return false;
}

// Simple helper to roughly project a 3D point to 2D screen space
function projectPoint(x, y, z) {
  // This is a simplified projection for demonstration
  // A proper implementation would use the actual camera matrix
  
  try {
    // Apply perspective division (get point relative to camera, then divide by z)
    const cameraDir = createVector(
      sin(cameraRotation.y) * cos(cameraRotation.x),
      sin(cameraRotation.x),
      cos(cameraRotation.y) * cos(cameraRotation.x)
    );
    
    // Simplified projection - adjust these factors based on your camera setup
    const focalLength = width / 2; // Rough estimate
    const distance = p5.Vector.dot(createVector(x, y, z), cameraDir);
    
    // Apply perspective division (with safety check)
    const divisor = max(1, abs(distance));
    const scale = focalLength / divisor;
    
    return createVector(x * scale, y * scale);
  } catch (error) {
    console.warn("Error in projectPoint:", error);
    // Return a fallback projection (center of screen)
    return createVector(0, 0);
  }
}

// Collect a word and add it to user's collection
function collectWord(word) {
  // Don't exceed max collected words
  if (collectedWords.length >= CONFIG.wordSettings.maxCollectedWords) {
    console.log("Word collection full! Remove some words to collect more.");
    return;
  }
  
  // Add to collected words with placeholder definition
  collectedWords.push({
    word: word.word,
    definition: "A word discovered in the biome.", // Placeholder - would be from API
    translations: {} // Placeholder for translations
  });
  
  console.log(`Collected word: ${word.word}`);
  console.log("Current collection:", collectedWords.map(w => w.word).join(", "));
  
  // Play a sound to acknowledge collection
  if (audioEnabled) {
    try {
      // Calculate a pleasant pitch for word collection
      let notePitch = 300 + (word.word.length * 50);
      playSound(notePitch, 0); // Central pan
    } catch (e) {
      console.warn("Could not play collection sound:", e);
    }
  }
  
  // Animate the organisms in this word
  for (const org of word.organisms) {
    // Add a celebratory animation
    if (org.mesh) {
      // Scale up briefly then back
      if (org.mesh.scale) {
        const originalScale = { x: org.mesh.scale.x, y: org.mesh.scale.y, z: org.mesh.scale.z };
        
        // Scale up
        org.mesh.scale.set(originalScale.x * 1.5, originalScale.y * 1.5, originalScale.z * 1.5);
        
        // Scale back after delay
        setTimeout(() => {
          if (org.mesh && org.mesh.scale) {
            org.mesh.scale.set(originalScale.x, originalScale.y, originalScale.z);
          }
        }, 300);
      }
    }
  }
  
  // Here you would update the UI to show the new word
  // This would be integrated with your Poet's Palette UI when implemented
}

// Cycle through color palettes
function cyclePalette() {
  paletteIndex = (paletteIndex + 1) % PALETTES.length;
  selectedPalette = PALETTES[paletteIndex];

  // Update lights with new palette colors
  for (let i = 0; i < lights.length; i++) {
    lights[i].color = selectedPalette[floor(random(selectedPalette.length))];
  }

  console.log("Palette changed to:", paletteIndex);
}

// NEW: Function to cycle through script highlighting modes
function cycleHighlightScript() {
  currentHighlightIndex = (currentHighlightIndex + 1) % availableScriptCategories.length;
  highlightedScriptCategory = availableScriptCategories[currentHighlightIndex];
  console.log("Highlighting script category:", highlightedScriptCategory);

  // Potentially update UI elements to reflect the current mode, if any exist.
  const paletteToggle = document.getElementById("palette-toggle");
  if (paletteToggle) {
    // Update the text or style of the button to show the current highlighted script
    let displayName = highlightedScriptCategory;
    if (displayName === "all_white") {
      displayName = "All White";
    } else if (SCRIPT_HIGHLIGHT_COLORS[displayName]) {
        // You might want a more user-friendly mapping for display names
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    paletteToggle.textContent = `Highlight: ${displayName}`;
  }
}
// END NEW

// Toggle sound on/off
function toggleSound() {
  audioEnabled = !audioEnabled;

  if (audioEnabled) {
    setupAudio();
    console.log("Sound enabled");
  } else {
    console.log("Sound disabled");
    // Stop any playing sounds
    try {
      if (audioContext) {
        if (noiseOsc) noiseOsc.stop();
        oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch (e) {}
        });
        oscillators = [];
      }
    } catch (e) {
      console.warn("Error stopping audio:", e);
    }
  }
}

// Setup audio system
function setupAudio() {
  if (!audioEnabled) return;

  try {
    // Initialize Web Audio API
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create a noise generator for ambient sound
      noiseOsc = audioContext.createOscillator();
      noiseOsc.type = "sawtooth";
      noiseOsc.frequency.value = 50;

      // Create a noise filter
      let noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 100;
      noiseFilter.Q.value = 1;

      // Create noise gain
      let noiseGain = audioContext.createGain();
      noiseGain.gain.value = 0.01;

      // Connect noise chain
      noiseOsc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioContext.destination);

      // Start noise
      noiseOsc.start();

      // Create analyzer
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.connect(audioContext.destination);

      console.log("Audio system initialized");
    }
  } catch (e) {
    console.warn("Error setting up audio:", e);
    audioEnabled = false;
  }
}

// Play a sound with given parameters
function playSound(frequency, pan = 0) {
  if (!audioEnabled || !audioContext) return;

  try {
    // Limit number of simultaneous sounds
    if (oscillators.length > 8) {
      let oldOsc = oscillators.shift();
      try {
        oldOsc.stop();
      } catch (e) {}
    }

    // Create oscillator
    let osc = audioContext.createOscillator();
    osc.type = random(["sine", "triangle"]);
    osc.frequency.value = frequency;

    // Create envelope
    let gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    // Create panner for stereo positioning
    let panner = audioContext.createStereoPanner();
    panner.pan.value = pan;

    // Connect audio chain
    osc.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(analyzer);
    panner.connect(audioContext.destination);

    // Apply envelope
    let now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    // Start and schedule stop
    osc.start();
    osc.stop(now + 1.5);

    // Store in array
    oscillators.push(osc);

    // Remove from array when done
    osc.onended = function () {
      let index = oscillators.indexOf(osc);
      if (index >= 0) oscillators.splice(index, 1);
    };
  } catch (e) {
    console.warn("Error playing sound:", e);
  }
}

// Update statistics display
function updateStats() {
  const statsElement = document.getElementById("stats");
  if (!statsElement) return;

  // Count organism types
  let typeCounts = {};
  CONFIG.types.forEach((type) => (typeCounts[type] = 0));

  // Track script category usage
  let scriptCounts = {};
  
  organisms.forEach((org) => {
    typeCounts[org.dna.type] = (typeCounts[org.dna.type] || 0) + 1;
    
    // Count script categories
    const script = org.scriptCategory || "default";
    scriptCounts[script] = (scriptCounts[script] || 0) + 1;
  });

  // Find dominant type
  let maxCount = 0;
  let dominantType = "";

  for (let type in typeCounts) {
    if (typeCounts[type] > maxCount) {
      maxCount = typeCounts[type];
      dominantType = type;
    }
  }
  
  // Find dominant script
  let maxScriptCount = 0;
  let dominantScript = "";
  
  for (let script in scriptCounts) {
    if (scriptCounts[script] > maxScriptCount) {
      maxScriptCount = scriptCounts[script];
      dominantScript = script;
    }
  }
  
  // Map script name to more readable format
  const scriptDisplayNames = {
    default: "Latin",
    greek: "Greek",
    armenian: "Armenian",
    georgian: "Georgian",
    hebrew: "Hebrew",
    arabic: "Arabic",
    eastAsian: "East Asian",
    indic: "Indic",
    southeastAsian: "Southeast Asian",
    syriac: "Syriac",
    coptic: "Coptic",
    ethiopic: "Ethiopic",
    cherokee: "Cherokee",
    canadianAboriginal: "Aboriginal",
    tibetan: "Tibetan",
    burmese: "Burmese",
    sinhala: "Sinhala",
    mongolian: "Mongolian",
    tifinagh: "Tifinagh",
    nko: "N'Ko",
    vai: "Vai",
    osmanya: "Osmanya",
    adlam: "Adlam",
    ogham: "Ogham",
    runic: "Runic",
    glagolitic: "Glagolitic",
    bamum: "Bamum"
  };

  // Store in metadata
  metadata.dominantType = dominantType;
  
  // Calculate number of script systems in use
  const scriptDiversity = Object.keys(scriptCounts).length;

  // Calculate average lifespan
  let totalLifespan = organisms.reduce((sum, org) => sum + org.dna.lifespan, 0);
  metadata.avgLifespan = totalLifespan / max(1, organisms.length);

  // Calculate runtime
  let elapsedSeconds = floor((millis() - metadata.timeSinceStart) / 1000);
  let minutes = floor(elapsedSeconds / 60);
  let seconds = elapsedSeconds % 60;

  // Calculate system complexity (composite metric)
  metadata.systemComplexity = map(
    (organisms.length * metadata.interactionCount) / max(1, elapsedSeconds),
    0,
    1000,
    0,
    100
  );
  metadata.systemComplexity = min(100, metadata.systemComplexity);

  // Update the stats display
  statsElement.innerHTML = `
    <div><span class="label">Organisms:</span> ${organisms.length}/${
    CONFIG.maxOrganisms
  }</div>
    <div><span class="label">Runtime:</span> ${padZero(minutes)}:${padZero(
    seconds
  )}</div>
    <div><span class="label">Dominant Glyph:</span> ${dominantType}</div>
    <div><span class="label">Dominant Script:</span> ${scriptDisplayNames[dominantScript] || dominantScript}</div>
    <div><span class="label">Script Diversity:</span> ${scriptDiversity} writing systems</div>
    <div><span class="label">Generations:</span> ${
      metadata.generationCount
    }</div>
    <div><span class="label">Interactions:</span> ${
      metadata.interactionCount
    }</div>
    <div><span class="label">System Complexity:</span> ${floor(
      metadata.systemComplexity
    )}%</div>
    <div><span class="label">3D Mode:</span> Active</div>
    <div><span class="label">Average Depth:</span> ${floor(
      averageDepth()
    )}z</div>
  `;
}

// Helper to calculate average depth position of all organisms
function averageDepth() {
  if (organisms.length === 0) return 0;

  let totalDepth = organisms.reduce((sum, org) => sum + org.pos.z, 0);
  return totalDepth / organisms.length;
}

// Helper for consistent stats formatting
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper to zero-pad numbers
function padZero(num) {
  return num.toString().padStart(2, "0");
}

// Create noise texture for artistic grain effect
function createNoiseTexture() {
  noiseTexture = createGraphics(width, height);
  noiseTexture.loadPixels();

  for (let i = 0; i < noiseTexture.pixels.length; i += 4) {
    // Create subtle analog-like noise pattern
    let grainValue = 235 + random(-20, 20);
    noiseTexture.pixels[i] = grainValue;
    noiseTexture.pixels[i + 1] = grainValue;
    noiseTexture.pixels[i + 2] = grainValue;
    noiseTexture.pixels[i + 3] = random(5, 15); // Very subtle opacity
  }

  noiseTexture.updatePixels();
}

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Configure 3D settings
  perspective(PI / 3.0, width / height, 10, CONFIG.renderDistance);

  // Regenerate field lines for new dimensions
  ecosystem.generateFieldLines();

  // Recreate noise texture
  createNoiseTexture();
}

// Add applyPostProcessing function after the drawEnvironment function
function applyPostProcessing() {
  // Advanced post-processing for 3D mode
  push();

  // Draw a subtle vignette overlay on top of everything
  // We'll use a plane in 3D space for this
  noLights(); // Disable lighting for this effect
  camera(); // Reset camera temporarily

  // Vignette effect using p5.js native approach instead of drawingContext
  push();
  noStroke();
  translate(0, 0, 1000); // In front of everything

  // Create a custom shader-like vignette effect with concentric shapes
  let vignetteStrength = 0.3; // Max opacity of the vignette
  let steps = 8; // Number of concentric shapes for gradient

  for (let i = steps; i >= 0; i--) {
    let ratio = i / steps;
    let alpha = map(ratio, 1, 0, 0, vignetteStrength);

    fill(0, 0, 0, 255 * alpha);
    let size = map(ratio, 0, 1, width * 2, width / 6);
    ellipse(0, 0, size, size);
  }
  pop();

  // Subtle chromatic aberration in 3D space
  if (CONFIG.postFx && frameCount % 2 === 0) {
    // Only every other frame for performance
    push();
    blendMode(SCREEN);
    noStroke();

    let shift = sin(frameCount * 0.01) * 2 + 2;

    // Red offset layer
    push();
    translate(shift, 0, 990);
    fill(255, 0, 0, 20);
    plane(width * 2, height * 2);
    pop();

    // Blue offset layer
    push();
    translate(-shift, 0, 990);
    fill(0, 0, 255, 20);
    plane(width * 2, height * 2);
    pop();

    pop();
  }

  // Subtle noise texture overlay
  if (noiseTexture && frameCount % 3 === 0) {
    push();
    blendMode(MULTIPLY);
    noLights();
    camera();
    translate(0, 0, 980);
    // Use tint instead of drawingContext.globalAlpha
    tint(255, 20); // Set opacity to 8%
    texture(noiseTexture);
    plane(width, height);
    noTint(); // Reset tint
    pop();
  }

  pop();
}

// Add processCamera function after the applyPostProcessing function
function processCamera() {
  // Skip if video not ready
  if (!cameraInteraction.video || !cameraInteraction.video.loadedmetadata)
    return;

  // Get current frame
  cameraInteraction.video.loadPixels();

  // Skip if pixels not ready
  if (!cameraInteraction.video.pixels) return;

  // Reset detection points
  cameraInteraction.detectionPoints = [];

  // Sample pixels at lower resolution for performance
  const sampleStep = 10;
  const videoWidth = cameraInteraction.video.width;
  const videoHeight = cameraInteraction.video.height;

  // Process pixels to detect motion
  let motionDetected = false;

  for (let y = 0; y < videoHeight; y += sampleStep) {
    for (let x = 0; x < videoWidth; x += sampleStep) {
      const i = (y * videoWidth + x) * 4;

      // Calculate average RGB value as simple brightness
      const currBrightness =
        (cameraInteraction.video.pixels[i] +
          cameraInteraction.video.pixels[i + 1] +
          cameraInteraction.video.pixels[i + 2]) /
        3;

      const prevBrightness =
        (cameraInteraction.previousPixels[i] +
          cameraInteraction.previousPixels[i + 1] +
          cameraInteraction.previousPixels[i + 2]) /
        3;

      // Detect significant changes
      const diff = abs(currBrightness - prevBrightness);

      if (diff > cameraInteraction.motionThreshold) {
        motionDetected = true;

        // Map to canvas coordinates
        const canvasX = map(x, 0, videoWidth, -width / 2, width / 2);
        const canvasY = map(y, 0, videoHeight, -height / 2, height / 2);

        // Store detection point
        cameraInteraction.detectionPoints.push({
          x: canvasX,
          y: canvasY,
          intensity: diff,
        });

        // Add organisms based on motion with rate limiting
        if (
          random() < 0.05 &&
          millis() - cameraInteraction.lastMotionTime > 200
        ) {
          createOrganism(canvasX, canvasY);
          cameraInteraction.lastMotionTime = millis();
        }
      }
    }
  }

  // Update previous pixels with current frame
  if (frameCount % 2 === 0) {
    for (let i = 0; i < cameraInteraction.previousPixels.length; i++) {
      cameraInteraction.previousPixels[i] = cameraInteraction.video.pixels[i];
    }
  }
}

// Add displayCameraDebug function after the processCamera function
function displayCameraDebug() {
  // Display camera debug visualization in 3D space
  push();
  // Reset camera temporarily for HUD-like display
  camera();
  // Draw in front
  translate(0, 0, 900);

  // Draw camera feed as reference
  if (cameraInteraction.video) {
    push();
    translate(-width / 2 + 80, -height / 2 + 60);
    noStroke();
    // Convert the video to texture for WebGL
    texture(cameraInteraction.video);
    plane(160, 120);
    pop();
  }

  // Visualize motion detection points in 3D
  for (let i = 0; i < cameraInteraction.detectionPoints.length; i++) {
    let pt = cameraInteraction.detectionPoints[i];
    let intensity = map(pt.intensity, 0, 255, 0, 1);

    push();
    translate(pt.x, pt.y, 910);
    noStroke();
    fill(255, 0, 0, 150 * intensity);
    sphere(3 * intensity);
    pop();
  }

  pop();
}

// The resetCamera and zoomCamera functions are already defined and exposed to window object

// Helper function to check if mouse is over UI elements
function isMouseOverUI() {
  // Check if mouse is over any UI elements
  // Return true if over UI, false otherwise
  let controlsEl = document.getElementById("controls");
  let infoEl = document.getElementById("info-panel");
  let qrEl = document.getElementById("qr-code");
  let cameraEl = document.querySelector(".camera-controls");

  if (!controlsEl || !infoEl || !qrEl || !cameraEl) return false;

  // Convert canvas coordinates to window coordinates for correct hit testing
  let canvasElement = document.querySelector("canvas");
  if (!canvasElement) return false;
  
  let canvasRect = canvasElement.getBoundingClientRect();
  let mouseXWindow = (mouseX / width) * canvasRect.width + canvasRect.left;
  let mouseYWindow = (mouseY / height) * canvasRect.height + canvasRect.top;

  // Check each UI element
  return (
    isPointInRect(mouseXWindow, mouseYWindow, controlsEl.getBoundingClientRect()) ||
    isPointInRect(mouseXWindow, mouseYWindow, infoEl.getBoundingClientRect()) ||
    isPointInRect(mouseXWindow, mouseYWindow, qrEl.getBoundingClientRect()) ||
    isPointInRect(mouseXWindow, mouseYWindow, cameraEl.getBoundingClientRect())
  );
}

// Helper function to check if a point is inside a rectangle
function isPointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// ENHANCED: Function to draw the Focus/Resonance tool's visual representation with improved visual effects
function drawFocusResonanceVisual() {
  if (focusResonanceActive && focusResonancePosition) {
    // NEW: Add 3D effect for right-click interaction
    let useExtraEffects = mouseButton === RIGHT; // Enable enhanced effects when using right mouse button
    
    push(); // p5.js state saving
    
    // Add 3D lighting for better visual depth
    ambientLight(50, 50, 60);
    pointLight(255, 255, 255, 
               focusResonancePosition.x + 100, 
               focusResonancePosition.y - 100, 
               focusResonancePosition.z + 100);

    // Reset p5.js transformations to ensure we are in a predictable state
    resetMatrix();
    
    // Re-apply camera for p5.js context
    // This is crucial if Three.js has altered the WebGL state
    let finalEyeX, finalEyeY, finalEyeZ;
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;
    finalEyeY = cameraZoom * sin(cameraRotation.x);
    const radiusOnXZPlane = cameraZoom * cos(cameraRotation.x);
    finalEyeX = radiusOnXZPlane * sin(cameraRotation.y);
    finalEyeZ = radiusOnXZPlane * cos(cameraRotation.y);
    camera(finalEyeX, finalEyeY, finalEyeZ, centerX, centerY, centerZ, 0, 1, 0);

    translate(focusResonancePosition.x, focusResonancePosition.y, focusResonancePosition.z);
    
    // Enhanced: Create a more complex pulsing effect with overlaid sine waves
    let primaryPulseSpeed = CONFIG.wordSettings.focusResonancePulseSpeed || 0.05;
    let secondaryPulseSpeed = primaryPulseSpeed * 1.7;
    let primaryPulse = map(sin(frameCount * primaryPulseSpeed), -1, 1, 0.85, 1.15);
    let secondaryPulse = map(sin(frameCount * secondaryPulseSpeed), -1, 1, -0.05, 0.05);
    let displayRadius = focusResonanceRadius * (primaryPulse + secondaryPulse);
    
    // Get color from palette with enhanced visual appearance
    let color = selectedPalette ? selectedPalette[3] : [180, 220, 255]; // Slightly brighter blue
    
    // Draw more layers for a richer visual effect
    for (let i = 0; i < 5; i++) { // Increased from 3 to 5 layers
      push();
      
      // Enhanced rotation patterns for more organic movement
      rotateX(frameCount * 0.01 * (i * 0.3 + 0.5) + sin(frameCount * 0.003) * 0.2);
      rotateY(frameCount * 0.015 * (i * 0.2 + 0.7) + cos(frameCount * 0.004) * 0.15);
      rotateZ(frameCount * 0.008 * (i * 0.4 + 0.3));
      
      // Different opacity with enhanced visibility for better user feedback
      let opacity = map(i, 0, 4, 170, 50); // Increased from 150-60 to 170-50
      
      // Alternate between filled and wireframe spheres for a more interesting look
      if (i % 2 === 0) {
        fill(color[0], color[1], color[2], opacity * 0.2);
        stroke(color[0], color[1], color[2], opacity);
        strokeWeight(1.0 - (i * 0.15));
  } else {
        noFill();
        // Use a slightly different color for alternating layers
        let altColor = [color[0] - 20, color[1] + 10, color[2] + 20];
        stroke(altColor[0], altColor[1], altColor[2], opacity);
        strokeWeight(0.8 - (i * 0.1));
      }
      
      // More varied sizes for nested effect with greater visual depth
      let layerScale = map(i, 0, 4, 0.9, 1.4); // Changed from 1.0-1.3 to 0.9-1.4
      
      // Draw sphere with appropriate detail level and enhanced 3D appearance
      if (i === 0) {
        // Higher detail for the innermost sphere with specular material
        specularMaterial(color[0], color[1], color[2], opacity * 0.3);
        shininess(30);
        sphere(displayRadius * layerScale, 16, 16);
      } else {
        if (i % 2 === 0) {
          // Use specular material for even layers
          specularMaterial(color[0], color[1], color[2], opacity * 0.2);
          shininess(20);
        }
        sphere(displayRadius * layerScale, 12, 12);
      }
      
      pop();
    }
    
    // Enhanced central glow with layered approach for more depth
    // Inner core glow
    fill(color[0] + 30, color[1] + 30, color[2] + 30, 40); // Brighter core
    noStroke();
    sphere(displayRadius * 0.7);
    
    // Middle glow layer
    fill(color[0] + 15, color[1] + 15, color[2] + 15, 25);
    sphere(displayRadius * 1.0);
    
    // Outer glow layer
    fill(color[0], color[1], color[2], 15);
    sphere(displayRadius * 1.5);
    
    // Add subtle particles with two distinct particle systems for a richer effect
    // Primary particle system
    drawEnergyParticles(displayRadius, color);
    
    // Secondary particle system with different timing and color
    let secondaryColor = [color[0] - 30, color[1] + 20, color[2] + 50]; // More blue-shifted
    drawEnergyParticles(displayRadius * 0.8, secondaryColor, frameCount * 1.5, 8); // Additional particles
    
    // NEW: Enhanced visual effects for right-click word formation
    if (useExtraEffects) {
      // Add magnetic field-like effect
      push();
      noFill();
      rotateY(frameCount * 0.01);
      rotateX(frameCount * 0.005);
      
      // Pulsing magnetic field lines
      for (let i = 0; i < 8; i++) {
        let ringOpacity = map(sin(frameCount * 0.05 + i), -1, 1, 60, 120);
        stroke(230, 230, 255, ringOpacity);
        strokeWeight(0.8);
        
        // Draw rings with slight variations
        let ringSize = displayRadius * (1.2 + i * 0.1);
        let deform = sin(frameCount * 0.03 + i) * 0.2;
        
        // Create elliptical rings to simulate magnetic field
        push();
        rotateX(HALF_PI * 0.2 * (i/8));
        rotateZ(i * 0.2);
        ellipse(0, 0, ringSize * (1 + deform), ringSize * (1 - deform));
        pop();
      }
      
      // Add connecting lines to nearby organisms
      nearbyOrganisms = organisms.filter(org => {
        const distance = dist(org.pos.x, org.pos.y, org.pos.z, 
                             focusResonancePosition.x, focusResonancePosition.y, focusResonancePosition.z);
        return distance < focusResonanceRadius;
      });
      
      // Only draw lines to organisms that match the current script highlight filter
      const filteredOrganisms = nearbyOrganisms.filter(org => {
        if (highlightedScriptCategory === "all_white") return true;
        return org.scriptCategory === highlightedScriptCategory;
      });
      
      // Draw connection lines
      filteredOrganisms.forEach(org => {
        let distance = dist(org.pos.x, org.pos.y, org.pos.z, 
                           focusResonancePosition.x, focusResonancePosition.y, focusResonancePosition.z);
        
        let connectionOpacity = map(distance, 0, focusResonanceRadius, 200, 50);
        strokeWeight(3);
        
        // Create lightning-like effect
        let steps = floor(map(distance, 0, focusResonanceRadius, 3, 8));
        let prevX = focusResonancePosition.x;
        let prevY = focusResonancePosition.y;
        let prevZ = focusResonancePosition.z;
        
        // Gold/yellow energy line
        for (let s = 0; s <= steps; s++) {
          let t = s / steps;
          let nextX = lerp(focusResonancePosition.x, org.pos.x, t) + (s > 0 && s < steps ? random(-5, 5) : 0);
          let nextY = lerp(focusResonancePosition.y, org.pos.y, t) + (s > 0 && s < steps ? random(-5, 5) : 0);
          let nextZ = lerp(focusResonancePosition.z, org.pos.z, t) + (s > 0 && s < steps ? random(-5, 5) : 0);
          
          // Outer glow (wider, less opacity)
          stroke(255, 220, 100, connectionOpacity * 0.3);
          strokeWeight(4);
          line(prevX, prevY, prevZ, nextX, nextY, nextZ);
          
          // Inner core (thinner, more opacity)
          stroke(255, 240, 180, connectionOpacity);
          strokeWeight(1.5);
          line(prevX, prevY, prevZ, nextX, nextY, nextZ);
          
          prevX = nextX;
          prevY = nextY;
          prevZ = nextZ;
        }
      });
      
      pop();
    }
    
    // Add a subtle pulsing light at the very center
    let centerPulse = (sin(frameCount * 0.08) * 0.5 + 0.5);
    
    // Enhanced central light with 3D effects
    push();
    noStroke();
    ambientMaterial(255, 255, 255, 80 * centerPulse);
    specularMaterial(255, 255, 255, 200 * centerPulse);
    shininess(100);
    sphere(15 + 10 * centerPulse, 12, 12);
    pop();
    
    // Add depth indicator line to show 3D position more clearly
    push();
    stroke(255, 255, 255, 40);
    strokeWeight(1);
    line(0, 0, 0, 0, 0, -500); // Line extending in z-direction
    
    // Add subtle ground reflection/shadow
    translate(0, 0, -focusResonancePosition.z);
    noStroke();
    fill(color[0], color[1], color[2], 20);
    ellipse(0, 0, displayRadius * 1.2, displayRadius * 0.6);
    pop();
    
    pop(); // Restore p5.js state
  }
}

// Helper function to draw energy particles around the focus/resonance sphere
function drawEnergyParticles(radius, baseColor) {
  let particleCount = CONFIG.wordSettings.focusResonanceParticles || 12; // Get from config or use default
  
  push();
  noStroke();
  
  // Create a rotation effect independent of the wireframe's rotation
  rotateY(frameCount * 0.01);
  rotateX(frameCount * 0.007);
  
  for (let i = 0; i < particleCount; i++) {
    // Position particles in a spherical pattern
    let theta = map(i, 0, particleCount, 0, TWO_PI) + (frameCount * 0.02);
    let phi = map(sin(frameCount * 0.01 + i), -1, 1, 0, PI);
    
    // Calculate position on sphere
    let x = radius * 1.1 * sin(phi) * cos(theta);
    let y = radius * 1.1 * sin(phi) * sin(theta);
    let z = radius * 1.1 * cos(phi);
    
    // Particle size pulsation
    let particleSize = map(sin(frameCount * 0.1 + i * 0.5), -1, 1, 2, 5);
    
    // Color with slight variation
    let colorVariation = sin(frameCount * 0.05 + i) * 20;
    fill(
      constrain(baseColor[0] + colorVariation, 0, 255),
      constrain(baseColor[1] + colorVariation, 0, 255), 
      constrain(baseColor[2] + colorVariation, 0, 255), 
      100
    );
    
    push();
    translate(x, y, z);
    // Draw a simple particle sphere
    sphere(particleSize);
    pop();
  }
  
  pop();
}

// NEW: Get 3D position from mouse coordinates
function mousePositionTo3D() {
  // Convert mouse from screen coordinates to p5.js coordinates
  const mousePos = createVector(mouseX - width / 2, mouseY - height / 2);
  
  // Calculate camera position based on current rotation and zoom
  const cameraPos = createVector(
    cameraZoom * cos(cameraRotation.x) * sin(cameraRotation.y),
    cameraZoom * sin(cameraRotation.x),
    cameraZoom * cos(cameraRotation.x) * cos(cameraRotation.y)
  );
  
  // Calculate the camera's forward direction
  const cameraDir = createVector(
    -sin(cameraRotation.y) * cos(cameraRotation.x),
    -sin(cameraRotation.x),
    -cos(cameraRotation.y) * cos(cameraRotation.x)
  );
  
  // Calculate camera's right and up vectors to form a coordinate system
  const cameraRight = createVector(cos(cameraRotation.y), 0, -sin(cameraRotation.y));
  const cameraUp = p5.Vector.cross(cameraRight, cameraDir);
  cameraUp.normalize();
  
  // Project the mouse position into 3D space
  // First, scale the mouse coordinates based on camera distance
  const scaleFactor = cameraZoom / 500; // Adjust factor based on your scene scale
  const projectedX = mousePos.x * scaleFactor;
  const projectedY = mousePos.y * scaleFactor;
  
  // Find nearby organisms to determine a reasonable depth
  // This helps place the focus point at a depth that makes sense in context
  let closestOrganism = null;
  let closestDist = Infinity;
  
  // Find organism closest to mouse position in screen space
  for (const organism of organisms) {
    // Project organism position to screen space
    const orgScreenPos = projectPoint(organism.pos.x, organism.pos.y, organism.pos.z);
    const dist2D = p5.Vector.dist(mousePos, orgScreenPos);
    
    if (dist2D < closestDist) {
      closestDist = dist2D;
      closestOrganism = organism;
    }
  }
  
  // Default depth if no organisms are found
  let targetDepth = 0;
  
  // If we found a nearby organism, use its depth
  if (closestOrganism && closestDist < 150) {
    targetDepth = closestOrganism.pos.z;
  } else {
    // Otherwise, use average depth of all organisms or a default value
    targetDepth = averageDepth();
  }
  
  // Calculate 3D position using the camera's coordinate system
  const result = p5.Vector.add(
    cameraPos,
    p5.Vector.mult(cameraDir, -cameraZoom)
  );
  
  // Apply the mouse offsets in camera's coordinate space
  result.add(p5.Vector.mult(cameraRight, projectedX));
  result.add(p5.Vector.mult(cameraUp, projectedY));
  
  // Adjust the depth to be more natural
  const cameraToResult = p5.Vector.sub(result, cameraPos);
  const currentDist = cameraToResult.mag();
  cameraToResult.normalize();
  
  // Find intersection with a plane at target depth perpendicular to camera view
  const t = (targetDepth - cameraPos.z) / cameraDir.z;
  if (!isNaN(t) && isFinite(t) && t > 0) {
    return p5.Vector.add(
      cameraPos, 
      p5.Vector.mult(cameraDir, t)
    );
  }
  
  // Fallback: use a reasonable point in 3D space
  return p5.Vector.add(
    cameraPos,
    p5.Vector.mult(cameraToResult, currentDist)
  );
}

// NEW: Function to draw and update letter flow
function drawLetterFlow() {
    // Use THREE.js to render text
    for (let i = 0; i < letterOrgData.length; i++) {
        const letterData = letterOrgData[i];
        
        // Update position with physics-based movement (3D spring forces)
        const distX = letterData.destX - letterData.x;
        const distY = letterData.destY - letterData.y;
        const distZ = letterData.destZ - letterData.z;
        
        // Calculate distance to destination for adaptive spring strength
        const distTotal = Math.sqrt(distX*distX + distY*distY + distZ*distZ);
        
        // Adaptive spring constant - stronger when further away
        const springFactor = map(distTotal, 0, 500, 0.0005, 0.002);
        
        // Apply spring forces
        letterData.xVel += distX * springFactor;
        letterData.yVel += distY * springFactor;
        letterData.zVel += distZ * springFactor;
        
        // Apply damping (more realistic physics)
        const dampingFactor = 0.98;
        letterData.xVel *= dampingFactor;
        letterData.yVel *= dampingFactor;
        letterData.zVel *= dampingFactor;
        
        // Update positions
        letterData.x += letterData.xVel;
        letterData.y += letterData.yVel;
        letterData.z += letterData.zVel;
        
        // Update rotations - gentle spinning for 3D effect
        if (!letterData.rotX) letterData.rotX = 0;
        if (!letterData.rotY) letterData.rotY = 0;
        if (!letterData.rotZ) letterData.rotZ = 0;
        
        // Continue rotation based on initial rotation speeds
        letterData.rotX += letterData.rotationX || 0;
        letterData.rotY += letterData.rotationY || 0;
        letterData.rotZ += letterData.rotationZ || 0;
        
        // When approaching target, slow down the rotation
        const arrivalDistance = 50;
        if (distTotal < arrivalDistance) {
            const slowFactor = map(distTotal, 0, arrivalDistance, 0.95, 0.999);
            letterData.rotationX *= slowFactor;
            letterData.rotationY *= slowFactor;
            letterData.rotationZ *= slowFactor;
        }
        
        // These are already world coordinates in THREE.js space
        const worldX = letterData.x;
        const worldY = letterData.y;
        const worldZ = letterData.z;
        
        // Create text geometry for the letter if it doesn't exist yet
        if (!letterData.mesh) {
            try {
                // Always use the default helvetiker font which we know works
                const font = loadedFonts['default'];
                
                // Check if default font is loaded AND is a valid THREE.Font
                if (font && typeof font.generateShapes === 'function') {
                    // Create text geometry
                    const textGeometry = new THREE.TextGeometry(letterData.letter, {
                        font: font,
                        size: letterData.size,
                        height: letterData.size/4,  // More pronounced 3D extrusion
                        curveSegments: 6,          // Higher quality curves
                        bevelEnabled: true,         // Enable beveling for 3D look
                        bevelThickness: letterData.size/20,
                        bevelSize: letterData.size/40,
                        bevelSegments: 3
                    });
                    
                    // Center the text geometry in all dimensions
                    textGeometry.computeBoundingBox();
                    const centerOffsetX = -0.5 * (
                        textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x
                    );
                    const centerOffsetY = -0.5 * (
                        textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y
                    );
                    const centerOffsetZ = -0.5 * (
                        textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z
                    );
                    
                    // Create white material for all letters
                    const material = new THREE.MeshPhongMaterial({ 
                        color: 0xFFFFFF,  // White color for all letters
                        transparent: true,
                        opacity: 0.9,
                        shininess: 40,
                        specular: 0x333333
                    });
                    
                    // Create mesh and position it
                    const textMesh = new THREE.Mesh(textGeometry, material);
                    textMesh.position.set(
                        worldX + centerOffsetX,
                        worldY + centerOffsetY,
                        worldZ + centerOffsetZ
                    );
                    
                    // Apply rotations
                    textMesh.rotation.x = letterData.rotX;
                    textMesh.rotation.y = letterData.rotY;
                    textMesh.rotation.z = letterData.rotZ;
                    
                    // Cast shadows for better 3D appearance
                    textMesh.castShadow = true;
                    textMesh.receiveShadow = true;
                    
                    // Add to scene
                    threeScene.add(textMesh);
                    letterData.mesh = textMesh;
                } else {
                    // If default font isn't ready or valid, use geometric shapes as fallbacks
                    let geometry;
                    
                    // Use shapes based on script category
                    switch (letterData.scriptCategory) {
                        case "latin":
                            geometry = new THREE.BoxGeometry(
                                letterData.size, letterData.size, letterData.size/4
                            );
                            break;
                        case "greek":
                            geometry = new THREE.SphereGeometry(
                                letterData.size/2, 12, 12
                            );
                            break;
                        case "numbers":
                            geometry = new THREE.CylinderGeometry(
                                letterData.size/2, letterData.size/2, letterData.size, 12
                            );
                            break;
                        case "punctuation":
                            geometry = new THREE.TorusGeometry(
                                letterData.size/2, letterData.size/6, 12, 18
                            );
                            break;
                        default:
                            geometry = new THREE.TetrahedronGeometry(letterData.size/2, 2);
                    }
                    
                    // Determine color based on highlighting mode
                    let scriptColor;
                    if (highlightedScriptCategory === "all_white") {
                        // All white in default mode
                        scriptColor = 0xFFFFFF;
                    } else if (letterData.scriptCategory === highlightedScriptCategory) {
                        // Use script highlight color when it matches the current highlight
                        const highlightColor = SCRIPT_HIGHLIGHT_COLORS[letterData.scriptCategory];
                        if (highlightColor && Array.isArray(highlightColor) && highlightColor.length >= 3) {
                            // Convert RGB array to hex
                            scriptColor = (highlightColor[0] << 16) | (highlightColor[1] << 8) | highlightColor[2];
                        } else {
                            scriptColor = 0xFFFFFF; // White fallback
                        }
                    } else {
                        // White for non-highlighted scripts
                        scriptColor = 0xFFFFFF;
                    }
                    const material = new THREE.MeshPhongMaterial({ 
                        color: scriptColor,  // Color based on script category
                        transparent: true,
                        opacity: 0.9,
                        shininess: 30,
                        specular: 0x333333
                    });
                    
                    const shapeMesh = new THREE.Mesh(geometry, material);
                    shapeMesh.position.set(worldX, worldY, worldZ);
                    
                    // Apply rotations
                    shapeMesh.rotation.x = letterData.rotX;
                    shapeMesh.rotation.y = letterData.rotY;
                    shapeMesh.rotation.z = letterData.rotZ;
                    
                    // Cast shadows
                    shapeMesh.castShadow = true;
                    shapeMesh.receiveShadow = true;
                    
                    // Add to scene
                    threeScene.add(shapeMesh);
                    letterData.mesh = shapeMesh;
                    letterData.isFallback = true;
                    
                    // Try again later if this is a fallback - flag for replacement
                    letterData.needsReplacement = true;
                }
            } catch (error) {
                console.warn("Error creating letter mesh:", error);
                // Create a simple fallback cube
                const cubeGeometry = new THREE.BoxGeometry(
                    letterData.size/2, letterData.size/2, letterData.size/2
                );
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0xFFFFFF,  // Pure white for all fallbacks
                    transparent: true, 
                    opacity: 0.8
                });
                const cubeMesh = new THREE.Mesh(cubeGeometry, material);
                cubeMesh.position.set(worldX, worldY, worldZ);
                threeScene.add(cubeMesh);
                letterData.mesh = cubeMesh;
                letterData.isFallback = true;
            }
        } else {
            // Update existing mesh position
            letterData.mesh.position.set(worldX, worldY, worldZ);
            
            // Update rotation for 3D movement
            letterData.mesh.rotation.x = letterData.rotX;
            letterData.mesh.rotation.y = letterData.rotY;
            letterData.mesh.rotation.z = letterData.rotZ;
            
            // If this is a fallback representation and fonts are now loaded,
            // attempt to replace with the actual text geometry
            if (letterData.needsReplacement && frameCount % 30 === 0) {
                const font = loadedFonts['default'];
                
                if (font && typeof font.generateShapes === 'function') {
                    try {
                        // Remove the old fallback mesh
                        threeScene.remove(letterData.mesh);
                        
                        // Create proper text geometry with 3D features
                        const textGeometry = new THREE.TextGeometry(letterData.letter, {
                            font: font,
                            size: letterData.size,
                            height: letterData.size/4,      // More pronounced 3D extrusion
                            curveSegments: 6,              // Higher quality curves
                            bevelEnabled: true,            // Enable beveling for 3D look
                            bevelThickness: letterData.size/20,
                            bevelSize: letterData.size/40,
                            bevelSegments: 3
                        });
                        
                        // Center the text geometry in all dimensions
                        textGeometry.computeBoundingBox();
                        const centerOffsetX = -0.5 * (
                            textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x
                        );
                        const centerOffsetY = -0.5 * (
                            textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y
                        );
                        const centerOffsetZ = -0.5 * (
                            textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z
                        );
                        
                        // Determine color based on highlighting mode
                        let scriptColor;
                        if (highlightedScriptCategory === "all_white") {
                            // All white in default mode
                            scriptColor = 0xFFFFFF;
                        } else if (letterData.scriptCategory === highlightedScriptCategory) {
                            // Use script highlight color when it matches the current highlight
                            const highlightColor = SCRIPT_HIGHLIGHT_COLORS[letterData.scriptCategory];
                            if (highlightColor && Array.isArray(highlightColor) && highlightColor.length >= 3) {
                                // Convert RGB array to hex
                                scriptColor = (highlightColor[0] << 16) | (highlightColor[1] << 8) | highlightColor[2];
                            } else {
                                scriptColor = 0xFFFFFF; // White fallback
                            }
                        } else {
                            // White for non-highlighted scripts
                            scriptColor = 0xFFFFFF;
                        }
                        const material = new THREE.MeshPhongMaterial({ 
                            color: scriptColor,  // Color based on script category
                            transparent: true,
                            opacity: 0.9,
                            shininess: 40,
                            specular: 0x333333
                        });
                        
                        const textMesh = new THREE.Mesh(textGeometry, material);
                        textMesh.position.set(
                            worldX + centerOffsetX,
                            worldY + centerOffsetY,
                            worldZ + centerOffsetZ
                        );
                        
                        // Transfer rotation
                        textMesh.rotation.x = letterData.rotX;
                        textMesh.rotation.y = letterData.rotY;
                        textMesh.rotation.z = letterData.rotZ;
                        
                        // Cast shadows
                        textMesh.castShadow = true;
                        textMesh.receiveShadow = true;
                        
                        threeScene.add(textMesh);
                        letterData.mesh = textMesh;
                        letterData.needsReplacement = false;
                        letterData.isFallback = false;
                    } catch (e) {
                        console.warn("Failed to replace fallback:", e);
                    }
                }
            }
        }
    }
}

// Helper function to get color for script category
function getColorForScript(scriptCategory) {
    // Fallback color map if selectedPalette is not available
    const colorMap = {
        "latin": 0x3498db,      // blue
        "greek": 0xe74c3c,      // red
        "numbers": 0x2ecc71,    // green
        "punctuation": 0x9b59b6, // purple
        "default": 0xbdc3c7     // silver
    };
    
    // Use colors from the current palette if available
    if (selectedPalette && selectedPalette.length > 0) {
        try {
            // Create a consistent mapping from script categories to palette indices
            // Get a hash-like number from the category string
            const getStringHash = (str) => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) - hash) + str.charCodeAt(i);
                    hash = hash & hash; // Convert to 32bit integer
                }
                return Math.abs(hash); // Ensure positive number
            };
            
            // Deterministically map each category to a palette color
            const categoryHash = getStringHash(scriptCategory);
            const paletteIndex = categoryHash % selectedPalette.length;
            
            // Convert p5 color array to hex
            const color = selectedPalette[paletteIndex];
            if (Array.isArray(color) && color.length >= 3) {
                return (color[0] << 16) | (color[1] << 8) | color[2];
            }
        } catch (e) {
            console.warn("Error using palette color:", e);
        }
    }
    
    // Fallback to fixed colors
    return colorMap[scriptCategory] || colorMap.default;
}



