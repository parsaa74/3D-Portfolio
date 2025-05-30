/**
 * @class AudioManager
 * @description Handles loading, playback, and management of audio assets using Tone.js.
 *              Architected for generative, reactive soundscapes.
 */
import * as Tone from 'tone';

// === Just Intonation Ratios for Drone Voices ===
const JUST_RATIOS = [1, 5/4, 3/2, 7/4]; // Unison, major third, perfect fifth, harmonic seventh
const ROOT_CYCLE = [65.406, 69.296, 77.782, 87.307]; // C2, D♭2, E♭2, F2 (Hz)
const ROOT_GLIDE_TIME = 8; // seconds for smooth root transitions
const ROOT_SHIFT_MIN = 60; // seconds
const ROOT_SHIFT_MAX = 180; // seconds

function createDroneVoice(rootFreq, ratio, lfoSettings, reverb, output) {
  // Voice frequency
  const freq = rootFreq * ratio;
  // Oscillator
  const osc = new Tone.Oscillator({
    frequency: freq,
    type: 'sine',
    volume: -18
  });
  // Amplitude
  const gain = new Tone.Gain(0.15);
  // Spatialization
  const pan = new Tone.Panner3D({
    panningModel: 'HRTF',
    positionX: Math.random() * 6 - 3,
    positionY: Math.random() * 2 - 1,
    positionZ: Math.random() * 6 - 3
  });
  // Filter
  const filter = new Tone.Filter(800, 'lowpass').set({ Q: 0.7 });
  // LFOs
  const ampLFO = new Tone.LFO(lfoSettings.ampRate, 0.05, 0.2);
  ampLFO.connect(gain.gain);
  const panLFO = new Tone.LFO(lfoSettings.panRate, -2, 2);
  panLFO.connect(pan.positionX);
  const filterLFO = new Tone.LFO(lfoSettings.filterRate, 400, 1200);
  filterLFO.connect(filter.frequency);
  // Chain
  osc.chain(gain, pan, filter, reverb, output);
  return { osc, gain, pan, filter, ampLFO, panLFO, filterLFO, ratio };
}

export class AudioManager {
  constructor() {
    console.log("AudioManager (DroneArt): Initializing...");
    
    // Initialize state variables
    this.droneVoices = [];
    this.rootIndex = 0;
    this.rootFreq = ROOT_CYCLE[this.rootIndex];
    this.rootShiftTimer = null;
    this.isActive = false;
    this.playerSpeed = 0;
    this.zone = 'default';
    this.isInitialized = false;
    
    // Defer audio initialization until user interaction
    this.toneContext = null;
    this.masterLimiter = null;
    this.masterReverb = null;
  }

  _initVoices() {
    this.droneVoices = [];
    for (let i = 0; i < JUST_RATIOS.length; i++) {
      const lfoSettings = {
        ampRate: 0.02 + Math.random() * 0.04, // 0.02–0.06 Hz
        panRate: 0.01 + Math.random() * 0.03, // 0.01–0.04 Hz
        filterRate: 0.015 + Math.random() * 0.03 // 0.015–0.045 Hz
      };
      const voice = createDroneVoice(this.rootFreq, JUST_RATIOS[i], lfoSettings, this.masterReverb, Tone.Destination);
      this.droneVoices.push(voice);
    }
  }

  /**
   * Initialize audio components - called only after user interaction
   */
  async _initializeAudio() {
    if (this.isInitialized) return true;
    
    try {
      this.toneContext = Tone.getContext();
      this.masterLimiter = new Tone.Limiter(-1).toDestination();
      this.masterReverb = new Tone.Reverb({ decay: 7, preDelay: 0.04, wet: 0.4 }).connect(this.masterLimiter);
      
      // Pre-create voices (but don't connect yet)
      this._initVoices();
      
      this.isInitialized = true;
      console.log("AudioManager: Audio components initialized successfully");
      return true;
    } catch (error) {
      console.error("AudioManager: Failed to initialize audio components:", error);
      return false;
    }
  }

  /**
   * Resume the AudioContext after user interaction
   * Must be called in response to a user gesture (click, tap, keypress)
   */
  async resumeAudioContext() {
    try {
      // Initialize audio components if not already done
      await this._initializeAudio();
      
      await Tone.start();
      console.log("AudioContext resumed successfully after user gesture");
      return true;
    } catch (error) {
      console.error("Failed to resume AudioContext:", error);
      return false;
    }
  }

