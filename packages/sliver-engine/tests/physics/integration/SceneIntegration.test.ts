import { describe, expect, test } from "bun:test";
import { GameObject } from "../../../src/GameObject";
import { CircleHitbox, SquareHitbox } from "../../../src/GameObject/Hitboxes";
import { Vector } from "../../../src/Lib/Vector";
import { Scene } from "../../../src/Scenes";
import { expectCloseToNumber, expectCloseToVector } from "../TestAssertions";

const SCENE_EPSILON = 1e-6;
const DEFAULT_TICK_DT = 1 / 60;
const DEFAULT_SCENE_GRAVITY = new Vector(0, -10);

class SceneCollisionProbe extends GameObject {
	public beforeCollisionCalls = 0;
	public collisionCalls = 0;
	public lastPenetration: Vector | null = null;
	public collidedWith: string[] = [];
	public allowCollision = true;

	constructor(name: string, position: Vector) {
		super(name, position);
		this.id = name;
	}

	override beforeColision(otherGO: GameObject): boolean {
		this.beforeCollisionCalls++;
		return this.allowCollision;
	}

	override onColision(otherGO: GameObject, penetration: Vector): void {
		this.collisionCalls++;
		this.collidedWith.push(otherGO.name);
		this.lastPenetration = penetration.clone();
	}
}

const stepScene = (
	scene: Scene,
	steps: number,
	dt: number = DEFAULT_TICK_DT
): void => {
	for (let step = 0; step < steps; step++) {
		scene.tick(dt);
	}
};

const createFloorObject = (): SceneCollisionProbe => {
	const floor = new SceneCollisionProbe("floor", new Vector(-10, -1));
	floor.addHitbox(
		new SquareHitbox(Vector.zero(), new Vector(20, 1), floor, {
			solid: true,
		})
	);
	floor.setPhisics({
		immovable: true,
		affectedByGravity: false,
		restitution: 0,
		friction: 0.6,
		mass: 1,
	});
	return floor;
};

const createDynamicBall = (position: Vector): SceneCollisionProbe => {
	const ball = new SceneCollisionProbe("ball", position);
	ball.addHitbox(new CircleHitbox(Vector.zero(), 0.5, ball, { solid: true }));
	ball.setPhisics({
		immovable: false,
		affectedByGravity: true,
		restitution: 0,
		friction: 0.4,
		mass: 1,
	});
	return ball;
};

const createDeterministicScene = (): {
	scene: Scene;
	floor: SceneCollisionProbe;
	ball: SceneCollisionProbe;
} => {
	const scene = new Scene("deterministic");
	scene.setGravity(DEFAULT_SCENE_GRAVITY);

	const floor = createFloorObject();
	const ball = createDynamicBall(new Vector(0, 3));
	ball.speed = new Vector(1, 0);

	scene.addGameObject([floor, ball]);

	return { scene, floor, ball };
};

