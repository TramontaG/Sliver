import { describe, expect, test } from "bun:test";
import {
	ConvexPolygonShape,
	MAX_CONVEX_PART_VERTICES,
	decomposePolygonIntoConvexParts,
	isConvexPolygon,
	normalizeSimplePolygonVertices,
	triangulateSimplePolygon,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import {
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

const DECOMPOSITION_EPSILON = 1e-9;

const computeSignedArea = (vertices: readonly Vector[]): number => {
	let doubledArea = 0;

	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index]!;
		const next = vertices[(index + 1) % vertices.length]!;
		doubledArea += current.crossProduct(next);
	}

	return doubledArea * 0.5;
};

const computeArea = (vertices: readonly Vector[]): number => {
	return Math.abs(computeSignedArea(vertices));
};

const computeTotalArea = (parts: readonly ConvexPolygonShape[]): number => {
	return parts.reduce(
		(sum, part) => sum + computeArea(part.getLocalVertices()),
		0
	);
};

const expectAllPartsConvex = (parts: readonly ConvexPolygonShape[]): void => {
	for (const part of parts) {
		expect(isConvexPolygon(part.getLocalVertices())).toBe(true);
	}
};

const expectPolygonLoop = (
	actual: readonly Vector[],
	expected: readonly Vector[]
): void => {
	expect(actual.length).toBe(expected.length);

	const startIndex = actual.findIndex((vertex) => {
		return (
			Math.abs(vertex.x - expected[0]!.x) <= DECOMPOSITION_EPSILON &&
			Math.abs(vertex.y - expected[0]!.y) <= DECOMPOSITION_EPSILON
		);
	});

	expect(startIndex).toBeGreaterThanOrEqual(0);

	for (let index = 0; index < expected.length; index++) {
		expectCloseToVector(
			actual[(startIndex + index) % actual.length]!,
			expected[index]!,
			DECOMPOSITION_EPSILON
		);
	}
};

