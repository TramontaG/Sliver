---
title: Camera follow (scene offset)
sidebar_position: 4
---
import sandpack1IndexTs from "../sandpack/examples/camera-follow/interactive-example/index.ts?raw";
import sandpack1CameraFollowerTs from "../sandpack/examples/camera-follow/interactive-example/CameraFollower.ts?raw";
import sandpack1PlayerTs from "../sandpack/examples/camera-follow/interactive-example/Player.ts?raw";
import sandpack1CreateWorldMarkersTs from "../sandpack/examples/camera-follow/interactive-example/createWorldMarkers.ts?raw";
import sandpack1MainTs from "../sandpack/examples/camera-follow/interactive-example/main.ts?raw";

This example shows a simple “camera follow” by updating the scene’s `offset` every tick.

Key idea: `Scene.setOffset(...)` shifts how objects render and how some input helpers map mouse coordinates (see the `Scenes`/`Physics` docs).

## Follow the player (centered)

```ts
import { GameObject, Vector } from "sliver-engine";

class CameraFollower extends GameObject {
  constructor(private target: GameObject) {
    super("camera:follower", Vector.zero(), false, true);
  }

  override tick(): void {
    const scene = this.scene;
    const ctx = this.getContext();
    if (!scene || !ctx) return;

    const canvasEl = ctx.getCanvas().getCanvas();
    const center = new Vector(canvasEl.width / 2, canvasEl.height / 2);

    // Target position in world/scene space (does not include current offset).
    const targetPos = this.target.getScenePosition();

    // Offset is added to object positions at render time, so we set it so that
    // targetPos ends up at the canvas center.
    scene.setOffset(center.toSubtracted(targetPos));
  }
}
```

Add it to the scene once:

```ts
mainScene.addGameObject(new CameraFollower(player));
```

## Tips

- Clamp the offset if you want camera bounds (so it won’t show outside the level).
- If you want "smooth" camera, interpolate towards the desired offset instead of snapping.

## Interactive example

This sandbox follows a moving player and updates the scene offset every tick.

- Edit `CameraFollower.ts` to tweak follow behavior.
- Press **Run** to apply changes.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/CameraFollower.ts": sandpack1CameraFollowerTs,
		"/Player.ts": {
			code: sandpack1PlayerTs,
			readOnly: true,
		},
		"/createWorldMarkers.ts": {
			code: sandpack1CreateWorldMarkersTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/CameraFollower.ts"]}
	activeFile="/CameraFollower.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/Player.ts",
		"/createWorldMarkers.ts",
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
