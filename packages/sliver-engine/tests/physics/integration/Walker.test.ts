import { describe, expect, test } from "bun:test";
import { GameObject } from "../../../src/GameObject";
import { SquareHitbox } from "../../../src/GameObject/Hitboxes";
import { Walker } from "../../../src/GameObject/Walker";
import { Vector } from "../../../src/Lib/Vector";
import { Scene } from "../../../src/Scenes";
import { expectCloseToVector } from "../TestAssertions";

const WALKER_TEST_DT = 1 / 60;
const WALKER_TEST_SPEED = 90;
const WALKER_TEST_EPSILON = 1e-6;

class WalkerProbe extends GameObject {
	constructor(name: string, position: Vector) {
		super(name, position);
	}
}

const createWalkerProbe = (position: Vector): WalkerProbe => {
	const probe = new WalkerProbe("walker_probe", position.clone());
	probe.addHitbox(
		new SquareHitbox(Vector.zero(), new Vector(8, 8), probe, {
			solid: true,
		})
	);
	probe.setPhisics({
		immovable: false,
		affectedByGravity: false,
		restitution: 0,
		friction: 0,
		mass: 1,
	});
	return probe;
};

const createWalkerObstacle = (
	name: string,
	position: Vector,
	size: Vector
): GameObject => {
	const obstacle = new GameObject(name, position.clone());
	obstacle.addHitbox(
		new SquareHitbox(Vector.zero(), size.clone(), obstacle, {
			solid: true,
		})
	);
	obstacle.setPhisics({
		immovable: true,
		affectedByGravity: false,
		restitution: 0,
		friction: 0,
		mass: 1,
	});
	return obstacle;
};

const createWalkerScene = (): Scene => {
	const scene = new Scene("walker_test_scene");
	scene.setGravity(Vector.zero());
	return scene;
};

