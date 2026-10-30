---
title: Flappy mini game
sidebar_position: 9
---
import sandpack1IndexTs from "../sandpack/examples/flappy-mini-game/interactive-example/index.ts?raw";
import sandpack1BirdTs from "../sandpack/examples/flappy-mini-game/interactive-example/Bird.ts?raw";
import sandpack1ConstantsTs from "../sandpack/examples/flappy-mini-game/interactive-example/constants.ts?raw";
import sandpack1PipePairTs from "../sandpack/examples/flappy-mini-game/interactive-example/PipePair.ts?raw";
import sandpack1PipeSpawnerTs from "../sandpack/examples/flappy-mini-game/interactive-example/PipeSpawner.ts?raw";
import sandpack1WorldBoundariesTs from "../sandpack/examples/flappy-mini-game/interactive-example/WorldBoundaries.ts?raw";
import sandpack1ScoreHudTs from "../sandpack/examples/flappy-mini-game/interactive-example/ScoreHud.ts?raw";
import sandpack1MainTs from "../sandpack/examples/flappy-mini-game/interactive-example/main.ts?raw";

This example shows a complete Flappy-style loop:

- input (`Space` / click)
- gravity and flap impulse
- pipe spawning and scoring
- game over and reset flow

The movement constants in this demo use the current physics units:

- `GRAVITY` is acceleration in world units per second squared.
- `FLAP_VELOCITY` and `PIPE_SPEED` are velocities in world units per second.
- The playable tuning uses the same scale as the debug scene: gravity around `1200` and lateral speeds around `120`.

Tip: this uses decorators, so `experimentalDecorators: true` should be enabled in your `tsconfig.json`.

## Interactive example

This sandbox keeps the same Flappy loop split into focused files.

- Press `Space` or click to flap.
- On game over, press `Space` or click to reset.
- All game files are visible, so you can inspect the full setup end-to-end.

<SandpackExample
files={{
"/index.ts": {
code: sandpack1IndexTs,
},
"/Bird.ts": sandpack1BirdTs,
"/constants.ts": {
code: sandpack1ConstantsTs,

    	},
    	"/PipePair.ts": {
    		code: sandpack1PipePairTs,
    	},
    	"/PipeSpawner.ts": {
    		code: sandpack1PipeSpawnerTs,
    	},
    	"/WorldBoundaries.ts": {
    		code: sandpack1WorldBoundariesTs,
    	},
    	"/ScoreHud.ts": {
    		code: sandpack1ScoreHudTs,
    	},
    	"/main.ts": {
    		code: sandpack1MainTs,
    	},
    }}

layout="code-heavy"
visibleFiles={[
"/constants.ts",
"/Bird.ts",
"/PipePair.ts",
"/PipeSpawner.ts",
"/WorldBoundaries.ts",
"/ScoreHud.ts",
]}
activeFile="/main.ts"
editorHeight={520}
previewWidth={480}
showRunButton
hiddenFiles={[
"/index.html",
"/styles.css",
"/package.json",
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
