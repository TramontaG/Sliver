import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	NaiveBroadPhase,
	type Aabb,
	type BroadPhase,
	type BroadPhaseProxy,
	type PhysicsTransform,
	createBroadPhaseProxy,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { expectCloseToVector } from "../TestAssertions";

const expectCloseToAabb = (actual: Aabb, expected: Aabb): void => {
	expectCloseToVector(actual.min, expected.min);
	expectCloseToVector(actual.max, expected.max);
};

const collectPairIds = (
	broadPhase: BroadPhase,
	proxies: readonly BroadPhaseProxy[]
): string[] => {
	broadPhase.updateProxies(proxies);
	return broadPhase
		.getCandidatePairs()
		.map((pair) => `${pair.proxyA.proxyId}|${pair.proxyB.proxyId}`);
};

describe("Broad-phase abstraction", () => {
	test("creates deterministic proxy AABBs from shapes and transforms", () => {
		const shape = ConvexPolygonShape.fromRectangle(new Vector(4, 2));
		const transform: PhysicsTransform = {
			position: new Vector(8, -3),
			angle: Math.PI / 2,
		};

		const firstProxy = createBroadPhaseProxy({
			proxyId: "proxy-a",
			bodyId: "body-a",
			shapeId: "shape-a",
			shape,
			transform,
		});
		const secondProxy = createBroadPhaseProxy({
			proxyId: "proxy-a",
			bodyId: "body-a",
			shapeId: "shape-a",
			shape,
			transform,
		});

		expectCloseToAabb(firstProxy.aabb, secondProxy.aabb);

		const movedProxy = createBroadPhaseProxy({
			proxyId: "proxy-a",
			bodyId: "body-a",
			shapeId: "shape-a",
			shape,
			transform: {
				position: transform.position.toAdded(new Vector(5, 0)),
				angle: transform.angle,
			},
		});

		expectCloseToAabb(firstProxy.aabb, {
			min: new Vector(7, -5),
			max: new Vector(9, -1),
		});
		expectCloseToAabb(movedProxy.aabb, {
			min: new Vector(12, -5),
			max: new Vector(14, -1),
		});
	});

	test("never emits same-body candidate pairs", () => {
		const broadPhase = new NaiveBroadPhase();
		const transform: PhysicsTransform = {
			position: Vector.zero(),
			angle: 0,
		};
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-shared",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform,
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-shared",
				shapeId: "shape-b",
				shape: ConvexPolygonShape.fromRectangle(new Vector(3, 3)),
				transform,
			}),
		];

		const pairIds = collectPairIds(broadPhase, proxies);
		if (pairIds.length !== 0) {
			throw new Error(`Expected no same-body candidate pairs, got ${pairIds.join(", ")}`);
		}
	});

	test("does not emit non-overlapping pairs", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(0, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(10, 0), angle: 0 },
			}),
		];

		const pairIds = collectPairIds(broadPhase, proxies);
		if (pairIds.length !== 0) {
			throw new Error(`Expected no non-overlapping pairs, got ${pairIds.join(", ")}`);
		}
	});

	test("treats touching AABBs as candidate overlaps", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(0, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(2, 0), angle: 0 },
			}),
		];

		expect(collectPairIds(broadPhase, proxies)).toEqual(["proxy-a|proxy-b"]);
	});

	test("emits overlapping pairs exactly once", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: { position: Vector.zero(), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-c",
				bodyId: "body-c",
				shapeId: "shape-c",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(20, 20), angle: 0 },
			}),
		];

		const pairIds = collectPairIds(broadPhase, proxies);
		if (pairIds.length !== 1 || pairIds[0] !== "proxy-a|proxy-b") {
			throw new Error(`Expected one normalized overlap pair, got ${pairIds.join(", ")}`);
		}
	});

	test("normalizes pair ordering by proxy id", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-z",
				bodyId: "body-z",
				shapeId: "shape-z",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(0, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
			}),
		];

		expect(collectPairIds(broadPhase, proxies)).toEqual(["proxy-a|proxy-z"]);
	});

	test("emits all pair combinations for three-way overlap", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 3),
				transform: { position: new Vector(0, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 3),
				transform: { position: new Vector(1, 0), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-c",
				bodyId: "body-c",
				shapeId: "shape-c",
				shape: new CircleShape(Vector.zero(), 3),
				transform: { position: new Vector(0.5, 1), angle: 0 },
			}),
		];

		expect(collectPairIds(broadPhase, proxies)).toEqual([
			"proxy-a|proxy-b",
			"proxy-a|proxy-c",
			"proxy-b|proxy-c",
		]);
	});

	test("applies category and mask filtering before narrow phase", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: Vector.zero(), angle: 0 },
				filter: { category: 0x0001, mask: 0x0002 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
				filter: { category: 0x0004, mask: 0x0001 },
			}),
		];

		const pairIds = collectPairIds(broadPhase, proxies);
		if (pairIds.length !== 0) {
			throw new Error(`Expected filtering to cull the pair, got ${pairIds.join(", ")}`);
		}
	});

	test("allows pairs when category and mask filters are compatible", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: Vector.zero(), angle: 0 },
				filter: { category: 0x0001, mask: 0x0006 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
				filter: { category: 0x0002, mask: 0x0001 },
			}),
		];

		expect(collectPairIds(broadPhase, proxies)).toEqual(["proxy-a|proxy-b"]);
	});

	test("keeps sensor overlaps in the candidate set", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "sensor",
				bodyId: "body-sensor",
				shapeId: "shape-sensor",
				shape: ConvexPolygonShape.fromRectangle(new Vector(4, 4)),
				transform: { position: Vector.zero(), angle: 0 },
				isSensor: true,
			}),
			createBroadPhaseProxy({
				proxyId: "solid",
				bodyId: "body-solid",
				shapeId: "shape-solid",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(1, 0), angle: 0 },
			}),
		];

		const pairIds = collectPairIds(broadPhase, proxies);
		if (pairIds.length !== 1 || pairIds[0] !== "sensor|solid") {
			throw new Error(`Expected sensor overlaps to remain candidates, got ${pairIds.join(", ")}`);
		}
	});

	test("keeps sensor-vs-sensor overlaps in the candidate set", () => {
		const broadPhase = new NaiveBroadPhase();
		const proxies = [
			createBroadPhaseProxy({
				proxyId: "sensor-a",
				bodyId: "body-sensor-a",
				shapeId: "shape-sensor-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: Vector.zero(), angle: 0 },
				isSensor: true,
			}),
			createBroadPhaseProxy({
				proxyId: "sensor-b",
				bodyId: "body-sensor-b",
				shapeId: "shape-sensor-b",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
				isSensor: true,
			}),
		];

		expect(collectPairIds(broadPhase, proxies)).toEqual(["sensor-a|sensor-b"]);
	});

	test("handles empty and single-proxy updates without emitting pairs", () => {
		const broadPhase = new NaiveBroadPhase();

		expect(collectPairIds(broadPhase, [])).toEqual([]);

		expect(
			collectPairIds(broadPhase, [
				createBroadPhaseProxy({
					proxyId: "solo",
					bodyId: "body-solo",
					shapeId: "shape-solo",
					shape: new CircleShape(Vector.zero(), 1),
					transform: { position: Vector.zero(), angle: 0 },
				}),
			])
		).toEqual([]);
	});

	test("replaces stale proxies when updateProxies is called again", () => {
		const broadPhase = new NaiveBroadPhase();
		const firstProxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-a",
				bodyId: "body-a",
				shapeId: "shape-a",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: Vector.zero(), angle: 0 },
			}),
			createBroadPhaseProxy({
				proxyId: "proxy-b",
				bodyId: "body-b",
				shapeId: "shape-b",
				shape: new CircleShape(Vector.zero(), 2),
				transform: { position: new Vector(1, 0), angle: 0 },
			}),
		];
		const secondProxies = [
			createBroadPhaseProxy({
				proxyId: "proxy-c",
				bodyId: "body-c",
				shapeId: "shape-c",
				shape: new CircleShape(Vector.zero(), 1),
				transform: { position: new Vector(10, 0), angle: 0 },
			}),
		];

		expect(collectPairIds(broadPhase, firstProxies)).toEqual(["proxy-a|proxy-b"]);
		expect(collectPairIds(broadPhase, secondProxies)).toEqual([]);
	});
});
