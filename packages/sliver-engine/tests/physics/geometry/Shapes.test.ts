import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	type Aabb,
	type PhysicsTransform,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { expectCloseToVector } from "../TestAssertions";

const expectCloseToAabb = (actual: Aabb, expected: Aabb): void => {
	expectCloseToVector(actual.min, expected.min);
	expectCloseToVector(actual.max, expected.max);
};

describe("Physics shape model", () => {
	test("transforms identity circle center at the origin", () => {
		const circle = new CircleShape(Vector.zero(), 1);
		const transform: PhysicsTransform = {
			position: Vector.zero(),
			angle: 0,
		};

		expectCloseToVector(circle.getWorldCenter(transform), Vector.zero(), 1e-12);
		expectCloseToAabb(circle.getAabb(transform), {
			min: new Vector(-1, -1),
			max: new Vector(1, 1),
		});
	});

	test("transforms circle local center into world space", () => {
		const circle = new CircleShape(new Vector(2, -1), 5);
		const transform: PhysicsTransform = {
			position: new Vector(10, 3),
			angle: Math.PI / 2,
		};

		expectCloseToVector(circle.getWorldCenter(transform), new Vector(11, 5), 1e-12);
	});

	test("transforms convex polygon vertices into world space", () => {
		const polygon = ConvexPolygonShape.fromRectangle(
			new Vector(4, 2),
			new Vector(1, 0)
		);
		const transform: PhysicsTransform = {
			position: new Vector(10, -2),
			angle: Math.PI / 2,
		};

		const expectedVertices = [
			new Vector(11, -3),
			new Vector(11, 1),
			new Vector(9, 1),
			new Vector(9, -3),
		];

		const worldVertices = polygon.getWorldVertices(transform);
		for (let index = 0; index < expectedVertices.length; index++) {
			expectCloseToVector(worldVertices[index]!, expectedVertices[index]!, 1e-12);
		}
	});

	test("builds rectangles as centered convex polygons", () => {
		const rectangle = ConvexPolygonShape.fromRectangle(new Vector(6, 4));
		const vertices = rectangle.getLocalVertices();
		const expectedVertices = [
			new Vector(-3, -2),
			new Vector(3, -2),
			new Vector(3, 2),
			new Vector(-3, 2),
		];

		for (let index = 0; index < expectedVertices.length; index++) {
			expectCloseToVector(vertices[index]!, expectedVertices[index]!);
		}
	});

	test("builds rectangles with arbitrary local centers", () => {
		const rectangle = ConvexPolygonShape.fromRectangle(
			new Vector(4, 2),
			new Vector(2, -3)
		);
		const vertices = rectangle.getLocalVertices();
		const expectedVertices = [
			new Vector(0, -4),
			new Vector(4, -4),
			new Vector(4, -2),
			new Vector(0, -2),
		];

		for (let index = 0; index < expectedVertices.length; index++) {
			expectCloseToVector(vertices[index]!, expectedVertices[index]!);
		}
	});

	test("computes circle and polygon AABBs from transformed shapes", () => {
		const circle = new CircleShape(new Vector(2, -1), 5);
		const circleTransform: PhysicsTransform = {
			position: new Vector(10, 3),
			angle: Math.PI / 2,
		};

		expectCloseToAabb(circle.getAabb(circleTransform), {
			min: new Vector(6, 0),
			max: new Vector(16, 10),
		});

		const polygon = ConvexPolygonShape.fromRectangle(new Vector(2, 4));
		const polygonTransform: PhysicsTransform = {
			position: new Vector(5, 2),
			angle: Math.PI / 2,
		};

		expectCloseToAabb(polygon.getAabb(polygonTransform), {
			min: new Vector(3, 1),
			max: new Vector(7, 3),
		});
	});

	test("computes polygon AABBs for identity and diagonal rotations", () => {
		const polygon = ConvexPolygonShape.fromRectangle(new Vector(2, 2));

		expectCloseToAabb(
			polygon.getAabb({
				position: Vector.zero(),
				angle: 0,
			}),
			{
				min: new Vector(-1, -1),
				max: new Vector(1, 1),
			}
		);

		const rotatedAabb = polygon.getAabb({
			position: Vector.zero(),
			angle: Math.PI / 4,
		});
		const extent = Math.sqrt(2);

		expectCloseToAabb(rotatedAabb, {
			min: new Vector(-extent, -extent),
			max: new Vector(extent, extent),
		});
	});

	test("checks point containment for circles and convex polygons", () => {
		const circle = new CircleShape(new Vector(1, 0), 2);
		const circleTransform: PhysicsTransform = {
			position: new Vector(4, -1),
			angle: Math.PI / 2,
		};

		const circleInsidePoint = new Vector(1, 0).toWorldSpace(
			circleTransform.position,
			circleTransform.angle
		);
		const circleOutsidePoint = circleInsidePoint.toAdded(new Vector(3, 0));

		expect(circle.containsPoint(circleInsidePoint, circleTransform)).toBe(true);
		expect(circle.containsPoint(circleOutsidePoint, circleTransform)).toBe(false);

		const polygon = ConvexPolygonShape.fromRectangle(new Vector(4, 2));
		const polygonTransform: PhysicsTransform = {
			position: new Vector(10, 5),
			angle: Math.PI / 2,
		};
		const polygonInsidePoint = new Vector(0.5, 0.5).toWorldSpace(
			polygonTransform.position,
			polygonTransform.angle
		);
		const polygonOutsidePoint = new Vector(3, 0).toWorldSpace(
			polygonTransform.position,
			polygonTransform.angle
		);

		expect(polygon.containsPoint(polygonInsidePoint, polygonTransform)).toBe(true);
		expect(polygon.containsPoint(polygonOutsidePoint, polygonTransform)).toBe(
			false
		);
	});

	test("treats boundary points as contained", () => {
		const circle = new CircleShape(Vector.zero(), 2);
		const circleTransform: PhysicsTransform = {
			position: new Vector(3, 4),
			angle: 0,
		};
		expect(
			circle.containsPoint(new Vector(5, 4), circleTransform)
		).toBe(true);

		const polygon = ConvexPolygonShape.fromRectangle(new Vector(4, 2));
		const polygonTransform: PhysicsTransform = {
			position: Vector.zero(),
			angle: 0,
		};
		expect(
			polygon.containsPoint(new Vector(2, 0), polygonTransform)
		).toBe(true);
	});

	test("supports circles without local offsets", () => {
		const circle = new CircleShape(Vector.zero(), 3);
		const transform: PhysicsTransform = {
			position: new Vector(-2, 1),
			angle: Math.PI / 3,
		};

		expectCloseToVector(circle.getWorldCenter(transform), new Vector(-2, 1), 1e-12);
		expect(circle.containsPoint(new Vector(1, 1), transform)).toBe(true);
		expect(circle.containsPoint(new Vector(2, 1), transform)).toBe(false);
	});

	test("rejects degenerate shape construction", () => {
		expect(() => new CircleShape(Vector.zero(), 0)).toThrow();
		expect(() => new CircleShape(Vector.zero(), -1)).toThrow();
		expect(() => ConvexPolygonShape.fromRectangle(new Vector(0, 2))).toThrow();
		expect(() => ConvexPolygonShape.fromRectangle(new Vector(2, 0))).toThrow();
	});
});
