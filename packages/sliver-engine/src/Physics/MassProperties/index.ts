import { CircleShape, ConvexPolygonShape } from "../Shapes";
import { Vector } from "../../Lib/Vector";

type MassProperties = {
	area: number;
	mass: number;
	invMass: number;
	centroid: Vector;
	// Inertia is expressed about the reported centroid, not about an arbitrary body origin.
	inertia: number;
	invInertia: number;
};

type ShapeMassContribution = MassProperties;

const resolveInverse = (value: number): number => {
	if (!Number.isFinite(value) || value <= 0) {
		return 0;
	}

	return 1 / value;
};

const createMassProperties = (
	area: number,
	mass: number,
	centroid: Vector,
	inertia: number
): MassProperties => {
	return {
		area,
		mass,
		invMass: resolveInverse(mass),
		centroid: centroid.clone(),
		inertia,
		invInertia: resolveInverse(inertia),
	};
};

const computeCircleMassProperties = (
	shape: CircleShape,
	density: number
): ShapeMassContribution => {
	if (!Number.isFinite(density) || density <= 0) {
		throw new Error("Density must be a finite positive number.");
	}

	const area = Math.PI * shape.radius * shape.radius;
	const mass = area * density;
	const centroid = shape.getLocalCenter();
	const inertia = mass * 0.5 * shape.radius * shape.radius;

	return createMassProperties(area, mass, centroid, inertia);
};

const computePolygonAreaAndCentroid = (
	vertices: readonly Vector[]
): { area: number; centroid: Vector } => {
	let doubledArea = 0;
	let centroidFactorX = 0;
	let centroidFactorY = 0;

	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index]!;
		const next = vertices[(index + 1) % vertices.length]!;
		const cross = current.crossProduct(next);
		doubledArea += cross;
		centroidFactorX += (current.x + next.x) * cross;
		centroidFactorY += (current.y + next.y) * cross;
	}

	const area = doubledArea * 0.5;
	if (Math.abs(area) <= 1e-12) {
		throw new Error("Polygon area must be non-zero.");
	}

	return {
		area,
		centroid: new Vector(
			centroidFactorX / (6 * area),
			centroidFactorY / (6 * area)
		),
	};
};

const computePolygonSecondMomentAboutOrigin = (
	vertices: readonly Vector[],
	density: number
): number => {
	let integral = 0;

	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index]!;
		const next = vertices[(index + 1) % vertices.length]!;
		const cross = current.crossProduct(next);
		const term =
			current.dotProduct(current) +
			current.dotProduct(next) +
			next.dotProduct(next);
		integral += cross * term;
	}

	return (density * integral) / 12;
};

const computePolygonMassProperties = (
	shape: ConvexPolygonShape,
	density: number
): ShapeMassContribution => {
	if (!Number.isFinite(density) || density <= 0) {
		throw new Error("Density must be a finite positive number.");
	}

	const vertices = shape.getLocalVertices();
	const { area, centroid } = computePolygonAreaAndCentroid(vertices);
	const resolvedArea = Math.abs(area);
	const mass = resolvedArea * density;
	const inertiaAboutOrigin = computePolygonSecondMomentAboutOrigin(vertices, density);
	const inertiaAboutCentroid = inertiaAboutOrigin - mass * centroid.squaredMagnitude();

	return createMassProperties(
		resolvedArea,
		mass,
		centroid,
		Math.max(inertiaAboutCentroid, 0)
	);
};

const computeCompoundMassProperties = (
	contributions: readonly ShapeMassContribution[]
): MassProperties => {
	if (contributions.length === 0) {
		throw new Error(
			"Compound mass properties require at least one shape contribution."
		);
	}

	let totalArea = 0;
	let totalMass = 0;
	let centroidAccumulator = Vector.zero();

	for (const contribution of contributions) {
		totalArea += contribution.area;
		totalMass += contribution.mass;
		centroidAccumulator.add(
			contribution.centroid.toMultiplied(contribution.mass)
		);
	}

	if (!Number.isFinite(totalMass) || totalMass <= 0) {
		throw new Error("Compound mass properties require a positive total mass.");
	}

	const centroid = centroidAccumulator.toMultiplied(1 / totalMass);
	// Shift each shape's centroid-space inertia into the compound centroid frame.
	const totalInertia = contributions.reduce((sum, contribution) => {
		const centroidOffsetSq = contribution.centroid
			.toSubtracted(centroid)
			.squaredMagnitude();
		return sum + contribution.inertia + contribution.mass * centroidOffsetSq;
	}, 0);

	return createMassProperties(totalArea, totalMass, centroid, totalInertia);
};

const toStaticMassProperties = (massProperties: MassProperties): MassProperties => {
	return {
		area: massProperties.area,
		mass: massProperties.mass,
		invMass: 0,
		centroid: massProperties.centroid.clone(),
		inertia: massProperties.inertia,
		invInertia: 0,
	};
};

export {
	computeCircleMassProperties,
	computeCompoundMassProperties,
	computePolygonMassProperties,
	toStaticMassProperties,
};

export type { MassProperties, ShapeMassContribution };
