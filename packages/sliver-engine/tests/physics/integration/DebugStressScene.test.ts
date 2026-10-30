import { describe, expect, test } from "bun:test";
import { Vector } from "../../../src/Lib/Vector";
import {
	DEBUG_STRESS_CONCAVE_SAMPLE,
	DEBUG_STRESS_SCENE_HEIGHT,
	DEBUG_STRESS_SCENE_WIDTH,
	buildDebugStressScene,
} from "../../../src/DebugGame/DebugStressScene";
import { decomposePolygonIntoConvexParts } from "../../../src/Physics";
import { expectCloseToNumber, expectCloseToVector } from "../TestAssertions";

const STRESS_EPSILON = 1e-6;
const STRESS_DT = 1 / 60;

const stepScene = (steps: number) => {
	const scene = buildDebugStressScene();

	for (let step = 0; step < steps; step++) {
		scene.tick(STRESS_DT);
	}

	return scene;
};

describe("Debug stress scene", () => {
	test("builds a stress scene with many compound bodies, slopes, and a sensor zone", () => {
		const scene = buildDebugStressScene();
		const objects = scene.getGameObjects();

		const dynamicCompoundObjects = objects.filter(
			(object) => !object.phisics.immovable && object.getHitboxes().length > 1
		);
		const sensorObjects = objects.filter((object) =>
			object.getHitboxes().some((hitbox) => !hitbox.solid)
		);
		const rotatedStaticObjects = objects.filter(
			(object) => object.phisics.immovable && Math.abs(object.rotation) > 0
		);
		const circleObjects = objects.filter((object) =>
			object.getHitboxes().some((hitbox) => "radius" in hitbox)
		);

		expect(dynamicCompoundObjects.length).toBeGreaterThanOrEqual(12);
		expect(sensorObjects.length).toBeGreaterThanOrEqual(1);
		expect(rotatedStaticObjects.length).toBeGreaterThanOrEqual(2);
		expect(circleObjects.length).toBeGreaterThanOrEqual(6);
	});

	test("keeps representative stress-scene bodies finite and inside the arena after stepping", () => {
		const scene = stepScene(360);
		const representativeNames = [
			"stack_crate_0",
			"stack_crate_5",
			"dumbbell_0",
			"barrel_2",
			"heavy_block",
			"light_ball_0",
		];

		for (const name of representativeNames) {
			const object = scene.getGameObjects().find((candidate) => candidate.name === name);
			if (!object) {
				throw new Error(`Expected representative object "${name}" to exist.`);
			}

			const position = object.getScenePosition();
			expect(Number.isFinite(position.x)).toBe(true);
			expect(Number.isFinite(position.y)).toBe(true);
			expect(Number.isFinite(object.speed.x)).toBe(true);
			expect(Number.isFinite(object.speed.y)).toBe(true);
			expect(position.x).toBeGreaterThanOrEqual(-80);
			expect(position.x).toBeLessThanOrEqual(DEBUG_STRESS_SCENE_WIDTH + 80);
			expect(position.y).toBeGreaterThanOrEqual(-80);
			expect(position.y).toBeLessThanOrEqual(DEBUG_STRESS_SCENE_HEIGHT + 80);
		}
	});

	test("keeps static scene structures fixed over long runs", () => {
		const scene = buildDebugStressScene();
		const floor = scene.getGameObjects().find((object) => object.name === "floor");
		const leftRamp = scene.getGameObjects().find((object) => object.name === "left_ramp");
		const rightRamp = scene.getGameObjects().find((object) => object.name === "right_ramp");

		if (!floor || !leftRamp || !rightRamp) {
			throw new Error("Expected floor and ramp objects to exist.");
		}

		const initialFloorPosition = floor.getScenePosition().clone();
		const initialLeftRampPosition = leftRamp.getScenePosition().clone();
		const initialRightRampPosition = rightRamp.getScenePosition().clone();
		const initialLeftRampRotation = leftRamp.rotation;
		const initialRightRampRotation = rightRamp.rotation;

		for (let step = 0; step < 480; step++) {
			scene.tick(STRESS_DT);
		}

		expectCloseToVector(
			floor.getScenePosition(),
			initialFloorPosition,
			STRESS_EPSILON,
			"floor position"
		);
		expectCloseToVector(
			leftRamp.getScenePosition(),
			initialLeftRampPosition,
			STRESS_EPSILON,
			"left ramp position"
		);
		expectCloseToVector(
			rightRamp.getScenePosition(),
			initialRightRampPosition,
			STRESS_EPSILON,
			"right ramp position"
		);
		expectCloseToNumber(
			leftRamp.rotation,
			initialLeftRampRotation,
			STRESS_EPSILON,
			"left ramp rotation"
		);
		expectCloseToNumber(
			rightRamp.rotation,
			initialRightRampRotation,
			STRESS_EPSILON,
			"right ramp rotation"
		);
		expectCloseToVector(floor.speed, Vector.zero(), STRESS_EPSILON, "floor speed");
		expectCloseToVector(
			leftRamp.speed,
			Vector.zero(),
			STRESS_EPSILON,
			"left ramp speed"
		);
		expectCloseToVector(
			rightRamp.speed,
			Vector.zero(),
			STRESS_EPSILON,
			"right ramp speed"
		);
	});

	test("documents the concave authoring sample used by the debug stress scene work", () => {
		const parts = decomposePolygonIntoConvexParts(DEBUG_STRESS_CONCAVE_SAMPLE);

		expect(parts.length).toBeGreaterThanOrEqual(2);
		for (const part of parts) {
			expect(part.getLocalVertices().length).toBeGreaterThanOrEqual(3);
		}
	});

	test("keeps the moderate mass-ratio scenario finite after repeated stepping", () => {
		const scene = stepScene(300);
		const heavyBlock = scene
			.getGameObjects()
			.find((object) => object.name === "heavy_block");
		const lightBall = scene
			.getGameObjects()
			.find((object) => object.name === "light_ball_0");

		if (!heavyBlock || !lightBall) {
			throw new Error("Expected heavy block and light ball objects to exist.");
		}

		for (const object of [heavyBlock, lightBall]) {
			const position = object.getScenePosition();
			expect(Number.isFinite(position.x)).toBe(true);
			expect(Number.isFinite(position.y)).toBe(true);
			expect(Number.isFinite(object.speed.x)).toBe(true);
			expect(Number.isFinite(object.speed.y)).toBe(true);
		}

		expect(heavyBlock.getScenePosition().y).toBeLessThanOrEqual(
			DEBUG_STRESS_SCENE_HEIGHT + 40
		);
		expect(lightBall.getScenePosition().y).toBeLessThanOrEqual(
			DEBUG_STRESS_SCENE_HEIGHT + 40
		);
	});
});