describe("Polygon validation and concave decomposition", () => {
	test("keeps a convex polygon unchanged", () => {
		const vertices = [
			new Vector(-2, -1),
			new Vector(2, -1),
			new Vector(2, 1),
			new Vector(-2, 1),
		];

		const normalized = normalizeSimplePolygonVertices(vertices);
		expectPolygonLoop(normalized, vertices);

		const parts = decomposePolygonIntoConvexParts(vertices);
		expect(parts).toHaveLength(1);
		expectPolygonLoop(parts[0]!.getLocalVertices(), vertices);
	});

	test("normalizes repeated closing vertices and winding order", () => {
		const vertices = [
			new Vector(-2, -1),
			new Vector(-2, 1),
			new Vector(2, 1),
			new Vector(2, -1),
			new Vector(-2, -1),
		];

		const normalized = normalizeSimplePolygonVertices(vertices);
		const expected = [
			new Vector(-2, -1),
			new Vector(2, -1),
			new Vector(2, 1),
			new Vector(-2, 1),
		];

		expectPolygonLoop(normalized, expected);
		expectCloseToNumber(computeSignedArea(normalized), 8, DECOMPOSITION_EPSILON);
	});

	test("decomposes a concave polygon into convex parts with preserved area", () => {
		const lShape = [
			new Vector(0, 0),
			new Vector(3, 0),
			new Vector(3, 1),
			new Vector(1, 1),
			new Vector(1, 3),
			new Vector(0, 3),
		];

		const parts = decomposePolygonIntoConvexParts(lShape);

		expect(parts).toHaveLength(2);
		expectAllPartsConvex(parts);
		for (const part of parts) {
			expect(part.getLocalVertices().length).toBeLessThanOrEqual(
				MAX_CONVEX_PART_VERTICES
			);
		}

		expectCloseToNumber(computeTotalArea(parts), computeArea(lShape), DECOMPOSITION_EPSILON);
	});

	test("reduces triangle count when greedy convex merging is legal", () => {
		const lShape = [
			new Vector(0, 0),
			new Vector(3, 0),
			new Vector(3, 1),
			new Vector(1, 1),
			new Vector(1, 3),
			new Vector(0, 3),
		];

		const triangles = triangulateSimplePolygon(lShape);
		const parts = decomposePolygonIntoConvexParts(lShape);

		expect(triangles).toHaveLength(4);
		for (const triangle of triangles) {
			expect(triangle.getLocalVertices()).toHaveLength(3);
			expect(computeArea(triangle.getLocalVertices())).toBeGreaterThan(
				DECOMPOSITION_EPSILON
			);
		}
		expectCloseToNumber(
			computeTotalArea(triangles),
			computeArea(lShape),
			DECOMPOSITION_EPSILON
		);

		expect(parts).toHaveLength(2);
		expect(parts.length).toBeLessThan(triangles.length);
	});

	test("decomposes clockwise concave input the same way as counter-clockwise input", () => {
		const ccwLShape = [
			new Vector(0, 0),
			new Vector(3, 0),
			new Vector(3, 1),
			new Vector(1, 1),
			new Vector(1, 3),
			new Vector(0, 3),
		];
		const cwLShape = [...ccwLShape].reverse();

		const ccwParts = decomposePolygonIntoConvexParts(ccwLShape);
		const cwParts = decomposePolygonIntoConvexParts(cwLShape);

		expect(ccwParts).toHaveLength(2);
		expect(cwParts).toHaveLength(2);
		expectAllPartsConvex(ccwParts);
		expectAllPartsConvex(cwParts);
		expectCloseToNumber(
			computeTotalArea(cwParts),
			computeTotalArea(ccwParts),
			DECOMPOSITION_EPSILON
		);
	});

	test("decomposes a multi-reflex polygon into convex parts with preserved area", () => {
		const uShape = [
			new Vector(0, 0),
			new Vector(4, 0),
			new Vector(4, 3),
			new Vector(3, 3),
			new Vector(3, 1),
			new Vector(1, 1),
			new Vector(1, 3),
			new Vector(0, 3),
		];

		const triangles = triangulateSimplePolygon(uShape);
		const parts = decomposePolygonIntoConvexParts(uShape);

		expect(parts.length).toBeGreaterThan(1);
		expect(parts.length).toBeLessThan(triangles.length);
		expectAllPartsConvex(parts);
		expectCloseToNumber(
			computeTotalArea(parts),
			computeArea(uShape),
			DECOMPOSITION_EPSILON
		);
	});

	test("returns a single triangle unchanged for the minimum valid input", () => {
		const triangle = [
			new Vector(0, 0),
			new Vector(2, 0),
			new Vector(0, 1),
		];

		const parts = decomposePolygonIntoConvexParts(triangle);

		expect(parts).toHaveLength(1);
		expectAllPartsConvex(parts);
		expectPolygonLoop(parts[0]!.getLocalVertices(), triangle);
	});

	test("normalizes away nearly-collinear redundant vertices when the polygon remains valid", () => {
		const nearlyCollinear = [
			new Vector(0, 0),
			new Vector(2, 2e-10),
			new Vector(4, 0),
			new Vector(4, 2),
			new Vector(0, 2),
		];

		const normalized = normalizeSimplePolygonVertices(nearlyCollinear);
		const parts = decomposePolygonIntoConvexParts(nearlyCollinear);

		expect(normalized).toHaveLength(4);
		expectPolygonLoop(normalized, [
			new Vector(0, 0),
			new Vector(4, 0),
			new Vector(4, 2),
			new Vector(0, 2),
		]);
		expect(parts).toHaveLength(1);
		expectAllPartsConvex(parts);
	});

	test("rejects polygons that would force epsilon-scale sliver triangles", () => {
		const sliverPolygon = [
			new Vector(0, 0),
			new Vector(4, 0),
			new Vector(4, 2),
			new Vector(2, 2),
			new Vector(2, 2 - 7e-10),
			new Vector(0, 2),
		];

		expect(() => triangulateSimplePolygon(sliverPolygon)).toThrow();
		expect(() => decomposePolygonIntoConvexParts(sliverPolygon)).toThrow();
	});

	test("rejects self-intersecting polygons", () => {
		const bowTie = [
			new Vector(0, 0),
			new Vector(2, 2),
			new Vector(0, 2),
			new Vector(2, 0),
		];

		expect(() => normalizeSimplePolygonVertices(bowTie)).toThrow();
		expect(() => decomposePolygonIntoConvexParts(bowTie)).toThrow();
	});

	test("rejects polygons with duplicate consecutive vertices", () => {
		const duplicateVertices = [
			new Vector(0, 0),
			new Vector(2, 0),
			new Vector(2, 0),
			new Vector(0, 2),
		];

		expect(() => normalizeSimplePolygonVertices(duplicateVertices)).toThrow();
		expect(() => decomposePolygonIntoConvexParts(duplicateVertices)).toThrow();
	});

	test("rejects polygons with repeated non-consecutive vertices", () => {
		const repeatedVertex = [
			new Vector(0, 0),
			new Vector(2, 0),
			new Vector(1, 1),
			new Vector(0, 0),
			new Vector(0, 2),
		];

		expect(() => normalizeSimplePolygonVertices(repeatedVertex)).toThrow();
		expect(() => decomposePolygonIntoConvexParts(repeatedVertex)).toThrow();
	});

	test("rejects polygons that collapse to zero area", () => {
		const degenerate = [
			new Vector(0, 0),
			new Vector(1, 0),
			new Vector(2, 0),
		];

		expect(() => normalizeSimplePolygonVertices(degenerate)).toThrow();
		expect(() => triangulateSimplePolygon(degenerate)).toThrow();
		expect(() => decomposePolygonIntoConvexParts(degenerate)).toThrow();
	});
});
