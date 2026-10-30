import { Vector } from "../../Lib/Vector";

const SHAPE_EPSILON = 1e-9;

const computeSignedArea = (vertices: readonly Vector[]): number => {
	let doubledArea = 0;

	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index]!;
		const next = vertices[(index + 1) % vertices.length]!;
		doubledArea += current.x * next.y - next.x * current.y;
	}

	return doubledArea * 0.5;
};

const ensureConvexVertices = (vertices: readonly Vector[]): void => {
	if (vertices.length < 3) {
		throw new Error("Convex polygons require at least three vertices.");
	}

	let windingDirection = 0;

	for (let index = 0; index < vertices.length; index++) {
		const previous = vertices[index]!;
		const current = vertices[(index + 1) % vertices.length]!;
		const next = vertices[(index + 2) % vertices.length]!;
		const edgeA = current.toSubtracted(previous);
		const edgeB = next.toSubtracted(current);
		const cross = edgeA.crossProduct(edgeB);

		if (Math.abs(cross) <= SHAPE_EPSILON) {
			continue;
		}

		const currentDirection = Math.sign(cross);
		if (windingDirection === 0) {
			windingDirection = currentDirection;
			continue;
		}

		if (currentDirection !== windingDirection) {
			throw new Error("Vertices must define a convex polygon.");
		}
	}

	if (windingDirection === 0) {
		throw new Error("Convex polygons must have non-zero area.");
	}
};

const normalizeConvexVertices = (vertices: readonly Vector[]): Vector[] => {
	const clonedVertices = vertices.map((vertex) => vertex.clone());
	ensureConvexVertices(clonedVertices);

	if (computeSignedArea(clonedVertices) < 0) {
		clonedVertices.reverse();
	}

	return clonedVertices;
};

const buildRectangleVertices = (
	size: Vector,
	center: Vector = Vector.zero()
): Vector[] => {
	if (size.x <= 0 || size.y <= 0) {
		throw new Error("Rectangle size must be positive on both axes.");
	}

	const halfX = size.x / 2;
	const halfY = size.y / 2;

	return [
		new Vector(center.x - halfX, center.y - halfY),
		new Vector(center.x + halfX, center.y - halfY),
		new Vector(center.x + halfX, center.y + halfY),
		new Vector(center.x - halfX, center.y + halfY),
	];
};

export { buildRectangleVertices, normalizeConvexVertices, SHAPE_EPSILON };
