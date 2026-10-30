import {
	TextBoxSequence,
	Vector,
	Walker,
	conditional,
	parallel,
	scripted,
	sequenceOf,
	waitUntil,
	walkCharacter,
	type ScriptEvent,
	type TextEntry,
} from "sliver-engine";
import type { CutsceneActor } from "./CutsceneActor";
import type { CutsceneRunner, ShrineGate } from "./CutsceneRunner";

export type CutsceneChoice = "accept" | "refuse" | "ask";

export type CutsceneState = {
	elder: CutsceneActor;
	hero: CutsceneActor;
	runner: CutsceneRunner;
	gate: ShrineGate;
	runId: number;
	coinsAwarded: number;
	choice: CutsceneChoice | null;
};

const CHOICE_OPTIONS = [
	{ key: "1", label: "Accept the elder's coins" },
	{ key: "2", label: "Refuse the offer" },
	{ key: "3", label: "Ask why the elder is helping" },
];

const createTextBoxSequence = (lines: string[]): ScriptEvent<CutsceneState> => {
	const base: Omit<TextEntry, "text"> = {
		position: "bottom",
		textSize: 18,
		boxColor: "rgba(2, 6, 23, 0.86)",
		textColor: "white",
		lettersPerTick: 2,
		skipTyping: false,
	};

	const entries: TextEntry[] = lines.map((text) => ({ ...base, text }));
	return TextBoxSequence<CutsceneState>(entries);
};

const setStatus = (status: string, detail: string): ScriptEvent<CutsceneState> => {
	return scripted<CutsceneState>(async (_ctx, state) => {
		state.runner.setScriptStatus(state.runId, status, detail);
		return state;
	}, "setStatus");
};

const say = (
	status: string,
	detail: string,
	lines: string[],
): ScriptEvent<CutsceneState> => {
	return sequenceOf<CutsceneState>([
		setStatus(status, detail),
		createTextBoxSequence(lines),
	], "say");
};

const promptForChoice = scripted<CutsceneState>(async (_ctx, state) => {
	state.runner.showChoicePrompt(
		state.runId,
		"How do you answer the elder?",
		CHOICE_OPTIONS,
	);
	return state;
}, "promptForChoice");

const waitForChoiceSelection = waitUntil<CutsceneState>(
	(_ctx, state) => state.runner.hasSelectedChoice(state.runId),
	{ label: "waitForChoice" },
);

const captureChoice = scripted<CutsceneState>(async (_ctx, state) => {
	const choice = state.runner.consumeSelectedChoice(state.runId);
	return {
		...state,
		choice: choice ?? state.choice,
	};
}, "captureChoice");

const awardCoins = (amount: number): ScriptEvent<CutsceneState> => {
	return scripted<CutsceneState>(async (_ctx, state) => {
		state.elder.coins = Math.max(0, state.elder.coins - amount);
		state.hero.coins += amount;
		return {
			...state,
			coinsAwarded: amount,
		};
	}, "awardCoins");
};

const startGateOpening = scripted<CutsceneState>(async (_ctx, state) => {
	state.runner.startGateOpening(state.runId);
	return state;
}, "startGateOpening");

const waitForGateToOpen = waitUntil<CutsceneState>(
	(_ctx, state) => state.gate.isOpen() || !state.runner.isRunCurrent(state.runId),
	{ label: "waitForGateToOpen" },
);

const finishCutscene = scripted<CutsceneState>(async (_ctx, state) => {
	state.runner.finishCutscene(
		state.runId,
		"The moon gate is open.",
		"Walk through it or press R to restart.",
	);
	return state;
}, "finishCutscene");

const makeAcceptBranch = (): ScriptEvent<CutsceneState> => {
	return sequenceOf<CutsceneState>([
		say(
			"The elder offers a full pouch.",
			"Space advances dialog.",
			[
				"Then take this pouch.",
				"Ten coins should keep your boots moving.",
			],
		),
		awardCoins(10),
	], "acceptBranch");
};

const makeRefuseBranch = (): ScriptEvent<CutsceneState> => {
	return say(
		"You refuse the offer.",
		"Space advances dialog.",
		[
			"Fair enough.",
			"Keep your pride, then keep your footing.",
		],
	);
};

const makeAskBranch = (): ScriptEvent<CutsceneState> => {
	return sequenceOf<CutsceneState>([
		say(
			"The elder explains the road ahead.",
			"Space advances dialog.",
			[
				"Because the north road eats the unprepared.",
				"Take a smaller pouch, and don't linger in the pass.",
			],
		),
		awardCoins(4),
	], "askBranch");
};

const makeOutcomeLine = (): ScriptEvent<CutsceneState> => {
	return conditional<CutsceneState>(
		(state) => state.coinsAwarded >= 10,
		say(
			"The shrine responds to the gift.",
			"Space advances dialog.",
			[
				"The moon gate knows generosity.",
				"Go on. It will open for you.",
			],
		),
		conditional<CutsceneState>(
			(state) => state.coinsAwarded > 0,
			say(
				"The elder gives a quiet warning.",
				"Space advances dialog.",
				[
					"It isn't much, but it will do.",
					"I've opened the way. Use it well.",
				],
			),
			say(
				"The elder steps aside anyway.",
				"Space advances dialog.",
				[
					"No coin, then. Only a clear road.",
					"The gate is yours. Don't waste the night.",
				],
			),
			"partialRewardOutcome",
		),
		"rewardOutcome",
	);
};

export const makeIntroCutscene = (
	elder: CutsceneActor,
): ScriptEvent<CutsceneState> => {
	const elderApproachWalker = new Walker(
		elder,
		[elder.getScenePosition().toAdded(new Vector(-52, 0))],
		84,
		false,
		false,
	);
	const elderStepAsideWalker = new Walker(
		elder,
		[elder.getScenePosition().toAdded(new Vector(-88, 12))],
		84,
		false,
		false,
	);

	return sequenceOf<CutsceneState>(
		[
			parallel<CutsceneState>(
				[
					say(
						"The elder greets you.",
						"Space advances dialog.",
						[
							"The shrine has been waiting for you.",
							"Come closer, traveler.",
						],
					),
					walkCharacter<CutsceneState>(elder, elderApproachWalker, "elderApproach"),
				],
				"openingBeat",
			),
			say(
				"The elder studies your pack.",
				"Space advances dialog.",
				[
					"The north road is still sealed by the moon gate.",
					"I can spare supplies, but the choice is yours.",
				],
			),
			promptForChoice,
			waitForChoiceSelection,
			captureChoice,
			conditional<CutsceneState>(
				(state) => state.choice === "accept",
				makeAcceptBranch(),
				conditional<CutsceneState>(
					(state) => state.choice === "refuse",
					makeRefuseBranch(),
					makeAskBranch(),
					"branchRefuseOrAsk",
				),
				"branchByChoice",
			),
			parallel<CutsceneState>(
				[
					sequenceOf<CutsceneState>([
						setStatus("The shrine gate stirs.", "Watch the world change while the cutscene continues."),
						startGateOpening,
						waitForGateToOpen,
					], "gateSequence"),
					walkCharacter<CutsceneState>(elder, elderStepAsideWalker, "elderStepAside"),
				],
				"worldChangeBeat",
			),
			makeOutcomeLine(),
			finishCutscene,
		],
		"interactiveIntroCutscene",
	);
};
