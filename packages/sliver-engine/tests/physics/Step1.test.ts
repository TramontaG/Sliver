import { describe, expect, test } from "bun:test";
import {
	DEFAULT_EPSILON,
	expectCloseToMatrix,
	expectCloseToNumber,
	expectCloseToVector,
} from "./TestAssertions";
import {
	DEFAULT_FIXED_TIME_STEP,
	runFixedSteps,
	runFixedStepsMutable,
} from "./FixedStep";

describe("Step 1 test harness", () => {
	test("executes a basic Bun unit test", () => {
		expect(true).toBe(true);
	});

	test("compares numbers using epsilon", () => {
		expectCloseToNumber(1.0000001, 1, DEFAULT_EPSILON);
		expectCloseToNumber(1, 1, 0);
		expect(() => expectCloseToNumber(1.01, 1, 1e-4)).toThrow();
		expect(() => expectCloseToNumber(1.0000001, 1, 0)).toThrow();
	});

	test("rejects invalid numeric assertion inputs", () => {
		expect(() => expectCloseToNumber(Number.NaN, 1)).toThrow();
		expect(() => expectCloseToNumber(1, Number.POSITIVE_INFINITY)).toThrow();
		expect(() => expectCloseToNumber(1, 1, -DEFAULT_EPSILON)).toThrow();
	});

	test("compares vectors using epsilon", () => {
		expectCloseToVector(
			{ x: 4.0000001, y: -2.0000001 },
			{ x: 4, y: -2 },
			DEFAULT_EPSILON
		);
		expect(() =>
			expectCloseToVector({ x: 4, y: -2 }, { x: 4.1, y: -2 }, 1e-4)
		).toThrow();
	});

	test("compares matrices using epsilon", () => {
		expectCloseToMatrix(
			[
				[1, 2.0000001],
				[3.0000001, 4],
			],
			[
				[1, 2],
				[3, 4],
			],
			DEFAULT_EPSILON
		);
		expect(() =>
			expectCloseToMatrix(
				[
					[1, 2],
					[3, 4],
				],
				[
					[1, 2],
					[3, 4.1],
				],
				1e-4
			)
		).toThrow();
	});

	test("rejects invalid matrix shapes", () => {
		expect(() =>
			expectCloseToMatrix(
				[
					[1, 2],
					[3, 4],
				],
				[[1, 2]],
				DEFAULT_EPSILON
			)
		).toThrow();

		expect(() =>
			expectCloseToMatrix(
				[
					[1, 2],
					[3],
				],
				[
					[1, 2],
					[3, 4],
				],
				DEFAULT_EPSILON
			)
		).toThrow();
	});

	test("runs immutable fixed-step simulations deterministically", () => {
		type MotionState = {
			position: number;
			velocity: number;
		};

		const step = (state: MotionState, dt: number): MotionState => ({
			position: state.position + state.velocity * dt,
			velocity: state.velocity + 2 * dt,
		});

		const initialState: MotionState = { position: 0, velocity: 1 };
		const options = { steps: 120, dt: DEFAULT_FIXED_TIME_STEP };

		const firstResult = runFixedSteps(initialState, step, options);
		const secondResult = runFixedSteps(initialState, step, options);

		expectCloseToNumber(firstResult.position, secondResult.position);
		expectCloseToNumber(firstResult.velocity, secondResult.velocity);
	});

	test("runs immutable fixed-step simulations with exact step count and step indexes", () => {
		const stepIndexes: number[] = [];
		const initialState = { count: 0 };
		const result = runFixedSteps(
			initialState,
			(state, _dt, stepIndex) => {
				stepIndexes.push(stepIndex);
				return { count: state.count + 1 };
			},
			{ steps: 4, dt: DEFAULT_FIXED_TIME_STEP }
		);

		expect(stepIndexes).toEqual([0, 1, 2, 3]);
		expect(result.count).toBe(4);
		expect(initialState.count).toBe(0);
		expect(result).not.toBe(initialState);
	});

	test("returns the initial state unchanged when immutable runner executes zero steps", () => {
		let callCount = 0;
		const initialState = { count: 0 };
		const result = runFixedSteps(
			initialState,
			(state) => {
				callCount++;
				return { count: state.count + 1 };
			},
			{ steps: 0, dt: DEFAULT_FIXED_TIME_STEP }
		);

		expect(callCount).toBe(0);
		expect(result).toBe(initialState);
	});

	test("runs mutable fixed-step simulations deterministically", () => {
		type MotionState = {
			position: number;
			velocity: number;
		};

		const step = (state: MotionState, dt: number): void => {
			state.position += state.velocity * dt;
			state.velocity += 2 * dt;
		};

		const createState = (): MotionState => ({ position: 0, velocity: 1 });
		const options = { steps: 120, dt: DEFAULT_FIXED_TIME_STEP };

		const firstResult = runFixedStepsMutable(createState(), step, options);
		const secondResult = runFixedStepsMutable(createState(), step, options);

		expectCloseToNumber(firstResult.position, secondResult.position);
		expectCloseToNumber(firstResult.velocity, secondResult.velocity);
	});

	test("runs mutable fixed-step simulations with exact step count and returns the same object", () => {
		const stepIndexes: number[] = [];
		const initialState = { count: 0 };
		const result = runFixedStepsMutable(
			initialState,
			(state, _dt, stepIndex) => {
				stepIndexes.push(stepIndex);
				state.count += 1;
			},
			{ steps: 4, dt: DEFAULT_FIXED_TIME_STEP }
		);

		expect(stepIndexes).toEqual([0, 1, 2, 3]);
		expect(result.count).toBe(4);
		expect(result).toBe(initialState);
	});

	test("returns the same object unchanged when mutable runner executes zero steps", () => {
		let callCount = 0;
		const initialState = { count: 0 };
		const result = runFixedStepsMutable(
			initialState,
			() => {
				callCount++;
			},
			{ steps: 0, dt: DEFAULT_FIXED_TIME_STEP }
		);

		expect(callCount).toBe(0);
		expect(result).toBe(initialState);
		expect(result.count).toBe(0);
	});

	test("rejects invalid fixed-step options", () => {
		expect(() =>
			runFixedSteps(0, (state) => state, {
				steps: -1,
				dt: DEFAULT_FIXED_TIME_STEP,
			})
		).toThrow();

		expect(() =>
			runFixedSteps(0, (state) => state, {
				steps: 1.5,
				dt: DEFAULT_FIXED_TIME_STEP,
			})
		).toThrow();

		expect(() =>
			runFixedSteps(0, (state) => state, {
				steps: 1,
				dt: 0,
			})
		).toThrow();

		expect(() =>
			runFixedStepsMutable(0, () => {}, {
				steps: 1,
				dt: Number.NaN,
			})
		).toThrow();
	});
});
