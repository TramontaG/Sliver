import { Vector } from "../../Lib/Vector";
import { ConvexPolygonShape } from "../Shapes";
import { SHAPE_EPSILON } from "../Shapes/ShapeMath";

const MAX_CONVEX_PART_VERTICES = 8;

const arePointsEqual = (a: Vector, b: Vector): boolean => {
	return (
		Math.abs(a.x - b.x) <= SHAPE_EPSILON &&
		Math.abs(a.y - b.y) <= SHAPE_EPSILON
	);
};

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

const assertFiniteVertices = (vertices: readonly Vector[]): void => {
	for (const vertex of vertices) {
		if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) {
			throw new Error("Polygon vertices must contain only finite coordinates.");
		}
	}
};

const stripRepeatedClosingVertex = (vertices: readonly Vector[]): Vector[] => {
	const clonedVertices = vertices.map((vertex) => vertex.clone());
	if (clonedVertices.length < 2) {
		return clonedVertices;
	}

	const firstVertex = clonedVertices[0]!;
	const lastVertex = clonedVertices[clonedVertices.length - 1]!;
	if (arePointsEqual(firstVertex, lastVertex)) {
		clonedVertices.pop();
	}

	return clonedVertices;
};

const assertNoConsecutiveDuplicates = (vertices: readonly Vector[]): void => {
	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index]!;
		const next = vertices[(index + 1) % vertices.length]!;

		if (arePointsEqual(current, next)) {
			throw new Error("Polygon vertices must not contain consecutive duplicates.");
		}
	}
};

const assertNoRepeatedVertices = (vertices: readonly Vector[]): void => {
	for (let index = 0; index < vertices.length; index++) {
		for (let compareIndex = index + 1; compareIndex < vertices.length; compareIndex++) {
			if (arePointsEqual(vertices[index]!, vertices[compareIndex]!)) {
				throw new Error("Polygon vertices must not repeat.");
			}
		}
	}
};

const removeCollinearVertices = (vertices: readonly Vector[]): Vector[] => {
	let normalizedVertices = vertices.map((vertex) => vertex.clone());
	let changed = true;

	while (changed) {
		if (normalizedVertices.length < 3) {
			return normalizedVertices;
		}

		changed = false;
		const nextVertices: Vector[] = [];

		for (let index = 0; index < normalizedVertices.length; index++) {
			const previous =
				normalizedVertices[
					(index - 1 + normalizedVertices.length) % normalizedVertices.length
				]!;
			const current = normalizedVertices[index]!;
			const next = normalizedVertices[(index + 1) % normalizedVertices.length]!;
			const previousEdge = current.toSubtracted(previous);
			const nextEdge = next.toSubtracted(current);
			const cross = previousEdge.crossProduct(nextEdge);
			const dot = previousEdge.dotProduct(nextEdge);

			if (Math.abs(cross) <= SHAPE_EPSILON && dot >= 0) {
				changed = true;
				continue;
			}

			nextVertices.push(current);
		}

		normalizedVertices = nextVertices;
	}

	return normalizedVertices;
};

const orientation = (a: Vector, b: Vector, c: Vector): number => {
	return b.toSubtracted(a).crossProduct(c.toSubtracted(a));
};

const isPointOnSegment = (point: Vector, start: Vector, end: Vector): boolean => {
	if (Math.abs(orientation(start, end, point)) > SHAPE_EPSILON) {
		return false;
	}

	return (
		point.x >= Math.min(start.x, end.x) - SHAPE_EPSILON &&
		point.x <= Math.max(start.x, end.x) + SHAPE_EPSILON &&
		point.y >= Math.min(start.y, end.y) - SHAPE_EPSILON &&
		point.y <= Math.max(start.y, end.y) + SHAPE_EPSILON
	);
};

