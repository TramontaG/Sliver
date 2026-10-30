import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	createContactProxy,
	generateContactManifold,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import {
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

const CONTACT_EPSILON = 1e-9;

const sortPointsByCoordinates = (points: readonly { position: Vector }[]): Vector[] => {
	return points
		.map((point) => point.position.clone())
		.sort((pointA, pointB) => {
			if (Math.abs(pointA.y - pointB.y) > CONTACT_EPSILON) {
				return pointA.y - pointB.y;
			}

			return pointA.x - pointB.x;
		});
};

describe("Narrow-phase contact generation", () => {
	test("returns no manifold for non-overlapping circles", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(3, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).toBeNull();
	});

	test("treats exactly touching circles as non-contact", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(2, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).toBeNull();
	});

	test("builds a stable circle-circle manifold", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(1.5, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expect(manifold?.bodyIdA).toBe("body-a");
		expect(manifold?.bodyIdB).toBe("body-b");
		expect(manifold?.shapeIdA).toBe("circle-a");
		expect(manifold?.shapeIdB).toBe("circle-b");
		expectCloseToVector(manifold!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(0.75, 0),
			CONTACT_EPSILON
		);
		expectCloseToNumber(manifold!.points[0]!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points[0]!.id).toBe("circle-circle");
	});

	test("uses a stable fallback normal for coincident circles", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(3, -1),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(3, -1),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 2, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(3, -1),
			CONTACT_EPSILON
		);
	});

	test("keeps circle-circle normal direction stable when body order is mirrored", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(1.5, 0),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(-1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
	});

	test("returns no manifold for non-overlapping circle-polygon pairs", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(4.5, 0),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "rect-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			})
		);

		expect(manifold).toBeNull();
	});

	test("treats exactly touching circle-polygon pairs as non-contact in both orders", () => {
		const circleFirst = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(3, 0),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "rect-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			})
		);
		const polygonFirst = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "rect-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(3, 0),
					angle: 0,
				},
			})
		);

		expect(circleFirst).toBeNull();
		expect(polygonFirst).toBeNull();
	});

	test("builds a stable circle-polygon manifold", () => {
		const circleProxy = createContactProxy({
			bodyId: "body-a",
			shapeId: "circle-a",
			shape: new CircleShape(Vector.zero(), 1),
			transform: {
				position: new Vector(2.5, 0),
				angle: 0,
			},
		});
		const polygonProxy = createContactProxy({
			bodyId: "body-b",
			shapeId: "rect-b",
			shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
			transform: {
				position: Vector.zero(),
				angle: 0,
			},
		});

		const manifold = generateContactManifold(circleProxy, polygonProxy);
		const repeatedManifold = generateContactManifold(circleProxy, polygonProxy);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(-1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(2, 0),
			CONTACT_EPSILON
		);
		expect(manifold!.points[0]!.id).toBe(repeatedManifold!.points[0]!.id);
	});

	test("keeps circle-polygon contact IDs stable across fresh proxy instances", () => {
		const buildManifold = () =>
			generateContactManifold(
				createContactProxy({
					bodyId: "body-a",
					shapeId: "circle-a",
					shape: new CircleShape(Vector.zero(), 1),
					transform: {
						position: new Vector(2.5, 0),
						angle: 0,
					},
				}),
				createContactProxy({
					bodyId: "body-b",
					shapeId: "rect-b",
					shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
					transform: {
						position: Vector.zero(),
						angle: 0,
					},
				})
			);

		const manifoldA = buildManifold();
		const manifoldB = buildManifold();

		expect(manifoldA).not.toBeNull();
		expect(manifoldB).not.toBeNull();
		expect(manifoldA!.points[0]!.id).toBe(manifoldB!.points[0]!.id);
	});

	test("builds a stable manifold when the circle center is inside the polygon", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "circle-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "rect-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(8, 8)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(0, -1), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(0, -4),
			CONTACT_EPSILON
		);
	});

	test("flips the circle-polygon normal consistently when argument order changes", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "rect-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "circle-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: {
					position: new Vector(2.5, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(2, 0),
			CONTACT_EPSILON
		);
	});

	test("returns no manifold for non-overlapping polygons", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "rect-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "rect-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
				transform: {
					position: new Vector(5, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).toBeNull();
	});

	test("treats exactly touching polygons as non-contact in both orders", () => {
		const build = (flip: boolean) =>
			generateContactManifold(
				createContactProxy({
					bodyId: flip ? "body-b" : "body-a",
					shapeId: flip ? "rect-b" : "rect-a",
					shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
					transform: {
						position: flip ? new Vector(4, 0) : Vector.zero(),
						angle: 0,
					},
				}),
				createContactProxy({
					bodyId: flip ? "body-a" : "body-b",
					shapeId: flip ? "rect-a" : "rect-b",
					shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
					transform: {
						position: flip ? Vector.zero() : new Vector(4, 0),
						angle: 0,
					},
				})
			);

		expect(build(false)).toBeNull();
		expect(build(true)).toBeNull();
	});

	test("builds a polygon-polygon face manifold with two contact points", () => {
		const proxyA = createContactProxy({
			bodyId: "body-a",
			shapeId: "rect-a",
			shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
			transform: {
				position: Vector.zero(),
				angle: 0,
			},
		});
		const proxyB = createContactProxy({
			bodyId: "body-b",
			shapeId: "rect-b",
			shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
			transform: {
				position: new Vector(3.5, 0),
				angle: 0,
			},
		});

		const manifold = generateContactManifold(proxyA, proxyB);
		const repeatedManifold = generateContactManifold(proxyA, proxyB);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(2);
		const sortedPoints = sortPointsByCoordinates(manifold!.points);
		expectCloseToVector(sortedPoints[0]!, new Vector(2, -1), CONTACT_EPSILON);
		expectCloseToVector(sortedPoints[1]!, new Vector(2, 1), CONTACT_EPSILON);
		expect(manifold!.points[0]!.id).toBe(repeatedManifold!.points[0]!.id);
		expect(manifold!.points[1]!.id).toBe(repeatedManifold!.points[1]!.id);
	});

	test("keeps polygon-polygon contact IDs stable across fresh proxy instances", () => {
		const buildManifold = () =>
			generateContactManifold(
				createContactProxy({
					bodyId: "body-a",
					shapeId: "rect-a",
					shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
					transform: {
						position: Vector.zero(),
						angle: 0,
					},
				}),
				createContactProxy({
					bodyId: "body-b",
					shapeId: "rect-b",
					shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
					transform: {
						position: new Vector(3.5, 0),
						angle: 0,
					},
				})
			);

		const manifoldA = buildManifold();
		const manifoldB = buildManifold();

		expect(manifoldA).not.toBeNull();
		expect(manifoldB).not.toBeNull();
		expect(manifoldA!.points).toHaveLength(2);
		expect(manifoldB!.points).toHaveLength(2);
		expect(manifoldA!.points[0]!.id).toBe(manifoldB!.points[0]!.id);
		expect(manifoldA!.points[1]!.id).toBe(manifoldB!.points[1]!.id);
	});

	test("flips polygon-polygon normals consistently when argument order changes", () => {
		const proxyA = createContactProxy({
			bodyId: "body-a",
			shapeId: "rect-a",
			shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
			transform: {
				position: Vector.zero(),
				angle: 0,
			},
		});
		const proxyB = createContactProxy({
			bodyId: "body-b",
			shapeId: "rect-b",
			shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
			transform: {
				position: new Vector(3.5, 0),
				angle: 0,
			},
		});

		const forward = generateContactManifold(proxyA, proxyB);
		const reverse = generateContactManifold(proxyB, proxyA);

		expect(forward).not.toBeNull();
		expect(reverse).not.toBeNull();
		expectCloseToVector(forward!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToVector(reverse!.normal, new Vector(-1, 0), CONTACT_EPSILON);
	});

	test("builds a single-point polygon-polygon manifold for vertex-face contact", () => {
		const triangle = new ConvexPolygonShape([
			new Vector(-2, 0),
			new Vector(2, -1),
			new Vector(2, 1),
		]);
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "rect-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: {
					position: Vector.zero(),
					angle: 0,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "tri-b",
				shape: triangle,
				transform: {
					position: new Vector(3.8, 0),
					angle: 0,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(1, 0), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.2, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(1);
		expectCloseToVector(
			manifold!.points[0]!.position,
			new Vector(2, 0),
			CONTACT_EPSILON
		);
	});

	test("builds a rotated polygon-polygon manifold in world space", () => {
		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: "body-a",
				shapeId: "rect-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
				transform: {
					position: Vector.zero(),
					angle: Math.PI / 2,
				},
			}),
			createContactProxy({
				bodyId: "body-b",
				shapeId: "rect-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 2)),
				transform: {
					position: new Vector(0, 3.5),
					angle: Math.PI / 2,
				},
			})
		);

		expect(manifold).not.toBeNull();
		expectCloseToVector(manifold!.normal, new Vector(0, 1), CONTACT_EPSILON);
		expectCloseToNumber(manifold!.penetration, 0.5, CONTACT_EPSILON);
		expect(manifold!.points).toHaveLength(2);
		const sortedPoints = sortPointsByCoordinates(manifold!.points).sort(
			(pointA, pointB) => pointA.x - pointB.x
		);
		expectCloseToVector(sortedPoints[0]!, new Vector(-1, 2), CONTACT_EPSILON);
		expectCloseToVector(sortedPoints[1]!, new Vector(1, 2), CONTACT_EPSILON);
	});
});
