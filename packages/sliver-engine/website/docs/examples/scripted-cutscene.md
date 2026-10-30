---
title: Scripted cutscene (state + combinators)
sidebar_position: 8
---
import sandpack1IndexTs from "../sandpack/examples/scripted-cutscene/interactive-example/index.ts?raw";
import sandpack1MakeIntroCutsceneTs from "../sandpack/examples/scripted-cutscene/interactive-example/makeIntroCutscene.ts?raw";
import sandpack1CutsceneActorTs from "../sandpack/examples/scripted-cutscene/interactive-example/CutsceneActor.ts?raw";
import sandpack1CutsceneHudTs from "../sandpack/examples/scripted-cutscene/interactive-example/CutsceneHud.ts?raw";
import sandpack1CutsceneRunnerTs from "../sandpack/examples/scripted-cutscene/interactive-example/CutsceneRunner.ts?raw";
import sandpack1MainTs from "../sandpack/examples/scripted-cutscene/interactive-example/main.ts?raw";

This remake turns the cutscene into an actual interaction:

- the hero can walk around before the cutscene starts
- pressing `E` near the elder triggers the sequence
- the player chooses a branch with `1`, `2`, or `3`
- the world changes visibly when the shrine gate opens

## 1) Keep typed state for the whole sequence

```ts
type CutsceneState = {
  elder: CutsceneActor;
  hero: CutsceneActor;
  runner: CutsceneRunner;
  gate: ShrineGate;
  runId: number;
  coinsAwarded: number;
  choice: "accept" | "refuse" | "ask" | null;
};
```

## 2) Treat choices as script state, not hidden logic

```ts
const promptForChoice = scripted<CutsceneState>(async (_ctx, state) => {
  state.runner.showChoicePrompt(
    state.runId,
    "How do you answer the elder?",
    [
      { key: "1", label: "Accept the elder's coins" },
      { key: "2", label: "Refuse the offer" },
      { key: "3", label: "Ask why the elder is helping" },
    ]
  );
  return state;
}, "promptForChoice");

const waitForChoiceSelection = waitUntil<CutsceneState>(
  (_ctx, state) => state.runner.hasSelectedChoice(state.runId),
  { label: "waitForChoice" }
);

const captureChoice = scripted<CutsceneState>(async (_ctx, state) => {
  return {
    ...state,
    choice: state.runner.consumeSelectedChoice(state.runId),
  };
}, "captureChoice");
```

## 3) Compose dialog, motion, branching, and world changes

```ts
return sequenceOf<CutsceneState>([
  parallel([
    say("The elder greets you.", "Space advances dialog.", [
      "The shrine has been waiting for you.",
      "Come closer, traveler.",
    ]),
    walkCharacter(elder, elderApproachWalker, "elderApproach"),
  ]),

  promptForChoice,
  waitForChoiceSelection,
  captureChoice,

  conditional(
    (state) => state.choice === "accept",
    makeAcceptBranch(),
    conditional(
      (state) => state.choice === "refuse",
      makeRefuseBranch(),
      makeAskBranch()
    )
  ),

  parallel([
    sequenceOf([
      startGateOpening,
      waitForGateToOpen,
    ]),
    walkCharacter(elder, elderStepAsideWalker, "elderStepAside"),
  ]),

  finishCutscene,
]);
```

## 4) Start the cutscene from player interaction

Instead of auto-running on scene load, the example waits until the hero is near the elder and the player presses `E`. The runner also owns restart and choice input.

This makes the example much closer to a real game event: the player causes it, reacts to it, and gets control back after the gate opens.

## Interactive example

This sandbox demonstrates a triggerable, branching cutscene with visible world changes.

- `W/A/S/D`: move before and after the cutscene
- `E`: talk to the elder
- `Space`: advance dialog
- `1/2/3`: choose a response
- `R`: restart the demo
- Edit `makeIntroCutscene.ts` to tweak the scripted flow

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/makeIntroCutscene.ts": sandpack1MakeIntroCutsceneTs,
		"/CutsceneActor.ts": {
			code: sandpack1CutsceneActorTs,
			readOnly: true,
		},
		"/CutsceneHud.ts": {
			code: sandpack1CutsceneHudTs,
			readOnly: true,
		},
		"/CutsceneRunner.ts": {
			code: sandpack1CutsceneRunnerTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/makeIntroCutscene.ts"]}
	activeFile="/makeIntroCutscene.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/CutsceneActor.ts",
		"/CutsceneHud.ts",
		"/CutsceneRunner.ts",
	]}
	options={{
		autoReload: false,
		showNavigator: true,
		showRefreshButton: true,
		showTabs: true,
		showLineNumbers: true,
		wrapContent: false,
	}}
	customSetup={{
		dependencies: {
			"sliver-engine": "0.0.1-alpha-5",
		},
	}}
/>