const segmentsIntersect = (
	startA: Vector,
	endA: Vector,
	startB: Vector,
	endB: Vector
): boolean => {
	const orientationAStart = orientation(startA, endA, startB);
	const orientationAEnd = orientation(startA, endA, endB);
	const orientationBStart = orientation(startB, endB, startA);
	const orientationBEnd = orientation(startB, endB, endA);

	const hasProperIntersection =
		((orientationAStart > SHAPE_EPSILON && orientationAEnd < -SHAPE_EPSILON) ||
			(orientationAStart < -SHAPE_EPSILON && orientationAEnd > SHAPE_EPSILON)) &&
		((orientationBStart > SHAPE_EPSILON && orientationBEnd < -SHAPE_EPSILON) ||
			(orientationBStart < -SHAPE_EPSILON && orientationBEnd > SHAPE_EPSILON));

	if (hasProperIntersection) {
		return true;
	}

	return (
		isPointOnSegment(startB, startA, endA) ||
		isPointOnSegment(endB, startA, endA) ||
		isPointOnSegment(startA, startB, endB) ||
		isPointOnSegment(endA, startB, endB)
	);
};

const assertSimplePolygon = (vertices: readonly Vector[]): void => {
	for (let firstEdgeIndex = 0; firstEdgeIndex < vertices.length; firstEdgeIndex++) {
		const firstStart = vertices[firstEdgeIndex]!;
		const firstEnd = vertices[(firstEdgeIndex + 1) % vertices.length]!;

		for (
			let secondEdgeIndex = firstEdgeIndex + 1;
			secondEdgeIndex < vertices.length;
			secondEdgeIndex++
		) {
			const areSameEdge = firstEdgeIndex === secondEdgeIndex;
			const shareForwardVertex =
				(firstEdgeIndex + 1) % vertices.length === secondEdgeIndex;
			const shareBackwardVertex =
				firstEdgeIndex === (secondEdgeIndex + 1) % vertices.length;

			if (areSameEdge || shareForwardVertex || shareBackwardVertex) {
				continue;
			}

			const secondStart = vertices[secondEdgeIndex]!;
			const secondEnd = vertices[(secondEdgeIndex + 1) % vertices.length]!;

			if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
				throw new Error("Polygon must be simple and non-self-intersecting.");
			}
		}
	}
};

const normalizeSimplePolygonVertices = (vertices: readonly Vector[]): Vector[] => {
	assertFiniteVertices(vertices);

	const withoutRepeatedClosingVertex = stripRepeatedClosingVertex(vertices);
	if (withoutRepeatedClosingVertex.length < 3) {
		throw new Error("Polygons require at least three distinct vertices.");
	}

	assertNoConsecutiveDuplicates(withoutRepeatedClosingVertex);
	assertNoRepeatedVertices(withoutRepeatedClosingVertex);

	const normalizedVertices = removeCollinearVertices(withoutRepeatedClosingVertex);
	if (normalizedVertices.length < 3) {
		throw new Error("Polygon must span a non-zero area.");
	}

	const signedArea = computeSignedArea(normalizedVertices);
	if (Math.abs(signedArea) <= SHAPE_EPSILON) {
		throw new Error("Polygon must span a non-zero area.");
	}

	assertSimplePolygon(normalizedVertices);

	if (signedArea < 0) {
		normalizedVertices.reverse();
	}

	return normalizedVertices;
};

const isConvexNormalizedPolygon = (vertices: readonly Vector[]): boolean => {
	let hasPositiveCross = false;

	for (let index = 0; index < vertices.length; index++) {
		const previous = vertices[index]!;
		const current = vertices[(index + 1) % vertices.length]!;
		const next = vertices[(index + 2) % vertices.length]!;
		const cross = current
			.toSubtracted(previous)
			.crossProduct(next.toSubtracted(current));

		if (cross < -SHAPE_EPSILON) {
			return false;
		}

		if (cross > SHAPE_EPSILON) {
			hasPositiveCross = true;
		}
	}

	return hasPositiveCross;
};

const isConvexPolygon = (vertices: readonly Vector[]): boolean => {
	return isConvexNormalizedPolygon(normalizeSimplePolygonVertices(vertices));
};

