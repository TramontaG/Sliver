import { Button, type GameObject, Vector } from "sliver-engine";
import { PlayerState } from "./PlayerState";
import type { GameState } from "./types";

const STATUS_CHANNEL = "save:status";
const LEFT_X = 24;
const RIGHT_X = 198;
const START_Y = 40;
const BUTTON_WIDTH = 150;
const BUTTON_HEIGHT = 40;
const ROW_STEP = 14;

const trimId = (id: string): string => id.slice(0, 8);

export const createSaveButtons = (player: PlayerState): GameObject[] => {
	const saveButton = new Button(
		"save",
		new Vector(LEFT_X, START_Y),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Save",
		"#2da44e",
		"white",
		(btn) => {
			const ctx = btn.getContext();
			if (!ctx) return;

			const state = player.toState();
			const id = ctx.getGame().saves.create(state, {
				label: "L" + state.level + " HP" + state.hp,
			});
			btn.sendMessage(STATUS_CHANNEL, "Saved " + trimId(id));
		},
	);

	const loadLatestButton = new Button(
		"load-latest",
		new Vector(LEFT_X, START_Y + BUTTON_HEIGHT + ROW_STEP),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Load latest",
		"#1d4ed8",
		"white",
		(btn) => {
			const ctx = btn.getContext();
			if (!ctx) return;

			const entries = ctx.getGame().saves.list();
			const latest = entries[0];
			if (!latest) {
				btn.sendMessage(STATUS_CHANNEL, "No saves found");
				return;
			}

			const save = ctx.getGame().saves.read<GameState>(latest.id);
			if (!save) {
				btn.sendMessage(STATUS_CHANNEL, "Failed to read save");
				return;
			}

			player.applyState(save.data);
			btn.sendMessage(STATUS_CHANNEL, "Loaded " + trimId(latest.id));
		},
	);

	const clearButton = new Button(
		"clear-saves",
		new Vector(LEFT_X, START_Y + (BUTTON_HEIGHT + ROW_STEP) * 2),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Clear saves",
		"#7f1d1d",
		"white",
		(btn) => {
			const ctx = btn.getContext();
			if (!ctx) return;
			ctx.getGame().saves.clear();
			btn.sendMessage(STATUS_CHANNEL, "Cleared all saves");
		},
	);

	const damageButton = new Button(
		"damage",
		new Vector(RIGHT_X, START_Y),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Damage -1",
		"#b91c1c",
		"white",
		(btn) => {
			player.damage(1);
			btn.sendMessage(STATUS_CHANNEL, "HP changed to " + player.hp);
		},
	);

	const healButton = new Button(
		"heal",
		new Vector(RIGHT_X, START_Y + BUTTON_HEIGHT + ROW_STEP),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Heal +1",
		"#15803d",
		"white",
		(btn) => {
			player.heal(1);
			btn.sendMessage(STATUS_CHANNEL, "HP changed to " + player.hp);
		},
	);

	const levelButton = new Button(
		"level-up",
		new Vector(RIGHT_X, START_Y + (BUTTON_HEIGHT + ROW_STEP) * 2),
		new Vector(BUTTON_WIDTH, BUTTON_HEIGHT),
		"Level +1",
		"#7c3aed",
		"white",
		(btn) => {
			player.levelUp();
			btn.sendMessage(STATUS_CHANNEL, "Level changed to " + player.level);
		},
	);

	return [
		saveButton,
		loadLatestButton,
		clearButton,
		damageButton,
		healButton,
		levelButton,
	];
};
