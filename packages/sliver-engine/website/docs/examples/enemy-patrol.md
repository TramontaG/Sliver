---
title: Enemy patrol (Walker)
sidebar_position: 6
---
import sandpack1IndexTs from "../sandpack/examples/enemy-patrol/interactive-example/index.ts?raw";
import sandpack1PatrollingEnemyTs from "../sandpack/examples/enemy-patrol/interactive-example/PatrollingEnemy.ts?raw";
import sandpack1CreateArenaTs from "../sandpack/examples/enemy-patrol/interactive-example/createArena.ts?raw";
import sandpack1MainTs from "../sandpack/examples/enemy-patrol/interactive-example/main.ts?raw";

This example shows a patrolling enemy using `Walker` with draggable obstacles in the preview:

- move along waypoints
- obstacle avoidance
- live route invalidation by dragging blockers
- optional debug rendering

## Enemy with a walker

```ts
import { GameObject, SquareHitbox, Vector, Walker } from "sliver-engine";

class PatrollingEnemy extends GameObject {
  constructor(position: Vector) {
    super("enemy", position);
    this.addHitbox(new SquareHitbox(Vector.zero(), new Vector(16, 16), this));
    this.setPhisics({ immovable: false });

    const walker = new Walker(
      this,
      [new Vector(100, 100), new Vector(300, 100), new Vector(300, 220)],
      90,    // movement speed in pixels per second
      true,  // debug
      true,  // cyclic
      {
        avoidObstacles: true,
        gridCellSize: 16,
        recalculateEveryTicks: 30,
        pathNotFoundBehavior: "snap",
        snapTargetToEdgeDistance: 32,
      }
    );

    this.setWalker(walker);
    walker.start();
  }
}
```

Drop it into your scene:

```ts
mainScene.addGameObject(new PatrollingEnemy(new Vector(100, 100)));
```

If you don’t want pathfinding, remove the `pathfindingOptions` (or set `avoidObstacles: false`).

`Walker` speed is time-based, so author it in pixels per second.

## Interactive example

This sandbox runs a patrolling enemy with `Walker`.

- Edit `PatrollingEnemy.ts` to tweak waypoints and walker options.
- Drag the darker walls in the preview to invalidate the current path.
- Press **Run** to apply changes.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/PatrollingEnemy.ts": sandpack1PatrollingEnemyTs,
		"/createArena.ts": {
			code: sandpack1CreateArenaTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/PatrollingEnemy.ts"]}
	activeFile="/PatrollingEnemy.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/createArena.ts",
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
