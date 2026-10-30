import { Vector } from "sliver-engine";

const BASE_CANVAS_WIDTH = 520;
const BASE_CANVAS_HEIGHT = 320;
const BASE_ENCLOSURE_LEFT = 20;
const BASE_ENCLOSURE_TOP = 20;
const BASE_ENCLOSURE_OUTER_WIDTH = 440;
const BASE_ENCLOSURE_OUTER_HEIGHT = 224;

const clamp = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
};

const VIEWPORT_WIDTH = window.innerWidth || BASE_CANVAS_WIDTH;
const VIEWPORT_HEIGHT = window.innerHeight || BASE_CANVAS_HEIGHT;
const HORIZONTAL_PADDING = clamp(VIEWPORT_WIDTH * 0.04, 14, 28);
const VERTICAL_PADDING = clamp(VIEWPORT_HEIGHT * 0.06, 14, 28);

export const ENCLOSURE_BORDER_COLOR = "#334155";

export const ENCLOSURE_LEFT = HORIZONTAL_PADDING;
export const ENCLOSURE_TOP = VERTICAL_PADDING;
export const ENCLOSURE_OUTER_WIDTH = Math.max(
	240,
	VIEWPORT_WIDTH - HORIZONTAL_PADDING * 2,
);
export const ENCLOSURE_OUTER_HEIGHT = Math.max(
	180,
	VIEWPORT_HEIGHT - VERTICAL_PADDING * 2,
);
export const ENCLOSURE_THICKNESS = clamp(
	Math.min(ENCLOSURE_OUTER_WIDTH, ENCLOSURE_OUTER_HEIGHT) * 0.045,
	12,
	20,
);

const ENCLOSURE_SCALE_X = ENCLOSURE_OUTER_WIDTH / BASE_ENCLOSURE_OUTER_WIDTH;
const ENCLOSURE_SCALE_Y = ENCLOSURE_OUTER_HEIGHT / BASE_ENCLOSURE_OUTER_HEIGHT;
const ENCLOSURE_UNIFORM_SCALE = Math.min(
	ENCLOSURE_SCALE_X,
	ENCLOSURE_SCALE_Y,
);

export const ENCLOSURE_CEILING_POSITION = new Vector(ENCLOSURE_LEFT, ENCLOSURE_TOP);
export const ENCLOSURE_HORIZONTAL_SIZE = new Vector(
	ENCLOSURE_OUTER_WIDTH,
	ENCLOSURE_THICKNESS,
);

export const ENCLOSURE_FLOOR_POSITION = new Vector(
	ENCLOSURE_LEFT,
	ENCLOSURE_TOP + ENCLOSURE_OUTER_HEIGHT - ENCLOSURE_THICKNESS,
);

export const ENCLOSURE_LEFT_WALL_POSITION = new Vector(
	ENCLOSURE_LEFT,
	ENCLOSURE_TOP + ENCLOSURE_THICKNESS,
);

export const ENCLOSURE_RIGHT_WALL_POSITION = new Vector(
	ENCLOSURE_LEFT + ENCLOSURE_OUTER_WIDTH - ENCLOSURE_THICKNESS,
	ENCLOSURE_TOP + ENCLOSURE_THICKNESS,
);

export const ENCLOSURE_VERTICAL_SIZE = new Vector(
	ENCLOSURE_THICKNESS,
	ENCLOSURE_OUTER_HEIGHT - ENCLOSURE_THICKNESS * 2,
);

export const mapEnclosurePoint = (x: number, y: number): Vector => {
	return new Vector(
		ENCLOSURE_LEFT + (x - BASE_ENCLOSURE_LEFT) * ENCLOSURE_SCALE_X,
		ENCLOSURE_TOP + (y - BASE_ENCLOSURE_TOP) * ENCLOSURE_SCALE_Y,
	);
};

export const scaleEnclosureSize = (width: number, height: number): Vector => {
	return new Vector(width * ENCLOSURE_SCALE_X, height * ENCLOSURE_SCALE_Y);
};

export const scaleEnclosureVector = (x: number, y: number): Vector => {
	return new Vector(x * ENCLOSURE_SCALE_X, y * ENCLOSURE_SCALE_Y);
};

export const scaleEnclosureScalar = (value: number): number => {
	return value * ENCLOSURE_UNIFORM_SCALE;
};
