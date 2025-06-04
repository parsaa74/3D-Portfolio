import { describe, it, expect, beforeEach } from "vitest";
import { CollisionSystem } from "../../systems/physics/CollisionSystem.js";

describe("CollisionSystem", () => {
  let collisionSystem;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();
    // Setup mock segment with walls
    window.currentSegment = {
      walls: [
        { x: 5, z: 5 },
        { x: -5, z: -5 },
      ],
    };
  });

  describe("position validation", () => {
    it("should validate valid positions", () => {
      expect(collisionSystem.isValidPosition(0, 0)).toBe(true);
      expect(collisionSystem.isValidPosition(50, 50)).toBe(true);
      expect(collisionSystem.isValidPosition(-50, -50)).toBe(true);
    });

    it("should reject invalid positions", () => {
      expect(collisionSystem.isValidPosition(NaN, 0)).toBe(false);
      expect(collisionSystem.isValidPosition(0, NaN)).toBe(false);
      expect(collisionSystem.isValidPosition(150, 150)).toBe(false);
    });
  });

  describe("collision detection", () => {
    it("should detect collisions with walls", () => {
      // Test position very close to a wall
      expect(collisionSystem.checkCollisionAt(5, 5)).toBe(true);
    });

    it("should allow movement in open spaces", () => {
      // Test position far from walls
      expect(collisionSystem.checkCollisionAt(20, 20)).toBe(false);
    });

    it("should calculate distances correctly", () => {
      const distance = collisionSystem.distanceBetween(0, 0, 3, 4);
      expect(distance).toBe(5); // Using 3-4-5 triangle
    });
  });

  describe("movement validation", () => {
    it("should validate moves in open spaces", () => {
      expect(collisionSystem.isValidMove(20, 20)).toBe(true);
    });

    it("should reject moves into walls", () => {
      expect(collisionSystem.isValidMove(5, 5)).toBe(false);
    });

    it("should reject moves outside boundaries", () => {
      expect(collisionSystem.isValidMove(150, 150)).toBe(false);
    });
  });

  describe("utility functions", () => {
    it("should correctly check if value is between bounds", () => {
      expect(collisionSystem.isBetween(5, 0, 10)).toBe(true);
      expect(collisionSystem.isBetween(-5, 0, 10)).toBe(false);
      expect(collisionSystem.isBetween(15, 0, 10)).toBe(false);
    });
  });
});