  async startDroneInstallation() {
    if (this.isActive) return;
    
    // Initialize audio if not already done
    if (!this.isInitialized) {
      const initialized = await this._initializeAudio();
      if (!initialized) {
        console.error("Cannot start drone installation - audio initialization failed");
        return false;
      }
    }
    
    // First ensure AudioContext is running
    const audioContextState = Tone.getContext().state;
    if (audioContextState !== "running") {
      console.log("AudioContext not running, attempting to resume...");
      try {
        await this.resumeAudioContext();
      } catch (error) {
        console.error("Could not resume AudioContext:", error);
        return false;
      }
    }
    
    this.isActive = true;
    // Connect and start all voices
    for (const v of this.droneVoices) {
      v.osc.start();
      v.ampLFO.start();
      v.panLFO.start();
      v.filterLFO.start();
    }
    this._scheduleRootShift();
    console.log("Drone installation started.");
    return true;
  }

  stopDroneInstallation() {
    if (!this.isActive) return;
    for (const v of this.droneVoices) {
      v.osc.stop();
      v.ampLFO.stop();
      v.filterLFO.stop();
      v.panLFO.stop();
      v.osc.disconnect();
      v.gain.disconnect();
      v.pan.disconnect();
      v.filter.disconnect();
    }
    this.isActive = false;
    if (this.rootShiftTimer) {
      clearTimeout(this.rootShiftTimer);
      this.rootShiftTimer = null;
    }
    console.log("Drone installation stopped.");
  }

  _scheduleRootShift() {
    if (!this.isActive) return;
    const nextTime = ROOT_SHIFT_MIN * 1000 + Math.random() * (ROOT_SHIFT_MAX - ROOT_SHIFT_MIN) * 1000;
    this.rootShiftTimer = setTimeout(() => {
      this._shiftRoot();
      this._scheduleRootShift();
    }, nextTime);
  }

  _shiftRoot() {
    this.rootIndex = (this.rootIndex + 1) % ROOT_CYCLE.length;
    const newRoot = ROOT_CYCLE[this.rootIndex];
    for (let i = 0; i < this.droneVoices.length; i++) {
      const v = this.droneVoices[i];
      const targetFreq = newRoot * v.ratio;
      v.osc.frequency.rampTo(targetFreq, ROOT_GLIDE_TIME);
    }
    this.rootFreq = newRoot;
    console.log(`Root shifted to ${newRoot.toFixed(2)} Hz`);
  }

  setPlayerMovement(speed) {
    this.playerSpeed = speed;
    // More movement = faster LFOs, brighter filters, more volume
    for (const v of this.droneVoices) {
      v.ampLFO.frequency.rampTo(0.02 + speed * 0.1, 2);
      v.panLFO.frequency.rampTo(0.01 + speed * 0.08, 2);
      v.filterLFO.frequency.rampTo(0.015 + speed * 0.09, 2);
      v.filter.frequency.rampTo(800 + speed * 800, 3);
      v.gain.gain.rampTo(0.15 + speed * 0.1, 2);
    }
    this.masterReverb.wet.rampTo(0.4 + speed * 0.2, 2);
  }

  setZone(zoneName) {
    this.zone = zoneName;
    // Example: breakRoom = more volume, wellness = softer, mdr = more reverb
    let wet = 0.4, gain = 0.15;
    if (zoneName === 'breakRoom') { wet = 0.55; gain = 0.22; }
    if (zoneName === 'wellness') { wet = 0.25; gain = 0.10; }
    if (zoneName === 'mdr') { wet = 0.5; gain = 0.18; }
    this.masterReverb.wet.rampTo(wet, 3);
    for (const v of this.droneVoices) {
      v.gain.gain.rampTo(gain, 3);
    }
  }

  onPlayerStillness(duration) {
    // The longer the stillness, the slower/darker/softer the sound
    const t = Math.min(duration, 30) / 30;
    for (const v of this.droneVoices) {
      v.ampLFO.frequency.rampTo(0.01 + 0.01 * (1 - t), 4);
      v.filter.frequency.rampTo(400 + 200 * (1 - t), 4);
      v.gain.gain.rampTo(0.08 + 0.07 * (1 - t), 4);
    }
    this.masterReverb.wet.rampTo(0.2 + 0.2 * (1 - t), 4);
  }

  /**
   * Clean up all audio resources
   */
  dispose() {
    this.stopDroneInstallation();
    
    // Dispose of all Tone.js objects
    if (this.masterLimiter) {
      this.masterLimiter.dispose();
    }
    
    if (this.masterReverb) {
      this.masterReverb.dispose();
    }
    
    // Clear voice references
    this.droneVoices = [];
  }
} 