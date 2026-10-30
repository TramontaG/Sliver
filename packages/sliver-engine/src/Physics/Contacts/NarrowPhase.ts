import { Vector } from "../../Lib/Vector";
import { CircleShape, ConvexPolygonShape } from "../Shapes";
import type { ContactManifold, ContactManifoldPoint } from "./ContactManifold";
import type { ContactProxy } from "./ContactProxy";

const CONTACT_EPSILON = 1e-9;

type ClippedVertex = {
	id: string;
	point: Vector;
};

type PolygonData = {
	vertices: Vector[];
	normals: Vector[];
};

const normalizeOrFallback = (
	vector: Vector,
	fallback: Vector = new Vector(1, 0)
): Vector => {
	const magnitude = vector.magnitude();
	if (magnitude <= CONTACT_EPSILON) {
		return fallback.clone();
	}

	return vector.toMultiplied(1 / magnitude);
};

const getPolygonData = (
	shape: ConvexPolygonShape,
	transform: ContactProxy["transform"]
): PolygonData => {
	const vertices = shape.getWorldVertices(transform);
	const normals = vertices.map((vertex, index) => {
		const next = vertices[(index + 1) % vertices.length]!;
		const edge = next.toSubtracted(vertex);
		return normalizeOrFallback(edge.toRightPerpendicular());
	});

	return { vertices, normals };
};

const buildManifold = (
	proxyA: ContactProxy,
	proxyB: ContactProxy,
	normal: Vector,
	points: ContactManifoldPoint[]
): ContactManifold | null => {
	if (points.length === 0) {
		return null;
	}

	const penetration = points.reduce(
		(maximumPenetration, point) => Math.max(maximumPenetration, point.penetration),
		0
	);

	if (penetration <= 0) {
		return null;
	}

	return {
		bodyIdA: proxyA.bodyId,
		bodyIdB: proxyB.bodyId,
		shapeIdA: proxyA.shapeId,
		shapeIdB: proxyB.shapeId,
		normal: normalizeOrFallback(normal),
		penetration,
		points: points.map((point) => ({
			id: point.id,
			position: point.position.clone(),
			penetration: point.penetration,
		})),
	};
};

const flipManifold = (
	manifold: ContactManifold,
	proxyA: ContactProxy,
	proxyB: ContactProxy
): ContactManifold => {
	return {
		bodyIdA: proxyA.bodyId,
		bodyIdB: proxyB.bodyId,
		shapeIdA: proxyA.shapeId,
		shapeIdB: proxyB.shapeId,
		normal: manifold.normal.toMultiplied(-1),
		penetration: manifold.penetration,
		points: manifold.points.map((point) => ({
			id: point.id,
			position: point.position.clone(),
			penetration: point.penetration,
		})),
	};
};

const collideCircleCircle = (
	proxyA: ContactProxy,
	proxyB: ContactProxy
): ContactManifold | null => {
	const circleA = proxyA.shape as CircleShape;
	const circleB = proxyB.shape as CircleShape;
	const centerA = circleA.getWorldCenter(proxyA.transform);
	const centerB = circleB.getWorldCenter(proxyB.transform);
	const centerDelta = centerB.toSubtracted(centerA);
	const radiusSum = circleA.radius + circleB.radius;
	const distanceSquared = centerDelta.squaredMagnitude();

	if (distanceSquared > radiusSum * radiusSum) {
		return null;
	}

	let normal = new Vector(1, 0);
	let contactPoint = centerA.clone();
	let penetration = radiusSum;

	if (distanceSquared > CONTACT_EPSILON) {
		const distance = Math.sqrt(distanceSquared);
		normal = centerDelta.toMultiplied(1 / distance);
		penetration = radiusSum - distance;
		const pointOnA = centerA.toAdded(normal.toMultiplied(circleA.radius));
		const pointOnB = centerB.toSubtracted(normal.toMultiplied(circleB.radius));
		contactPoint = pointOnA.toAdded(pointOnB).toMultiplied(0.5);
	}

	return buildManifold(proxyA, proxyB, normal, [
		{
			id: "circle-circle",
			position: contactPoint,
			penetration,
		},
	]);
};

