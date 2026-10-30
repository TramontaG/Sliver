import { expect } from "bun:test";

type VectorLike = {
	readonly x: number;
	readonly y: number;
};

type MatrixLike = ReadonlyArray<ReadonlyArray<number>>;

const DEFAULT_EPSILON = 1e-6;

const formatNumber = (value: number): string =>
	Number.isFinite(value) ? value.toPrecision(12) : String(value);

const expectFiniteNumber = (value: number, label: string): void => {
	expect(Number.isFinite(value), `${label} must be finite`).toBe(true);
};

const expectCloseToNumber = (
	actual: number,
	expected: number,
	epsilon: number = DEFAULT_EPSILON,
	label: string = "number"
): void => {
	expectFiniteNumber(actual, `${label} actual`);
	expectFiniteNumber(expected, `${label} expected`);
	expectFiniteNumber(epsilon, `${label} epsilon`);
	expect(epsilon >= 0, `${label} epsilon must be non-negative`).toBe(true);

	const delta = Math.abs(actual - expected);
	expect(
		delta <= epsilon,
		`${label} expected ${formatNumber(expected)} +/- ${formatNumber(epsilon)}, got ${formatNumber(actual)}`
	).toBe(true);
};

const expectCloseToVector = (
	actual: VectorLike,
	expected: VectorLike,
	epsilon: number = DEFAULT_EPSILON,
	label: string = "vector"
): void => {
	expectCloseToNumber(actual.x, expected.x, epsilon, `${label}.x`);
	expectCloseToNumber(actual.y, expected.y, epsilon, `${label}.y`);
};

const expectCloseToMatrix = (
	actual: MatrixLike,
	expected: MatrixLike,
	epsilon: number = DEFAULT_EPSILON,
	label: string = "matrix"
): void => {
	expect(actual.length, `${label} row count`).toBe(expected.length);

	for (let rowIndex = 0; rowIndex < expected.length; rowIndex++) {
		const actualRow = actual[rowIndex];
		const expectedRow = expected[rowIndex];
		expect(actualRow, `${label}[${rowIndex}] must exist`).toBeDefined();
		expect(expectedRow, `${label}[${rowIndex}] expected row must exist`).toBeDefined();
		expect(actualRow!.length, `${label}[${rowIndex}] column count`).toBe(
			expectedRow!.length
		);

		for (let columnIndex = 0; columnIndex < expectedRow!.length; columnIndex++) {
			expectCloseToNumber(
				actualRow![columnIndex]!,
				expectedRow![columnIndex]!,
				epsilon,
				`${label}[${rowIndex}][${columnIndex}]`
			);
		}
	}
};

export {
	DEFAULT_EPSILON,
	expectCloseToMatrix,
	expectCloseToNumber,
	expectCloseToVector,
};

export type { MatrixLike, VectorLike };
