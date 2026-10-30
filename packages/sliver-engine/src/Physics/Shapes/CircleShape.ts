import { Vector } from "../../Lib/Vector";
import { createAabbFromPoints, transformPoint } from "./Transform";
import type { Aabb, PhysicsTransform } from "./Transform";

class CircleShape {
	public readonly center: Vector;
	public readonly radius: number;

	constructor(center: Vector, radius: number) {
		if (!Number.isFinite(radius) || radius <= 0) {
			throw new Error("Circle radius must be a positive finite number.");
		}

		this.center = center.clone();
		this.radius = radius;
	}

	getLocalCenter(): Vector {
		return this.center.clone();
	}

	getWorldCenter(transform: PhysicsTransform): Vector {
		return transformPoint(this.center, transform);
	}

	getAabb(transform: PhysicsTransform): Aabb {
		const worldCenter = this.getWorldCenter(transform);

		return createAabbFromPoints([
			new Vector(worldCenter.x - this.radius, worldCenter.y - this.radius),
			new Vector(worldCenter.x + this.radius, worldCenter.y + this.radius),
		]);
	}

	containsPoint(point: Vector, transform: PhysicsTransform): boolean {
		const worldCenter = this.getWorldCenter(transform);
		return point.toSubtracted(worldCenter).squaredMagnitude() <= this.radius * this.radius;
	}
}

export { CircleShape };
