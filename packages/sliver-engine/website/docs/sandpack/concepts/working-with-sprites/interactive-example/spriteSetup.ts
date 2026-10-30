import { Vector } from "sliver-engine";
import type { CanvasController } from "sliver-engine";
import { HUMAN_SHEET_DATA_URL } from "./humanSheetData";

const HUMAN_SHEET_URL = new URL(HUMAN_SHEET_DATA_URL);
const HERO_SHEET_NAME = "demo:hero";

type SpriteRectDefinition = readonly [
	name: string,
	fromCol: number,
	fromRow: number,
	toCol: number,
	toRow: number,
];

const HERO_FRAME_DEFINITIONS: readonly SpriteRectDefinition[] = [
	["hero_down_0", 0, 0, 1, 1],
	["hero_down_1", 2, 0, 3, 1],
	["hero_down_2", 4, 0, 5, 1],
	["hero_down_3", 6, 0, 7, 1],
	["hero_up_0", 0, 2, 1, 3],
	["hero_up_1", 2, 2, 3, 3],
	["hero_up_2", 4, 2, 5, 3],
	["hero_up_3", 6, 2, 7, 3],
	["hero_left_0", 0, 4, 1, 5],
	["hero_left_1", 2, 4, 3, 5],
	["hero_left_2", 4, 4, 5, 5],
	["hero_left_3", 6, 4, 7, 5],
];

export const loadDemoHeroSprites = async (
	canvas: CanvasController,
): Promise<void> => {
	const sprites = canvas.getSpriteLibrary();

	await sprites.loadSpriteSheet(HERO_SHEET_NAME, HUMAN_SHEET_URL, 16, 16);

	for (const [name, fromCol, fromRow, toCol, toRow] of HERO_FRAME_DEFINITIONS) {
		sprites.defineSpriteFromSheet(
			name,
			HERO_SHEET_NAME,
			new Vector(fromCol, fromRow),
			new Vector(toCol, toRow),
		);
	}
};
