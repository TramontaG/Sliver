import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	computeCircleMassProperties,
	computeCompoundMassProperties,
	computePolygonMassProperties,
	toStaticMassProperties,
} from "../../../src/Physics";
import type { ShapeMassContribution } from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import {
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

const MASS_EPSILON = 1e-9;

describe("Mass, centroid, and inertia", () => {
	test("computes circle mass properties about the shape centroid", () => {
		const circle = new CircleShape(new Vector(2, -1), 3);
		const massProperties = computeCircleMassProperties(circle, 2);
		const expectedMass = Math.PI * 9 * 2;
		const expectedInertia = expectedMass * 0.5 * 9;

		expectCloseToNumber(massProperties.area, Math.PI * 9, MASS_EPSILON);
		expectCloseToNumber(massProperties.mass, expectedMass, MASS_EPSILON);
		expectCloseToNumber(massProperties.invMass, 1 / expectedMass, MASS_EPSILON);
		expectCloseToVector(massProperties.centroid, new Vector(2, -1), MASS_EPSILON);
		expectCloseToNumber(massProperties.inertia, expectedInertia, MASS_EPSILON);
		expectCloseToNumber(
			massProperties.invInertia,
			1 / expectedInertia,
			MASS_EPSILON
		);
	});

	test("computes rectangle-as-polygon mass properties", () => {
		const rectangle = ConvexPolygonShape.fromRectangle(new Vector(4, 2));
		const massProperties = computePolygonMassProperties(rectangle, 3);
		const expectedMass = 4 * 2 * 3;
		const expectedInertia = (expectedMass * (4 * 4 + 2 * 2)) / 12;

		expectCloseToNumber(massProperties.area, 8, MASS_EPSILON);
		expectCloseToVector(massProperties.centroid, Vector.zero(), MASS_EPSILON);
		expectCloseToNumber(massProperties.mass, expectedMass, MASS_EPSILON);
		expectCloseToNumber(massProperties.invMass, 1 / expectedMass, MASS_EPSILON);
		expectCloseToNumber(massProperties.inertia, expectedInertia, MASS_EPSILON);
		expectCloseToNumber(
			massProperties.invInertia,
			1 / expectedInertia,
			MASS_EPSILON
		);
	});

	test("computes offset rectangle centroid without changing centroid-space inertia", () => {
		const rectangle = ConvexPolygonShape.fromRectangle(
			new Vector(4, 2),
			new Vector(3, -2)
		);
		const massProperties = computePolygonMassProperties(rectangle, 3);
		const expectedMass = 4 * 2 * 3;
		const expectedInertia = (expectedMass * (4 * 4 + 2 * 2)) / 12;

		expectCloseToNumber(massProperties.area, 8, MASS_EPSILON);
		expectCloseToVector(massProperties.centroid, new Vector(3, -2), MASS_EPSILON);
		expectCloseToNumber(massProperties.mass, expectedMass, MASS_EPSILON);
		expectCloseToNumber(massProperties.inertia, expectedInertia, MASS_EPSILON);
	});

	test("computes triangle centroid and inertia", () => {
		const triangle = new ConvexPolygonShape([
			new Vector(0, 0),
			new Vector(4, 0),
			new Vector(0, 2),
		]);
		const massProperties = computePolygonMassProperties(triangle, 1.5);
		const expectedArea = 4;
		const expectedMass = expectedArea * 1.5;
		const expectedCentroid = new Vector(4 / 3, 2 / 3);
		// Right triangle centroid-space inertia: I_cm = m(a^2 + b^2) / 18.
		const expectedInertia = (expectedMass * (4 * 4 + 2 * 2)) / 18;

		expectCloseToNumber(massProperties.area, expectedArea, MASS_EPSILON);
		expectCloseToNumber(massProperties.mass, expectedMass, MASS_EPSILON);
		expectCloseToVector(massProperties.centroid, expectedCentroid, MASS_EPSILON);
		expectCloseToNumber(massProperties.inertia, expectedInertia, MASS_EPSILON);
	});

	test("computes the same polygon mass properties regardless of winding order", () => {
		const ccwTriangle = new ConvexPolygonShape([
			new Vector(0, 0),
			new Vector(4, 0),
			new Vector(0, 2),
		]);
		const cwTriangle = new ConvexPolygonShape([
			new Vector(0, 2),
			new Vector(4, 0),
			new Vector(0, 0),
		]);

		const ccw = computePolygonMassProperties(ccwTriangle, 1.5);
		const cw = computePolygonMassProperties(cwTriangle, 1.5);

		expectCloseToNumber(cw.area, ccw.area, MASS_EPSILON);
		expectCloseToNumber(cw.mass, ccw.mass, MASS_EPSILON);
		expectCloseToVector(cw.centroid, ccw.centroid, MASS_EPSILON);
		expectCloseToNumber(cw.inertia, ccw.inertia, MASS_EPSILON);
		expectCloseToNumber(cw.invMass, ccw.invMass, MASS_EPSILON);
		expectCloseToNumber(cw.invInertia, ccw.invInertia, MASS_EPSILON);
	});

	test("rejects non-positive circle density", () => {
		expect(() =>
			computeCircleMassProperties(new CircleShape(Vector.zero(), 1), 0)
		).toThrow();
		expect(() =>
			computeCircleMassProperties(new CircleShape(Vector.zero(), 1), -1)
		).toThrow();
	});

	test("rejects non-positive polygon density", () => {
		const rectangle = ConvexPolygonShape.fromRectangle(new Vector(2, 2));

		expect(() => computePolygonMassProperties(rectangle, 0)).toThrow();
		expect(() => computePolygonMassProperties(rectangle, -1)).toThrow();
	});

	test("computes compound centroid from multiple convex parts", () => {
		const circleContribution = computeCircleMassProperties(
			new CircleShape(new Vector(-2, 0), 1),
			2
		);
		const rectangleContribution = computePolygonMassProperties(
			ConvexPolygonShape.fromRectangle(new Vector(2, 2), new Vector(3, 0)),
			2
		);
		const contributions: ShapeMassContribution[] = [
			circleContribution,
			rectangleContribution,
		];
		const expectedCentroidX =
			(circleContribution.centroid.x * circleContribution.mass +
				rectangleContribution.centroid.x * rectangleContribution.mass) /
			(circleContribution.mass + rectangleContribution.mass);

		const compound = computeCompoundMassProperties(contributions);
		expectCloseToNumber(compound.mass, 8 + 2 * Math.PI, MASS_EPSILON);
		expectCloseToVector(compound.centroid, new Vector(expectedCentroidX, 0), MASS_EPSILON);
	});

	test("matches the direct shape result for a single-shape compound", () => {
		const contribution = computeCircleMassProperties(
			new CircleShape(new Vector(2, -1), 3),
			2
		);
		const compound = computeCompoundMassProperties([contribution]);

		expectCloseToNumber(compound.area, contribution.area, MASS_EPSILON);
		expectCloseToNumber(compound.mass, contribution.mass, MASS_EPSILON);
		expectCloseToNumber(compound.invMass, contribution.invMass, MASS_EPSILON);
		expectCloseToVector(compound.centroid, contribution.centroid, MASS_EPSILON);
		expectCloseToNumber(compound.inertia, contribution.inertia, MASS_EPSILON);
		expectCloseToNumber(
			compound.invInertia,
			contribution.invInertia,
			MASS_EPSILON
		);
	});

	test("computes compound centroid and inertia with mixed densities", () => {
		const leftRectangle = computePolygonMassProperties(
			ConvexPolygonShape.fromRectangle(new Vector(2, 2), new Vector(-2, 0)),
			1
		);
		const rightRectangle = computePolygonMassProperties(
			ConvexPolygonShape.fromRectangle(new Vector(2, 2), new Vector(3, 0)),
			3
		);
		const compound = computeCompoundMassProperties([
			leftRectangle,
			rightRectangle,
		]);
		const expectedMass = 16;
		const expectedCentroid = new Vector(7 / 4, 0);
		const leftMass = 4;
		const rightMass = 12;
		const leftInertiaAtCentroid = (leftMass * (2 * 2 + 2 * 2)) / 12;
		const rightInertiaAtCentroid = (rightMass * (2 * 2 + 2 * 2)) / 12;
		const leftOffset = 15 / 4;
		const rightOffset = 5 / 4;
		const expectedInertia =
			leftInertiaAtCentroid +
			leftMass * leftOffset * leftOffset +
			rightInertiaAtCentroid +
			rightMass * rightOffset * rightOffset;

		expectCloseToNumber(compound.area, 8, MASS_EPSILON);
		expectCloseToNumber(compound.mass, expectedMass, MASS_EPSILON);
		expectCloseToNumber(compound.invMass, 1 / expectedMass, MASS_EPSILON);
		expectCloseToVector(compound.centroid, expectedCentroid, MASS_EPSILON);
		expectCloseToNumber(compound.inertia, expectedInertia, MASS_EPSILON);
	});

	test("computes compound inertia using the parallel-axis theorem", () => {
		const contributions: ShapeMassContribution[] = [
			computePolygonMassProperties(
				ConvexPolygonShape.fromRectangle(new Vector(2, 2), new Vector(-2, 0)),
				1
			),
			computePolygonMassProperties(
				ConvexPolygonShape.fromRectangle(new Vector(2, 2), new Vector(2, 0)),
				1
			),
		];

		const compound = computeCompoundMassProperties(contributions);
		const rectangleMass = 4;
		const rectangleInertiaAtCentroid = (rectangleMass * (2 * 2 + 2 * 2)) / 12;
		const expectedInertia =
			2 * (rectangleInertiaAtCentroid + rectangleMass * 2 * 2);

		expectCloseToVector(compound.centroid, Vector.zero(), MASS_EPSILON);
		expectCloseToNumber(compound.mass, 8, MASS_EPSILON);
		expectCloseToNumber(compound.inertia, expectedInertia, MASS_EPSILON);
		expectCloseToNumber(compound.invInertia, 1 / expectedInertia, MASS_EPSILON);
	});

	test("rejects empty compound contributions", () => {
		expect(() => computeCompoundMassProperties([])).toThrow();
	});

	test("converts mass properties to static-body values", () => {
		const dynamic = computeCircleMassProperties(new CircleShape(Vector.zero(), 2), 1);
		const staticMassProperties = toStaticMassProperties(dynamic);

		expectCloseToNumber(staticMassProperties.area, dynamic.area, MASS_EPSILON);
		expectCloseToVector(staticMassProperties.centroid, dynamic.centroid, MASS_EPSILON);
		expectCloseToNumber(staticMassProperties.mass, dynamic.mass, MASS_EPSILON);
		expectCloseToNumber(staticMassProperties.inertia, dynamic.inertia, MASS_EPSILON);
		expectCloseToNumber(staticMassProperties.invMass, 0, MASS_EPSILON);
		expectCloseToNumber(staticMassProperties.invInertia, 0, MASS_EPSILON);
	});
});
