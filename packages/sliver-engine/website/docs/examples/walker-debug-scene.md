---
title: Walker debug scene
sidebar_position: 7
---
import sandpack1IndexTs from "../sandpack/examples/walker-debug-scene/interactive-example/index.ts?raw";
import sandpack1MainTs from "../sandpack/examples/walker-debug-scene/interactive-example/main.ts?raw";
import sandpack1SceneTs from "../sandpack/examples/walker-debug-scene/interactive-example/scene.ts?raw";

This example is a compact version of the internal walker debug scene, adapted for the docs preview size.

Use it to stress obstacle avoidance with the same core debugging features:

- drag solid walls to invalidate the current route
- switch `pathNotFoundBehavior` live
- pause, resume, or abort pathfinding without resetting the whole walker
- force recalculation, toggle movement, and hard-reset the patrol

## Controls

- `1` = `snap`
- `2` = `stop`
- `3` = `continue`
- `4` = `throw`
- `Q` = pause pathfinding
- `E` = resume pathfinding
- `X` = abort pathfinding
- `Space` = toggle walker
- `R` = hard reset
- `P` = request path recalculation

`throw` is expected to raise an error in the preview when the route becomes impossible.

## Interactive example

Click the preview first so it receives keyboard focus, then drag the marked walls around the patrol route and switch behaviors while the walker is moving.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
		"/scene.ts": sandpack1SceneTs,
	}}
	visibleFiles={["/scene.ts"]}
	activeFile="/scene.ts"
	editorHeight={420}
	previewHeight={360}
	layout="preview-first"
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
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
