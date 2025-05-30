/**
 * Math Utilities for Severance: The Game
 *
 * This file contains common math functions used throughout the game.
 */

import { THREE } from "../utils/ThreeJSLoader.js";

/**
 * Clamp a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} - The clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - The interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} - Angle in degrees
 */
export function radToDeg(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Check if a value is between two other values
 * @param {number} value - The value to check
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} - True if the value is between min and max
 */
export function isBetween(value, min, max) {
  return value >= min && value <= max;
}

/**
 * Calculate the distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} - The distance between the points
 */
export function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the distance between two 3D points
 * @param {THREE.Vector3} a - First point
 * @param {THREE.Vector3} b - Second point
 * @returns {number} - The distance between the points
 */
export function distance3D(a, b) {
  return a.distanceTo(b);
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer between min and max
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random float between min and max
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Smoothly interpolate between two values using a smoothstep function
 * @param {number} edge0 - Lower edge
 * @param {number} edge1 - Upper edge
 * @param {number} x - Input value
 * @returns {number} - Smoothly interpolated value
 */
export function smoothstep(edge0, edge1, x) {
  // Scale, bias and saturate x to 0..1 range
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  // Evaluate polynomial
  return x * x * (3 - 2 * x);
}

/**
 * Easing function: Quadratic ease-in
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeInQuad(t) {
  return t * t;
}

/**
 * Easing function: Quadratic ease-out
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeOutQuad(t) {
  return t * (2 - t);
}

/**
 * Easing function: Quadratic ease-in-out
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Easing function: Cubic ease-in
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeInCubic(t) {
  return t * t * t;
}

/**
 * Easing function: Cubic ease-out
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeOutCubic(t) {
  return --t * t * t + 1;
}

/**
 * Easing function: Cubic ease-in-out
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/**
 * Calculate the angle between two vectors in radians
 * @param {THREE.Vector2|THREE.Vector3} a - First vector
 * @param {THREE.Vector2|THREE.Vector3} b - Second vector
 * @returns {number} - Angle in radians
 */
export function angleBetweenVectors(a, b) {
  return Math.acos(a.dot(b) / (a.length() * b.length()));
}

/**
 * Calculate the signed angle between two 2D vectors in radians
 * @param {THREE.Vector2} a - First vector
 * @param {THREE.Vector2} b - Second vector
 * @returns {number} - Signed angle in radians
 */
export function signedAngleBetweenVectors2D(a, b) {
  return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
}

/**
 * Normalize an angle to be between -PI and PI
 * @param {number} angle - Angle in radians
 * @returns {number} - Normalized angle in radians
 */
export function normalizeAngle(angle) {
  return angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
}

/**
 * Calculate the shortest angle between two angles
 * @param {number} a - First angle in radians
 * @param {number} b - Second angle in radians
 * @returns {number} - Shortest angle in radians
 */
export function shortestAngleBetween(a, b) {
  const delta = normalizeAngle(b - a);
  return delta > Math.PI ? delta - 2 * Math.PI : delta;
}
