import { describe, expect, test } from "bun:test";
import { GameObject } from "../../src/GameObject";
import { Vector } from "../../src/Lib/Vector";
import { Scene } from "../../src/Scenes";

type FillRectCall = {
	x: number;
	y: number;
	width: number;
	height: number;
	tx: number;
	ty: number;
	fillStyle: string;
};

const createRenderHarness = (): {
	canvas: {
		getCanvas: () => { width: number; height: number };
		getContext: () => RenderingContext;
		getShapeDrawer: () => { drawBackground: (color: string) => void };
		reset: () => void;
	};
	context: {
		canvas: { width: number; height: number };
		globalAlpha: number;
		fillStyle: string;
		save: () => void;
		restore: () => void;
		translate: (x: number, y: number) => void;
		fillRect: (x: number, y: number, width: number, height: number) => void;
		setTransform: (
			a: number,
			b: number,
			c: number,
			d: number,
			e: number,
			f: number,
		) => void;
	};
	fills: FillRectCall[];
} => {
	const fills: FillRectCall[] = [];
	const stateStack: Array<{
		tx: number;
		ty: number;
		globalAlpha: number;
		fillStyle: string;
	}> = [];
	let tx = 0;
	let ty = 0;

	const context = {
		canvas: { width: 520, height: 320 },
		globalAlpha: 1,
		fillStyle: "",
		save: (): void => {
			stateStack.push({
				tx,
				ty,
				globalAlpha: context.globalAlpha,
				fillStyle: context.fillStyle,
			});
		},
		restore: (): void => {
			const previous = stateStack.pop();
			if (!previous) {
				return;
			}

			tx = previous.tx;
			ty = previous.ty;
			context.globalAlpha = previous.globalAlpha;
			context.fillStyle = previous.fillStyle;
		},
		translate: (deltaX: number, deltaY: number): void => {
			tx += deltaX;
			ty += deltaY;
		},
		fillRect: (x: number, y: number, width: number, height: number): void => {
			fills.push({
				x,
				y,
				width,
				height,
				tx,
				ty,
				fillStyle: context.fillStyle,
			});
		},
		setTransform: (): void => {
			tx = 0;
			ty = 0;
		},
	};

	const canvas = {
		getCanvas: () => context.canvas,
		getContext: () => context as unknown as RenderingContext,
		getShapeDrawer: () => ({
			drawBackground: (color: string): void => {
				context.fillStyle = color;
				context.fillRect(0, 0, context.canvas.width, context.canvas.height);
			},
		}),
		reset: (): void => {
			context.setTransform(1, 0, 0, 1, 0, 0);
		},
	};

	return { canvas, context, fills };
};

describe("Scene render offsets", () => {
	test("background fill ignores camera offset and only follows render offset", () => {
		const { canvas, fills } = createRenderHarness();
		const scene = new Scene("render", "#0f172a");
		scene.setContext({
			getCanvas: () => canvas,
		} as unknown as ReturnType<Scene["getContext"]>);

		scene.setOffset(new Vector(120, 40));
		scene.setRenderOffset(new Vector(-30, 15));
		scene.render(canvas as unknown as Parameters<Scene["render"]>[0]);

		expect(fills).toHaveLength(1);
		expect(fills[0]).toEqual({
			x: 0,
			y: 0,
			width: 520,
			height: 320,
			tx: -30,
			ty: 15,
			fillStyle: "#0f172a",
		});
	});

	test("game object render positions include both camera and render offsets", () => {
		const scene = new Scene("positions");
		const object = new GameObject("probe", new Vector(5, 6));

		scene.addGameObject(object);
		scene.setOffset(new Vector(10, 20));
		scene.setRenderOffset(new Vector(30, 40));

		expect(object.getPosition()).toEqual(new Vector(45, 66));
		expect(object.getScenePosition()).toEqual(new Vector(5, 6));
	});
});