const isPointInTriangle = (
	point: Vector,
	a: Vector,
	b: Vector,
	c: Vector
): boolean => {
	const ab = orientation(a, b, point);
	const bc = orientation(b, c, point);
	const ca = orientation(c, a, point);

	return (
		ab >= -SHAPE_EPSILON &&
		bc >= -SHAPE_EPSILON &&
		ca >= -SHAPE_EPSILON
	);
};

const triangulateNormalizedSimplePolygon = (
	vertices: readonly Vector[]
): Vector[][] => {
	if (vertices.length === 3) {
		return [vertices.map((vertex) => vertex.clone())];
	}

	const remainingVertices = vertices.map((vertex) => vertex.clone());
	const triangles: Vector[][] = [];

	while (remainingVertices.length > 3) {
		let earFound = false;

		for (let index = 0; index < remainingVertices.length; index++) {
			const previous =
				remainingVertices[
					(index - 1 + remainingVertices.length) % remainingVertices.length
				]!;
			const current = remainingVertices[index]!;
			const next = remainingVertices[(index + 1) % remainingVertices.length]!;
			const earCross = orientation(previous, current, next);

			if (earCross <= SHAPE_EPSILON) {
				continue;
			}

			const triangle = [previous, current, next];
			if (computeArea(triangle) <= SHAPE_EPSILON) {
				throw new Error("Polygon triangulation produced a degenerate triangle.");
			}

			let containsOtherVertex = false;

			for (
				let vertexIndex = 0;
				vertexIndex < remainingVertices.length;
				vertexIndex++
			) {
				if (
					vertexIndex === index ||
					vertexIndex ===
						(index - 1 + remainingVertices.length) % remainingVertices.length ||
					vertexIndex === (index + 1) % remainingVertices.length
				) {
					continue;
				}

				if (
					isPointInTriangle(
						remainingVertices[vertexIndex]!,
						previous,
						current,
						next
					)
				) {
					containsOtherVertex = true;
					break;
				}
			}

			if (containsOtherVertex) {
				continue;
			}

			triangles.push(triangle.map((vertex) => vertex.clone()));
			remainingVertices.splice(index, 1);
			earFound = true;
			break;
		}

		if (!earFound) {
			throw new Error("Failed to triangulate polygon deterministically.");
		}
	}

	if (computeArea(remainingVertices) <= SHAPE_EPSILON) {
		throw new Error("Polygon triangulation produced a degenerate triangle.");
	}

	triangles.push(remainingVertices.map((vertex) => vertex.clone()));
	return triangles;
};

const triangulateSimplePolygon = (
	vertices: readonly Vector[]
): ConvexPolygonShape[] => {
	return triangulateNormalizedSimplePolygon(
		normalizeSimplePolygonVertices(vertices)
	).map((triangleVertices) => new ConvexPolygonShape(triangleVertices));
};

const collectUniqueVertices = (
	firstPolygon: readonly Vector[],
	secondPolygon: readonly Vector[]
): Vector[] => {
	const uniqueVertices: Vector[] = [];

	for (const vertex of [...firstPolygon, ...secondPolygon]) {
		const alreadyPresent = uniqueVertices.some((existingVertex) =>
			arePointsEqual(existingVertex, vertex)
		);

		if (!alreadyPresent) {
			uniqueVertices.push(vertex.clone());
		}
	}

	return uniqueVertices;
};

const countSharedVertices = (
	firstPolygon: readonly Vector[],
	secondPolygon: readonly Vector[]
): number => {
	let sharedVertexCount = 0;

	for (const firstVertex of firstPolygon) {
		if (
			secondPolygon.some((secondVertex) => arePointsEqual(firstVertex, secondVertex))
		) {
			sharedVertexCount += 1;
		}
	}

	return sharedVertexCount;
};

