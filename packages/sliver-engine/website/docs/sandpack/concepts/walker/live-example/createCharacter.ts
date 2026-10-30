import {
	Walker,
	Vector,
	type GameObject,
	type WalkerPathfindingOptions,
} from "sliver-engine";
import { createCharacterBase } from "./createCharacter.base";

export const createWalker = (character: GameObject): Walker => {
	// Edit this section only.
	const waypoints = [
		new Vector(56, 56),
		new Vector(464, 56),
		new Vector(464, 248),
		new Vector(56, 248),
	];

	const speed = 126;
	const debug = true;
	const cyclic = true;

	const pathfindingOptions: WalkerPathfindingOptions = {
		avoidObstacles: true,
		gridCellSize: 16,
		recalculateEveryTicks: 20,
		shouldRecalculatePath: ({ tick }) => tick % 45 === 0,
		maxExpandedNodes: 6000,
		maxSearchRadiusTiles: 64,
		pathNotFoundBehavior: "snap",
		snapTargetToEdgeDistance: 18,
	};

	return new Walker(
		character,
		waypoints,
		speed,
		debug,
		cyclic,
		pathfindingOptions,
	);
};

export const createCharacter = () => {
	return createCharacterBase(createWalker);
};
