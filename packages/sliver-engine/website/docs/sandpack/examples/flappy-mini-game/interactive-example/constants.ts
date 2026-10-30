import { Vector } from "sliver-engine";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 480;
export const GROUND_HEIGHT = 44;
export const CEILING_HEIGHT = 20;

export const GRAVITY = 1200;
export const FLAP_VELOCITY = -320;

export const PIPE_WIDTH = 56;
export const PIPE_GAP = 104;
export const PIPE_SPEED = -120;
export const PIPE_SPAWN_TICKS = 92;
export const PIPE_MIN_TOP = 40;
export const PIPE_MAX_TOP = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 40;

export const BIRD_SIZE = new Vector(24, 18);
export const BIRD_START = new Vector(120, CANVAS_HEIGHT / 2 - 30);

export const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
