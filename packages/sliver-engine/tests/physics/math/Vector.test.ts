import { describe, expect, test } from "bun:test";
import { Vector } from "../../../src/Lib/Vector";
import {
	DEFAULT_EPSILON,
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

describe("Vector numeric foundation", () => {
	test("preserves near-zero values during cloning and arithmetic", () => {
		const vector = new Vector(0.01, -0.02);

		expectCloseToVector(vector.clone(), new Vector(0.01, -0.02));
		expectCloseToVector(
			vector.toAdded(new Vector(0.01, 0.01)),
			new Vector(0.02, -0.01)
		);
		expectCloseToVector(
			vector.toSubtracted(new Vector(0.005, 0.005)),
			new Vector(0.005, -0.025)
		);
		expectCloseToVector(vector.toMultiplied(0.5), new Vector(0.005, -0.01));
	});

	test("keeps non-mutating helpers non-mutating", () => {
		const vector = new Vector(1, 2);
		const added = vector.toAdded(new Vector(3, 4));
		const subtracted = vector.toSubtracted(new Vector(0.5, 1));
		const multiplied = vector.toMultiplied(2);
		const rotated = vector.toRotated(Math.PI / 2);

		expectCloseToVector(vector, new Vector(1, 2));
		expectCloseToVector(added, new Vector(4, 6));
		expectCloseToVector(subtracted, new Vector(0.5, 1));
		expectCloseToVector(multiplied, new Vector(2, 4));
		expectCloseToVector(rotated, new Vector(-2, 1), 1e-12);
		expect(added).not.toBe(vector);
		expect(subtracted).not.toBe(vector);
		expect(multiplied).not.toBe(vector);
		expect(rotated).not.toBe(vector);
	});

	test("keeps mutating helpers mutating", () => {
		const vector = new Vector(1, 2);

		expect(vector.add(new Vector(3, 4))).toBe(vector);
		expectCloseToVector(vector, new Vector(4, 6));

		expect(vector.subtract(new Vector(1, 1))).toBe(vector);
		expectCloseToVector(vector, new Vector(3, 5));

		expect(vector.multiply(2)).toBe(vector);
		expectCloseToVector(vector, new Vector(6, 10));

		expect(vector.rotate(Math.PI)).toBe(vector);
		expectCloseToVector(vector, new Vector(-6, -10), 1e-12);
	});

	test("normalizes zero vectors safely", () => {
		const zero = Vector.zero();

		expectCloseToVector(zero.clone().normalize(), Vector.zero());
		expectCloseToVector(zero.toNormalized(), Vector.zero());
	});

	test("normalizes unit vectors without changing direction or magnitude", () => {
		const unit = new Vector(1, 0);
		const normalized = unit.toNormalized();

		expectCloseToVector(normalized, unit);
		expectCloseToNumber(normalized.magnitude(), 1, DEFAULT_EPSILON);
	});

	test("normalizes non-zero vectors without hidden snapping", () => {
		const normalized = new Vector(3, 4).toNormalized();

		expectCloseToVector(normalized, new Vector(0.6, 0.8));
		expectCloseToNumber(normalized.magnitude(), 1, DEFAULT_EPSILON);
	});

	test("supports explicit safe-normalization thresholds", () => {
		const tiny = new Vector(1e-9, 0);

		expectCloseToVector(tiny.toNormalized(1e-8), tiny);
		expectCloseToVector(tiny.toNormalized(), new Vector(1, 0), DEFAULT_EPSILON);
	});

	test("rotates vectors by angle", () => {
		const rotated = new Vector(1, 0).toRotated(Math.PI / 2);

		expectCloseToVector(rotated, new Vector(0, 1), 1e-12);
	});

	test("preserves vectors when rotating by identity and full turns", () => {
		const vector = new Vector(2, -5);

		expectCloseToVector(vector.toRotated(0), vector, 1e-12);
		expectCloseToVector(vector.toRotated(Math.PI * 2), vector, 1e-12);
		expectCloseToVector(
			new Vector(1, 0).toRotated(-Math.PI / 2),
			new Vector(0, -1),
			1e-12
		);
	});

	test("computes dot and cross products", () => {
		const a = new Vector(2, 3);
		const b = new Vector(-4, 5);

		expectCloseToNumber(a.dotProduct(b), 7);
		expectCloseToNumber(a.crossProduct(b), 22);
	});

	test("computes dot and cross edge cases", () => {
		const right = new Vector(1, 0);
		const up = new Vector(0, 1);
		const parallel = new Vector(3, 0);
		const antiparallel = new Vector(-5, 0);

		expectCloseToNumber(right.dotProduct(up), 0);
		expectCloseToNumber(right.crossProduct(parallel), 0);
		expectCloseToNumber(right.crossProduct(antiparallel), 0);
		expectCloseToNumber(right.crossProduct(up), -up.crossProduct(right));
	});

	test("provides perpendicular helpers", () => {
		const vector = new Vector(2, 3);

		expectCloseToVector(vector.toLeftPerpendicular(), new Vector(-3, 2));
		expectCloseToVector(vector.toRightPerpendicular(), new Vector(3, -2));

		const mutable = vector.clone().leftPerpendicular();
		expectCloseToVector(mutable, new Vector(-3, 2));

		const mutableRight = vector.clone().rightPerpendicular();
		expectCloseToVector(mutableRight, new Vector(3, -2));
	});

	test("supports zero checks with explicit epsilon", () => {
		const tiny = new Vector(1e-9, -1e-9);

		expect(Vector.zero().isZero()).toBe(true);
		expect(tiny.isZero()).toBe(false);
		expect(tiny.isZero(1e-8)).toBe(true);
	});

	test("converts between local and world space", () => {
		const localPoint = new Vector(2, 0);
		const origin = new Vector(10, -4);
		const angle = Math.PI / 2;

		const worldPoint = localPoint.toWorldSpace(origin, angle);
		expectCloseToVector(worldPoint, new Vector(10, -2), 1e-12);

		const recoveredLocalPoint = worldPoint.toLocalSpace(origin, angle);
		expectCloseToVector(recoveredLocalPoint, localPoint, 1e-12);
	});

	test("converts between local and world space with zero rotation", () => {
		const localPoint = new Vector(2, -1);
		const origin = new Vector(5, 3);
		const angle = 0;

		const worldPoint = localPoint.toWorldSpace(origin, angle);
		expectCloseToVector(worldPoint, new Vector(7, 2), 1e-12);

		const recoveredLocalPoint = worldPoint.toLocalSpace(origin, angle);
		expectCloseToVector(recoveredLocalPoint, localPoint, 1e-12);
	});

	test("converts between local and world space for arbitrary angles", () => {
		const localPoint = new Vector(2, -1);
		const origin = new Vector(5, 3);
		const angle = Math.PI / 6;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const expectedWorldPoint = new Vector(
			5 + localPoint.x * cos - localPoint.y * sin,
			3 + localPoint.x * sin + localPoint.y * cos
		);

		const worldPoint = localPoint.toWorldSpace(origin, angle);
		expectCloseToVector(worldPoint, expectedWorldPoint, 1e-12);

		const recoveredLocalPoint = worldPoint.toLocalSpace(origin, angle);
		expectCloseToVector(recoveredLocalPoint, localPoint, 1e-12);
	});
});