describe("Scene integration", () => {
	test("Scene tick advances body integration and collision handling deterministically", () => {
		const first = createDeterministicScene();
		const second = createDeterministicScene();

		stepScene(first.scene, 180, DEFAULT_TICK_DT);
		stepScene(second.scene, 180, DEFAULT_TICK_DT);

		expectCloseToVector(
			first.ball.getScenePosition(),
			second.ball.getScenePosition(),
			SCENE_EPSILON,
			"ball position"
		);
		expectCloseToVector(
			first.ball.speed,
			second.ball.speed,
			SCENE_EPSILON,
			"ball linear velocity"
		);
		expectCloseToNumber(
			first.ball.rotation,
			second.ball.rotation,
			SCENE_EPSILON,
			"ball rotation"
		);
		expectCloseToNumber(
			first.ball.angularVelocity,
			second.ball.angularVelocity,
			SCENE_EPSILON,
			"ball angular velocity"
		);
		expect(first.ball.beforeCollisionCalls).toBe(second.ball.beforeCollisionCalls);
		expect(first.ball.collisionCalls).toBe(second.ball.collisionCalls);
		expect(first.floor.beforeCollisionCalls).toBe(second.floor.beforeCollisionCalls);
		expect(first.floor.collisionCalls).toBe(second.floor.collisionCalls);
		expect(first.ball.collidedWith).toEqual(second.ball.collidedWith);
		expect(first.floor.collidedWith).toEqual(second.floor.collidedWith);
		expect(first.ball.getScenePosition().y).toBeGreaterThanOrEqual(
			0 - SCENE_EPSILON
		);
		expect(Math.abs(first.ball.angularVelocity)).toBeLessThan(100);
		expect(first.scene.getLastPhysicsStepResult().solidManifolds.length).toBeGreaterThan(
			0
		);
		expect(first.scene.getLastPhysicsStepResult().notifiedPairIds).toContain(
			"ball|floor"
		);
	});

	test("Scene gravity still behaves correctly with the new body state", () => {
		const scene = new Scene("gravity");
		scene.setGravity(DEFAULT_SCENE_GRAVITY);

		const body = new SceneCollisionProbe("body", new Vector(0, 0));
		body.setPhisics({
			immovable: false,
			affectedByGravity: true,
			restitution: 0,
			friction: 0,
			mass: 2,
		});

		scene.addGameObject(body);
		scene.tick(DEFAULT_TICK_DT);

		expectCloseToVector(
			body.speed,
			new Vector(0, DEFAULT_SCENE_GRAVITY.y * DEFAULT_TICK_DT),
			SCENE_EPSILON,
			"gravity linear velocity"
		);
		expectCloseToVector(
			body.getScenePosition(),
			new Vector(
				0,
				DEFAULT_SCENE_GRAVITY.y * DEFAULT_TICK_DT * DEFAULT_TICK_DT
			),
			SCENE_EPSILON,
			"gravity position"
		);
		expectCloseToNumber(body.rotation, 0, SCENE_EPSILON, "gravity rotation");
		expectCloseToNumber(
			body.angularVelocity,
			0,
			SCENE_EPSILON,
			"gravity angular velocity"
		);
	});

	test("compound objects collide as one body with multiple shapes", () => {
		const scene = new Scene("compound");
		scene.setGravity(Vector.zero());

		const floor = new SceneCollisionProbe("floor", new Vector(-10, 0));
		floor.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(20, 1), floor, {
				solid: true,
			})
		);
		floor.setPhisics({
			immovable: true,
			affectedByGravity: false,
			restitution: 0,
			friction: 0.6,
			mass: 1,
		});

		const crate = new SceneCollisionProbe("crate", new Vector(0, 0.5));
		crate.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(1, 1), crate, {
				solid: true,
			})
		);
		crate.addHitbox(
			new SquareHitbox(new Vector(1, 0), new Vector(1, 1), crate, {
				solid: true,
			})
		);
		crate.setPhisics({
			immovable: false,
			affectedByGravity: false,
			restitution: 0,
			friction: 0.6,
			mass: 2,
		});
		crate.speed = new Vector(0, -1);

		scene.addGameObject([floor, crate]);
		scene.tick(DEFAULT_TICK_DT);

		expect(crate.beforeCollisionCalls).toBe(1);
		expect(floor.beforeCollisionCalls).toBe(1);
		expect(crate.collisionCalls).toBe(1);
		expect(floor.collisionCalls).toBe(1);
		expect(crate.collidedWith).toEqual(["floor"]);
		expect(floor.collidedWith).toEqual(["crate"]);
		expect(crate.speed.y).toBeGreaterThanOrEqual(-SCENE_EPSILON);
		expectCloseToVector(
			floor.speed,
			Vector.zero(),
			SCENE_EPSILON,
			"compound floor velocity"
		);
		expect(scene.getLastPhysicsStepResult().solidManifolds.length).toBeGreaterThan(
			0
		);
		expect(scene.getLastPhysicsStepResult().notifiedPairIds).toContain(
			"crate|floor"
		);
	});

	test("scene-level sensors trigger callbacks without creating solid response", () => {
		const scene = new Scene("sensor");
		scene.setGravity(Vector.zero());

		const floor = createFloorObject();
		const sensor = new SceneCollisionProbe("sensor", new Vector(0, 0.45));
		sensor.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensor, {
				solid: false,
			})
		);
		sensor.setPhisics({
			immovable: false,
			affectedByGravity: false,
			restitution: 0,
			friction: 0,
			mass: 1,
		});
		sensor.speed = new Vector(0, -1);

		scene.addGameObject([floor, sensor]);
		scene.tick(DEFAULT_TICK_DT);

		expect(sensor.beforeCollisionCalls).toBe(1);
		expect(floor.beforeCollisionCalls).toBe(1);
		expect(sensor.collisionCalls).toBe(1);
		expect(floor.collisionCalls).toBe(1);
		expect(sensor.collidedWith).toEqual(["floor"]);
		expect(floor.collidedWith).toEqual(["sensor"]);
		expectCloseToVector(
			sensor.speed,
			new Vector(0, -1),
			SCENE_EPSILON,
			"sensor velocity"
		);
		expectCloseToVector(
			floor.speed,
			Vector.zero(),
			SCENE_EPSILON,
			"sensor floor velocity"
		);
		expect(scene.getLastPhysicsStepResult().sensorManifolds).toHaveLength(1);
		expect(scene.getLastPhysicsStepResult().solidManifolds).toHaveLength(0);
		expect(scene.getLastPhysicsStepResult().notifiedPairIds).toContain(
			"floor|sensor"
		);
	});

	test("existing collision event flow survives scene integration", () => {
		const scene = new Scene("events");
		scene.setGravity(Vector.zero());

		const floor = createFloorObject();
		const ball = createDynamicBall(new Vector(0, 0.45));
		ball.allowCollision = false;
		ball.speed = new Vector(0, -1);

		scene.addGameObject([floor, ball]);
		scene.tick(DEFAULT_TICK_DT);

		expect(ball.beforeCollisionCalls).toBe(1);
		expect(floor.beforeCollisionCalls).toBe(0);
		expect(ball.collisionCalls).toBe(0);
		expect(floor.collisionCalls).toBe(0);
		expect(ball.collidedWith).toEqual([]);
		expect(floor.collidedWith).toEqual([]);
		expectCloseToVector(
			ball.speed,
			new Vector(0, -1),
			SCENE_EPSILON,
			"suppressed ball velocity"
		);
		expectCloseToVector(
			floor.speed,
			Vector.zero(),
			SCENE_EPSILON,
			"suppressed floor velocity"
		);
		expect(scene.getLastPhysicsStepResult().suppressedPairIds).toContain(
			"ball|floor"
		);
		expect(scene.getLastPhysicsStepResult().notifiedPairIds).toEqual([]);
	});

	test("static floor stays fixed over long scene stepping", () => {
		const { scene, floor } = createDeterministicScene();
		const initialFloorPosition = floor.getScenePosition().clone();

		stepScene(scene, 240, DEFAULT_TICK_DT);

		expectCloseToVector(
			floor.getScenePosition(),
			initialFloorPosition,
			SCENE_EPSILON,
			"floor position"
		);
		expectCloseToVector(
			floor.speed,
			Vector.zero(),
			SCENE_EPSILON,
			"floor linear velocity"
		);
		expectCloseToNumber(
			floor.angularVelocity,
			0,
			SCENE_EPSILON,
			"floor angular velocity"
		);
	});
});