const computeConvexHull = (vertices: readonly Vector[]): Vector[] => {
	const sortedVertices = vertices
		.map((vertex) => vertex.clone())
		.sort((left, right) => {
			if (left.x !== right.x) {
				return left.x - right.x;
			}

			return left.y - right.y;
		});
	const uniqueSortedVertices: Vector[] = [];

	for (const vertex of sortedVertices) {
		if (
			uniqueSortedVertices.length > 0 &&
			arePointsEqual(uniqueSortedVertices[uniqueSortedVertices.length - 1]!, vertex)
		) {
			continue;
		}

		uniqueSortedVertices.push(vertex);
	}

	if (uniqueSortedVertices.length <= 1) {
		return uniqueSortedVertices;
	}

	const lowerHull: Vector[] = [];
	for (const vertex of uniqueSortedVertices) {
		while (lowerHull.length >= 2) {
			const cross = orientation(
				lowerHull[lowerHull.length - 2]!,
				lowerHull[lowerHull.length - 1]!,
				vertex
			);
			if (cross > SHAPE_EPSILON) {
				break;
			}

			lowerHull.pop();
		}

		lowerHull.push(vertex);
	}

	const upperHull: Vector[] = [];
	for (let index = uniqueSortedVertices.length - 1; index >= 0; index--) {
		const vertex = uniqueSortedVertices[index]!;
		while (upperHull.length >= 2) {
			const cross = orientation(
				upperHull[upperHull.length - 2]!,
				upperHull[upperHull.length - 1]!,
				vertex
			);
			if (cross > SHAPE_EPSILON) {
				break;
			}

			upperHull.pop();
		}

		upperHull.push(vertex);
	}

	lowerHull.pop();
	upperHull.pop();
	return [...lowerHull, ...upperHull];
};

const tryMergeConvexPolygons = (
	firstPolygon: readonly Vector[],
	secondPolygon: readonly Vector[]
): Vector[] | null => {
	if (countSharedVertices(firstPolygon, secondPolygon) !== 2) {
		return null;
	}

	const uniqueVertices = collectUniqueVertices(firstPolygon, secondPolygon);
	if (uniqueVertices.length > MAX_CONVEX_PART_VERTICES) {
		return null;
	}

	const hull = computeConvexHull(uniqueVertices);
	if (hull.length < 3 || hull.length !== uniqueVertices.length) {
		return null;
	}

	const mergedArea = computeArea(hull);
	const sourceArea = computeArea(firstPolygon) + computeArea(secondPolygon);
	const areaTolerance =
		Math.max(1, sourceArea) * SHAPE_EPSILON * 10;

	if (Math.abs(mergedArea - sourceArea) > areaTolerance) {
		return null;
	}

	return hull;
};

const greedyMergeConvexPolygons = (polygons: readonly Vector[][]): Vector[][] => {
	const remainingPolygons = polygons.map((polygon) =>
		polygon.map((vertex) => vertex.clone())
	);
	let merged = true;

	while (merged) {
		merged = false;

		for (let firstIndex = 0; firstIndex < remainingPolygons.length; firstIndex++) {
			for (
				let secondIndex = firstIndex + 1;
				secondIndex < remainingPolygons.length;
				secondIndex++
			) {
				const mergedPolygon = tryMergeConvexPolygons(
					remainingPolygons[firstIndex]!,
					remainingPolygons[secondIndex]!
				);

				if (mergedPolygon === null) {
					continue;
				}

				remainingPolygons.splice(secondIndex, 1);
				remainingPolygons.splice(firstIndex, 1, mergedPolygon);
				merged = true;
				break;
			}

			if (merged) {
				break;
			}
		}
	}

	return remainingPolygons;
};

const decomposePolygonIntoConvexParts = (
	vertices: readonly Vector[]
): ConvexPolygonShape[] => {
	const normalizedVertices = normalizeSimplePolygonVertices(vertices);
	if (isConvexNormalizedPolygon(normalizedVertices)) {
		return [new ConvexPolygonShape(normalizedVertices)];
	}

	return greedyMergeConvexPolygons(
		triangulateNormalizedSimplePolygon(normalizedVertices)
	).map((polygonVertices) => new ConvexPolygonShape(polygonVertices));
};

export {
	MAX_CONVEX_PART_VERTICES,
	decomposePolygonIntoConvexParts,
	isConvexPolygon,
	normalizeSimplePolygonVertices,
	triangulateSimplePolygon,
};
