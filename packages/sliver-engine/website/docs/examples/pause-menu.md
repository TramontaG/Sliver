---
title: Pause menu
sidebar_position: 3
---
import sandpack1IndexTs from "../sandpack/examples/pause-menu/interactive-example/index.ts?raw";
import sandpack1PauseControllerTs from "../sandpack/examples/pause-menu/interactive-example/PauseController.ts?raw";
import sandpack1CreatePauseSceneTs from "../sandpack/examples/pause-menu/interactive-example/createPauseScene.ts?raw";
import sandpack1CreateMainSceneTs from "../sandpack/examples/pause-menu/interactive-example/createMainScene.ts?raw";
import sandpack1MainTs from "../sandpack/examples/pause-menu/interactive-example/main.ts?raw";

This example shows a pause menu that **really pauses gameplay**.

Important detail: in Sliver, **all active scenes tick**. If you only `pushScene("pause")`, the gameplay scene underneath will keep ticking.

To pause simulation, use `"replace"` (or `setCurrentScene`) so the gameplay scene is no longer active.

## Pause scene with a resume button

```ts
import { Scene, Vector, Button, fadeTransition } from "sliver-engine";

const pauseScene = new Scene("pause", "rgba(0,0,0,0.4)");
const RETURN_TO_SCENE = "main";

pauseScene.addGameObject(
  new Button(
    "resume",
    new Vector(300, 250),
    new Vector(200, 60),
    "Resume",
    "#6f42c1",
    "white",
    (btn) => {
      // Resume with a small fade transition.
      btn
        .getContext()
        ?.transitionToScene(RETURN_TO_SCENE, fadeTransition(250), "replace");
    }
  )
);
```

## Opening pause via a key combo

Use a key decorator on an always-present object (or your player):

```ts
import { GameObject, onKeyPressed, fadeTransition } from "sliver-engine";
import type { GameEvent } from "sliver-engine";

class PauseController extends GameObject {
  @onKeyPressed("Escape", (obj) => {
    const ctx = obj.getContext();
    if (!ctx) return;
    // Replace with a small fade, so the gameplay scene stops ticking.
    ctx.transitionToScene("pause", fadeTransition(250), "replace");
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}
```

Add `PauseController` to your gameplay scene once.

## Optional: keep gameplay visible while paused

If you want gameplay to remain visible while paused (a true overlay), you need to _stop ticking it yourself_ (because pushing an overlay keeps the gameplay scene active).

One simple pattern:

- push the pause scene (`pushScene("pause")`) so it renders on top and captures input (make sure it's background is transparent)
- set a flag on the scene to stop ticking
- override the method tick() of the scene to return early if this flag is set

## Interactive example

This sandbox demonstrates the pause flow with two scenes:

- `main`: moving gameplay box + `PauseController`
- `pause`: resume button that returns to `main`

Press `Escape` to pause and click **Resume** to continue.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/PauseController.ts": sandpack1PauseControllerTs,
		"/createPauseScene.ts": sandpack1CreatePauseSceneTs,
		"/createMainScene.ts": {
			code: sandpack1CreateMainSceneTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/PauseController.ts", "/createPauseScene.ts"]}
	activeFile="/PauseController.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/createMainScene.ts",
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
