import type { Vector } from "sliver-engine";
import {
	mapEnclosurePoint,
	scaleEnclosureOffset,
	scaleEnclosureScalar,
	scaleEnclosureSize,
} from "./enclosureDimensions";

export type HitboxType = "square" | "circle";

export type HitboxConfig = {
	type: HitboxType;
	offset: Vector;
	squareSize: Vector;
	circleRadius: number;
	solid: boolean;
	debug: boolean;
};

export type HitboxDemoObjectConfig = {
	position: Vector;
	shapeSize: Vector;
	shapeColor: string;
	hitboxes: HitboxConfig[];
};

type HitboxDemoConfigs = {
	objectA: HitboxDemoObjectConfig;
	objectB: HitboxDemoObjectConfig;
};

export const createHitboxConfigs = (): HitboxDemoConfigs => {
	// Edit this section only.
	return {
		objectA: {
			position: mapEnclosurePoint(136, 138),
			shapeSize: scaleEnclosureSize(54, 30),
			shapeColor: "#22d3ee",
			hitboxes: [
				{
					type: "square",
					offset: scaleEnclosureOffset(18, -10),
					squareSize: scaleEnclosureSize(22, 22),
					circleRadius: scaleEnclosureScalar(11),
					solid: true,
					debug: true,
				},
				{
					type: "circle",
					offset: scaleEnclosureOffset(-8, 8),
					squareSize: scaleEnclosureSize(18, 18),
					circleRadius: scaleEnclosureScalar(10),
					solid: true,
					debug: true,
				},
			],
		},
		objectB: {
			position: mapEnclosurePoint(308, 144),
			shapeSize: scaleEnclosureSize(48, 44),
			shapeColor: "#fb7185",
			hitboxes: [
				{
					type: "circle",
					offset: scaleEnclosureOffset(-12, 12),
					squareSize: scaleEnclosureSize(26, 18),
					circleRadius: scaleEnclosureScalar(14),
					solid: true,
					debug: true,
				},
				{
					type: "square",
					offset: scaleEnclosureOffset(14, -6),
					squareSize: scaleEnclosureSize(16, 24),
					circleRadius: scaleEnclosureScalar(8),
					solid: true,
					debug: true,
				},
			],
		},
	};
};
