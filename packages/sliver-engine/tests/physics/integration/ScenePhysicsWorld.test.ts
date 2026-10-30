import { describe, expect, test } from "bun:test";
import { GameObject } from "../../../src/GameObject";
import { SquareHitbox } from "../../../src/GameObject/Hitboxes";
import { Vector } from "../../../src/Lib/Vector";
import { ScenePhysicsWorld } from "../../../src/Physics";
import { expectCloseToNumber } from "../TestAssertions";

const WORLD_EPSILON = 1e-6;
const DEFAULT_WORLD_DT = 1 / 60;

const createBox = (name: string): GameObject => {
	const box = new GameObject(name, Vector.zero());
	box.id = name;
	box.addHitbox(
		new SquareHitbox(Vector.zero(), new Vector(2, 1), box, {
			solid: true,
		})
	);
	box.setPhisics({
		immovable: false,
		affectedByGravity: false,
		restitution: 0,
		mass: 2,
	});
	return box;
};

const stepWorldWithObject = (
	gameObject: GameObject
): { world: ScenePhysicsWorld; body: NonNullable<ReturnType<ScenePhysicsWorld["getBody"]>> } => {
	const world = new ScenePhysicsWorld();
	world.step([gameObject], Vector.zero(), DEFAULT_WORLD_DT);

	const body = world.getBody(gameObject);
	expect(body).toBeDefined();

	return {
		world,
		body: body!,
	};
};

describe("Scene physics world", () => {
	test("keeps legacy friction as the fallback for both coefficients", () => {
		const box = createBox("legacy-friction-box");
		box.setPhisics({
			friction: 0.6,
		});

		const { body } = stepWorldWithObject(box);

		expectCloseToNumber(
			body.staticFriction,
			0.6,
			WORLD_EPSILON,
			"legacy static friction"
		);
		expectCloseToNumber(
			body.dynamicFriction,
			0.6,
			WORLD_EPSILON,
			"legacy dynamic friction"
		);
	});

	test("lets explicit static and dynamic friction override the legacy fallback independently", () => {
		const staticOverrideBox = createBox("static-override-box");
		staticOverrideBox.setPhisics({
			friction: 0.6,
			staticFriction: 0.9,
		});
		const dynamicOverrideBox = createBox("dynamic-override-box");
		dynamicOverrideBox.setPhisics({
			friction: 0.6,
			dynamicFriction: 0.2,
		});

		const { body: staticOverrideBody } = stepWorldWithObject(staticOverrideBox);
		const { body: dynamicOverrideBody } =
			stepWorldWithObject(dynamicOverrideBox);

		expectCloseToNumber(
			staticOverrideBody.staticFriction,
			0.9,
			WORLD_EPSILON,
			"explicit static friction"
		);
		expectCloseToNumber(
			staticOverrideBody.dynamicFriction,
			0.6,
			WORLD_EPSILON,
			"fallback dynamic friction"
		);
		expectCloseToNumber(
			dynamicOverrideBody.staticFriction,
			0.6,
			WORLD_EPSILON,
			"fallback static friction"
		);
		expectCloseToNumber(
			dynamicOverrideBody.dynamicFriction,
			0.2,
			WORLD_EPSILON,
			"explicit dynamic friction"
		);
	});

	test("scales rotational inertia without changing body mass", () => {
		const baselineBox = createBox("baseline-box");
		const tunedBox = createBox("tuned-box");
		tunedBox.setPhisics({
			inertiaScale: 0.5,
		});

		const { body: baselineBody } = stepWorldWithObject(baselineBox);
		const { body: tunedBody } = stepWorldWithObject(tunedBox);

		expectCloseToNumber(
			tunedBody.mass,
			baselineBody.mass,
			WORLD_EPSILON,
			"scaled mass"
		);
		expectCloseToNumber(
			tunedBody.inertia,
			baselineBody.inertia * 0.5,
			WORLD_EPSILON,
			"scaled inertia"
		);
		expectCloseToNumber(
			tunedBody.invInertia,
			baselineBody.invInertia * 2,
			WORLD_EPSILON,
			"scaled inverse inertia"
		);
	});
});