describe("Walker integration", () => {
	test("keeps the current waypoint targeted until the body actually reaches it", () => {
		const scene = createWalkerScene();
		const probe = createWalkerProbe(Vector.zero());
		const walker = new Walker(
			probe,
			[new Vector(10, 0), new Vector(20, 0)],
			WALKER_TEST_SPEED,
			false,
			false
		);

		probe.setWalker(walker);
		scene.addGameObject(probe);
		walker.start();

		scene.tick(WALKER_TEST_DT);

		expectCloseToVector(
			probe.getScenePosition(),
			new Vector(1.5, 0),
			WALKER_TEST_EPSILON,
			"walker position after first tick"
		);

		const targetedWaypoint = walker.getTargetedWaypoint();
		expect(targetedWaypoint).not.toBeNull();
		expectCloseToVector(
			targetedWaypoint!,
			new Vector(10, 0),
			WALKER_TEST_EPSILON,
			"targeted waypoint after first tick"
		);
	});

	test("advances to the next waypoint on the tick after arriving exactly at the current target", () => {
		const scene = createWalkerScene();
		const probe = createWalkerProbe(Vector.zero());
		const walker = new Walker(
			probe,
			[new Vector(1, 0), new Vector(10, 0)],
			WALKER_TEST_SPEED,
			false,
			false
		);

		probe.setWalker(walker);
		scene.addGameObject(probe);
		walker.start();

		scene.tick(WALKER_TEST_DT);

		expectCloseToVector(
			probe.getScenePosition(),
			new Vector(1, 0),
			WALKER_TEST_EPSILON,
			"walker position at first waypoint"
		);

		let targetedWaypoint = walker.getTargetedWaypoint();
		expect(targetedWaypoint).not.toBeNull();
		expectCloseToVector(
			targetedWaypoint!,
			new Vector(1, 0),
			WALKER_TEST_EPSILON,
			"targeted waypoint before advancing"
		);

		scene.tick(WALKER_TEST_DT);

		expectCloseToVector(
			probe.getScenePosition(),
			new Vector(2.5, 0),
			WALKER_TEST_EPSILON,
			"walker position after advancing to the next waypoint"
		);

		targetedWaypoint = walker.getTargetedWaypoint();
		expect(targetedWaypoint).not.toBeNull();
		expectCloseToVector(
			targetedWaypoint!,
			new Vector(10, 0),
			WALKER_TEST_EPSILON,
			"targeted waypoint after advancing"
		);
	});

	test("reuses a valid stored path and only recomputes when that path becomes invalid", () => {
		const scene = createWalkerScene();
		const probe = createWalkerProbe(new Vector(40, 40));
		const detourWall = createWalkerObstacle(
			"detour_wall",
			new Vector(104, -40),
			new Vector(16, 160)
		);
		const walker = new Walker(
			probe,
			[new Vector(200, 40)],
			WALKER_TEST_SPEED,
			false,
			false,
			{
				avoidObstacles: true,
				gridCellSize: 16,
				recalculateEveryTicks: 1,
				pathNotFoundBehavior: "stop",
			}
		);

		probe.setWalker(walker);
		scene.addGameObject([probe, detourWall]);
		walker.start();

		let computeCalls = 0;
		const walkerInternals = walker as unknown as {
			computePathToTarget: (start: Vector, goal: Vector) => unknown;
		};
		const originalComputePathToTarget =
			walkerInternals.computePathToTarget.bind(walker);
		walkerInternals.computePathToTarget = (start, goal) => {
			computeCalls++;
			return originalComputePathToTarget(start, goal);
		};

		scene.tick(WALKER_TEST_DT);

		expect(computeCalls).toBe(1);
		const initialPath = walker.getCurrentPath();
		expect(initialPath.length).toBeGreaterThan(0);

		scene.tick(WALKER_TEST_DT);

		expect(computeCalls).toBe(1);
		expect(walker.getCurrentPath()).toEqual(initialPath);

		const goalBlocker = createWalkerObstacle(
			"goal_blocker",
			new Vector(184, 0),
			new Vector(48, 96)
		);
		scene.addGameObject(goalBlocker);

		scene.tick(WALKER_TEST_DT);

		expect(computeCalls).toBe(2);
	});

	test("snap keeps the adjusted target near the blocked waypoint even with scene offset", () => {
		const scene = createWalkerScene();
		scene.setOffset(new Vector(0, 100));

		const probe = createWalkerProbe(new Vector(40, 120));
		const ceilingWall = createWalkerObstacle(
			"ceiling_wall",
			new Vector(0, 0),
			new Vector(320, 36)
		);
		const targetBlocker = createWalkerObstacle(
			"target_blocker",
			new Vector(104, 104),
			new Vector(64, 64)
		);
		const originalGoal = new Vector(120, 120);
		const walker = new Walker(
			probe,
			[originalGoal.clone()],
			WALKER_TEST_SPEED,
			false,
			false,
			{
				avoidObstacles: true,
				gridCellSize: 16,
				pathNotFoundBehavior: "snap",
				snapTargetToEdgeDistance: 128,
			}
		);

		probe.setWalker(walker);
		scene.addGameObject([probe, ceilingWall, targetBlocker]);
		walker.start();

		scene.tick(WALKER_TEST_DT);

		const walkerInternals = walker as unknown as {
			adjustedWaypoint: Vector | null;
		};
		const adjustedWaypoint = walkerInternals.adjustedWaypoint;

		expect(adjustedWaypoint).not.toBeNull();
		expect(adjustedWaypoint!.toSubtracted(originalGoal).magnitude()).toBeLessThan(40);
		expect(adjustedWaypoint!.y).toBeGreaterThan(90);
	});

	test("can pause, resume, and abort pathfinding without resetting the walker", () => {
		const scene = createWalkerScene();
		const probe = createWalkerProbe(new Vector(40, 40));
		const detourWall = createWalkerObstacle(
			"detour_wall",
			new Vector(104, -40),
			new Vector(16, 160)
		);
		const walker = new Walker(
			probe,
			[new Vector(200, 40)],
			WALKER_TEST_SPEED,
			false,
			false,
			{
				avoidObstacles: true,
				gridCellSize: 16,
				recalculateEveryTicks: 1,
				pathNotFoundBehavior: "stop",
			}
		);

		probe.setWalker(walker);
		scene.addGameObject([probe, detourWall]);
		walker.start();

		scene.tick(WALKER_TEST_DT);
		expect(walker.getCurrentPath().length).toBeGreaterThan(0);

		walker.pausePathfinding();
		expect(walker.isPathfindingPaused()).toBe(true);

		walker.abortPathfinding();
		expect(walker.getCurrentPath()).toEqual([]);
		expectCloseToVector(
			probe.speed,
			Vector.zero(),
			WALKER_TEST_EPSILON,
			"probe speed after aborting pathfinding"
		);

		scene.tick(WALKER_TEST_DT);
		expect(walker.getCurrentPath()).toEqual([]);
		expectCloseToVector(
			probe.speed,
			Vector.zero(),
			WALKER_TEST_EPSILON,
			"probe speed while pathfinding is paused"
		);

		walker.resumePathfinding();
		expect(walker.isPathfindingPaused()).toBe(false);

		scene.tick(WALKER_TEST_DT);
		expect(walker.getCurrentPath().length).toBeGreaterThan(0);
	});
});
