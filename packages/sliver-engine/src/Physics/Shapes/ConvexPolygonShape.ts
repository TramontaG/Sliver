import { Vector } from "../../Lib/Vector";
import { buildRectangleVertices, normalizeConvexVertices, SHAPE_EPSILON } from "./ShapeMath";
import {
	createAabbFromPoints,
	inverseTransformPoint,
	transformPoints,
} from "./Transform";
import type { Aabb, PhysicsTransform } from "./Transform";

class ConvexPolygonShape {
	private readonly vertices: readonly Vector[];

	constructor(vertices: readonly Vector[]) {
		this.vertices = normalizeConvexVertices(vertices);
	}

	static fromRectangle(
		size: Vector,
		center: Vector = Vector.zero()
	): ConvexPolygonShape {
		return new ConvexPolygonShape(buildRectangleVertices(size, center));
	}

	getLocalVertices(): Vector[] {
		return this.vertices.map((vertex) => vertex.clone());
	}

	getWorldVertices(transform: PhysicsTransform): Vector[] {
		return transformPoints(this.vertices, transform);
	}

	getAabb(transform: PhysicsTransform): Aabb {
		return createAabbFromPoints(this.getWorldVertices(transform));
	}

	containsPoint(point: Vector, transform: PhysicsTransform): boolean {
		const localPoint = inverseTransformPoint(point, transform);

		for (let index = 0; index < this.vertices.length; index++) {
			const current = this.vertices[index]!;
			const next = this.vertices[(index + 1) % this.vertices.length]!;
			const edge = next.toSubtracted(current);
			const pointOffset = localPoint.toSubtracted(current);
			const cross = edge.crossProduct(pointOffset);

			if (cross < -SHAPE_EPSILON) {
				return false;
			}
		}

		return true;
	}
}

export { ConvexPolygonShape };