const collideCirclePolygon = (
	circleProxy: ContactProxy,
	polygonProxy: ContactProxy
): ContactManifold | null => {
	const circle = circleProxy.shape as CircleShape;
	const polygon = polygonProxy.shape as ConvexPolygonShape;
	const circleCenter = circle.getWorldCenter(circleProxy.transform);
	const polygonData = getPolygonData(polygon, polygonProxy.transform);

	let bestSeparation = Number.NEGATIVE_INFINITY;
	let bestFaceIndex = 0;

	for (let index = 0; index < polygonData.vertices.length; index++) {
		const vertex = polygonData.vertices[index]!;
		const separation = polygonData.normals[index]!.dotProduct(
			circleCenter.toSubtracted(vertex)
		);

		if (separation > circle.radius) {
			return null;
		}

		if (separation > bestSeparation) {
			bestSeparation = separation;
			bestFaceIndex = index;
		}
	}

	const faceNormal = polygonData.normals[bestFaceIndex]!;
	const faceStart = polygonData.vertices[bestFaceIndex]!;
	const faceEnd =
		polygonData.vertices[(bestFaceIndex + 1) % polygonData.vertices.length]!;
	const edge = faceEnd.toSubtracted(faceStart);
	const edgeLengthSquared = edge.squaredMagnitude();
	const projectedDistance =
		edgeLengthSquared <= CONTACT_EPSILON
			? 0
			: circleCenter.toSubtracted(faceStart).dotProduct(edge) / edgeLengthSquared;

	if (bestSeparation < 0) {
		const contactPoint = circleCenter.toAdded(
			faceNormal.toMultiplied(-bestSeparation)
		);
		return buildManifold(circleProxy, polygonProxy, faceNormal, [
			{
				id: `face-${bestFaceIndex}`,
				position: contactPoint,
				penetration: circle.radius - bestSeparation,
			},
		]);
	}

	if (projectedDistance <= 0) {
		const closestVertex = faceStart;
		const delta = closestVertex.toSubtracted(circleCenter);
		const distanceSquared = delta.squaredMagnitude();

		if (distanceSquared > circle.radius * circle.radius) {
			return null;
		}

		const distance = Math.sqrt(distanceSquared);
		const normal = distance <= CONTACT_EPSILON
			? faceNormal.toMultiplied(-1)
			: delta.toMultiplied(1 / distance);

		return buildManifold(circleProxy, polygonProxy, normal, [
			{
				id: `vertex-${bestFaceIndex}`,
				position: closestVertex,
				penetration: circle.radius - distance,
			},
		]);
	}

	if (projectedDistance >= 1) {
		const closestVertex = faceEnd;
		const delta = closestVertex.toSubtracted(circleCenter);
		const distanceSquared = delta.squaredMagnitude();

		if (distanceSquared > circle.radius * circle.radius) {
			return null;
		}

		const distance = Math.sqrt(distanceSquared);
		const normal = distance <= CONTACT_EPSILON
			? faceNormal.toMultiplied(-1)
			: delta.toMultiplied(1 / distance);

		return buildManifold(circleProxy, polygonProxy, normal, [
			{
				id: `vertex-${(bestFaceIndex + 1) % polygonData.vertices.length}`,
				position: closestVertex,
				penetration: circle.radius - distance,
			},
		]);
	}

	const closestPoint = faceStart.toAdded(edge.toMultiplied(projectedDistance));
	const delta = closestPoint.toSubtracted(circleCenter);
	const distanceSquared = delta.squaredMagnitude();

	if (distanceSquared > circle.radius * circle.radius) {
		return null;
	}

	const distance = Math.sqrt(distanceSquared);
	const normal = distance <= CONTACT_EPSILON
		? faceNormal.toMultiplied(-1)
		: delta.toMultiplied(1 / distance);

	return buildManifold(circleProxy, polygonProxy, normal, [
		{
			id: `face-${bestFaceIndex}`,
			position: closestPoint,
			penetration: circle.radius - distance,
		},
	]);
};

const projectVerticesOntoAxis = (
	vertices: readonly Vector[],
	axis: Vector
): { min: number; max: number } => {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	for (const vertex of vertices) {
		const projection = vertex.dotProduct(axis);
		min = Math.min(min, projection);
		max = Math.max(max, projection);
	}

	return { min, max };
};

const findMaxSeparation = (
	reference: PolygonData,
	incident: PolygonData
): { separation: number; faceIndex: number } => {
	let bestSeparation = Number.NEGATIVE_INFINITY;
	let bestFaceIndex = 0;

	for (let index = 0; index < reference.normals.length; index++) {
		const normal = reference.normals[index]!;
		const referenceOffset = normal.dotProduct(reference.vertices[index]!);
		const incidentProjection = projectVerticesOntoAxis(incident.vertices, normal).min;
		const separation = incidentProjection - referenceOffset;

		if (separation > bestSeparation) {
			bestSeparation = separation;
			bestFaceIndex = index;
		}
	}

	return {
		separation: bestSeparation,
		faceIndex: bestFaceIndex,
	};
};

const findIncidentEdge = (
	polygon: PolygonData,
	referenceNormal: Vector
): { edgeIndex: number; vertices: [ClippedVertex, ClippedVertex] } => {
	let bestDot = Number.POSITIVE_INFINITY;
	let bestEdgeIndex = 0;

	for (let index = 0; index < polygon.normals.length; index++) {
		const dot = referenceNormal.dotProduct(polygon.normals[index]!);
		if (dot < bestDot) {
			bestDot = dot;
			bestEdgeIndex = index;
		}
	}

	return {
		edgeIndex: bestEdgeIndex,
		vertices: [
			{
				id: `v${bestEdgeIndex}`,
				point: polygon.vertices[bestEdgeIndex]!.clone(),
			},
			{
				id: `v${(bestEdgeIndex + 1) % polygon.vertices.length}`,
				point: polygon.vertices[(bestEdgeIndex + 1) % polygon.vertices.length]!.clone(),
			},
		],
	};
};

