import { expect } from "bun:test";

type FixedStepOptions = {
	steps: number;
	dt?: number;
};

type ImmutableStepFunction<TState> = (
	state: TState,
	dt: number,
	stepIndex: number
) => TState;

type MutableStepFunction<TState> = (
	state: TState,
	dt: number,
	stepIndex: number
) => void;

const DEFAULT_FIXED_TIME_STEP = 1 / 60;

const assertFixedStepOptions = (options: FixedStepOptions): void => {
	expect(Number.isInteger(options.steps), "steps must be an integer").toBe(true);
	expect(options.steps >= 0, "steps must be non-negative").toBe(true);

	const dt = options.dt ?? DEFAULT_FIXED_TIME_STEP;
	expect(Number.isFinite(dt), "dt must be finite").toBe(true);
	expect(dt > 0, "dt must be positive").toBe(true);
};

const runFixedSteps = <TState>(
	initialState: TState,
	step: ImmutableStepFunction<TState>,
	options: FixedStepOptions
): TState => {
	assertFixedStepOptions(options);

	let state = initialState;
	const dt = options.dt ?? DEFAULT_FIXED_TIME_STEP;

	for (let stepIndex = 0; stepIndex < options.steps; stepIndex++) {
		state = step(state, dt, stepIndex);
	}

	return state;
};

const runFixedStepsMutable = <TState>(
	initialState: TState,
	step: MutableStepFunction<TState>,
	options: FixedStepOptions
): TState => {
	assertFixedStepOptions(options);

	const dt = options.dt ?? DEFAULT_FIXED_TIME_STEP;

	for (let stepIndex = 0; stepIndex < options.steps; stepIndex++) {
		step(initialState, dt, stepIndex);
	}

	return initialState;
};

export { DEFAULT_FIXED_TIME_STEP, runFixedSteps, runFixedStepsMutable };

export type { FixedStepOptions, ImmutableStepFunction, MutableStepFunction };