const clipSegmentToLine = (
	vertices: readonly ClippedVertex[],
	normal: Vector,
	offset: number
): ClippedVertex[] => {
	const distanceA = normal.dotProduct(vertices[0]!.point) - offset;
	const distanceB = normal.dotProduct(vertices[1]!.point) - offset;
	const output: ClippedVertex[] = [];

	if (distanceA <= CONTACT_EPSILON) {
		output.push({
			id: vertices[0]!.id,
			point: vertices[0]!.point.clone(),
		});
	}

	if (distanceB <= CONTACT_EPSILON) {
		output.push({
			id: vertices[1]!.id,
			point: vertices[1]!.point.clone(),
		});
	}

	if (distanceA * distanceB < -CONTACT_EPSILON) {
		const interpolation = distanceA / (distanceA - distanceB);
		const point = vertices[0]!.point.toAdded(
			vertices[1]!.point
				.toSubtracted(vertices[0]!.point)
				.toMultiplied(interpolation)
		);
		output.push({
			id: distanceA > 0 ? vertices[1]!.id : vertices[0]!.id,
			point,
		});
	}

	if (output.length > 2) {
		return output.slice(0, 2);
	}

	return output;
};

const collidePolygonPolygon = (
	proxyA: ContactProxy,
	proxyB: ContactProxy
): ContactManifold | null => {
	const polygonA = getPolygonData(proxyA.shape as ConvexPolygonShape, proxyA.transform);
	const polygonB = getPolygonData(proxyB.shape as ConvexPolygonShape, proxyB.transform);

	const separationA = findMaxSeparation(polygonA, polygonB);
	if (separationA.separation > 0) {
		return null;
	}

	const separationB = findMaxSeparation(polygonB, polygonA);
	if (separationB.separation > 0) {
		return null;
	}

	const usePolygonBAsReference = separationB.separation > separationA.separation + 1e-6;
	const referencePolygon = usePolygonBAsReference ? polygonB : polygonA;
	const incidentPolygon = usePolygonBAsReference ? polygonA : polygonB;
	const referenceFaceIndex = usePolygonBAsReference
		? separationB.faceIndex
		: separationA.faceIndex;
	const referenceNormal = referencePolygon.normals[referenceFaceIndex]!;
	const referenceFaceStart = referencePolygon.vertices[referenceFaceIndex]!;
	const referenceFaceEnd =
		referencePolygon.vertices[
			(referenceFaceIndex + 1) % referencePolygon.vertices.length
		]!;
	const sideNormal = normalizeOrFallback(
		referenceFaceEnd.toSubtracted(referenceFaceStart)
	);
	const incidentEdge = findIncidentEdge(incidentPolygon, referenceNormal);
	let clippedPoints: ClippedVertex[] = incidentEdge.vertices.map((vertex) => ({
		id: vertex.id,
		point: vertex.point.clone(),
	}));

	clippedPoints = clipSegmentToLine(
		clippedPoints,
		sideNormal.toMultiplied(-1),
		-sideNormal.dotProduct(referenceFaceStart)
	);
	if (clippedPoints.length < 2) {
		return null;
	}

	clippedPoints = clipSegmentToLine(
		clippedPoints,
		sideNormal,
		sideNormal.dotProduct(referenceFaceEnd)
	);
	if (clippedPoints.length < 1) {
		return null;
	}

	const referenceOffset = referenceNormal.dotProduct(referenceFaceStart);
	const points = clippedPoints
		.map((point) => {
			const separation = referenceNormal.dotProduct(point.point) - referenceOffset;
			if (separation > CONTACT_EPSILON) {
				return null;
			}

			return {
				id: `f${referenceFaceIndex}|${point.id}`,
				position: point.point.toSubtracted(
					referenceNormal.toMultiplied(separation)
				),
				penetration: -separation,
			};
		})
		.filter((point): point is ContactManifoldPoint => point !== null)
		.sort((pointA, pointB) => {
			return pointA.position.dotProduct(sideNormal) - pointB.position.dotProduct(sideNormal);
		});

	const normal = usePolygonBAsReference
		? referenceNormal.toMultiplied(-1)
		: referenceNormal;
	return buildManifold(proxyA, proxyB, normal, points);
};

const generateContactManifold = (
	proxyA: ContactProxy,
	proxyB: ContactProxy
): ContactManifold | null => {
	if (proxyA.shape instanceof CircleShape && proxyB.shape instanceof CircleShape) {
		return collideCircleCircle(proxyA, proxyB);
	}

	if (
		proxyA.shape instanceof CircleShape &&
		proxyB.shape instanceof ConvexPolygonShape
	) {
		return collideCirclePolygon(proxyA, proxyB);
	}

	if (
		proxyA.shape instanceof ConvexPolygonShape &&
		proxyB.shape instanceof CircleShape
	) {
		const manifold = collideCirclePolygon(proxyB, proxyA);
		if (manifold === null) {
			return null;
		}

		return flipManifold(manifold, proxyA, proxyB);
	}

	if (
		proxyA.shape instanceof ConvexPolygonShape &&
		proxyB.shape instanceof ConvexPolygonShape
	) {
		return collidePolygonPolygon(proxyA, proxyB);
	}

	return null;
};

export { generateContactManifold };
