---
title: Health bar HUD
sidebar_position: 2
---
import sandpack1IndexTs from "../sandpack/examples/health-bar/interactive-example/index.ts?raw";
import sandpack1PlayerTs from "../sandpack/examples/health-bar/interactive-example/Player.ts?raw";
import sandpack1HealthBarTs from "../sandpack/examples/health-bar/interactive-example/HealthBar.ts?raw";
import sandpack1HealButtonTs from "../sandpack/examples/health-bar/interactive-example/HealButton.ts?raw";
import sandpack1MainTs from "../sandpack/examples/health-bar/interactive-example/main.ts?raw";

This example shows a health bar as a `GameObject` that is a **child of the player**:

- it follows the player via the parent/“mothership” relationship
- it reads `hp` / `maxHp` directly from its mothership (no messages needed)

## Health bar child object

```ts
import { GameObject, Vector } from "sliver-engine";
import type { CanvasController, Scene } from "sliver-engine";

class HealthBar extends GameObject {
  constructor() {
    // Local position (relative to the player when enabled below).
    super("ui:health", new Vector(-8, -14));

    // Make this object's position relative to its mothership.
    this.setPositionRelativeToMotherShip(true);
  }

  override render(canvas: CanvasController, _scene: Scene): void {
    type PlayerWithHealth = GameObject & { hp: number; maxHp: number };
    const player = this.getMotherShip<PlayerWithHealth>();
    if (!player) return;

    const draw = canvas.getShapeDrawer();
    const pos = this.getPosition();
    const pct = player.maxHp > 0 ? player.hp / player.maxHp : 0;

    const width = 32;
    const height = 6;

    draw.drawRectangle(pos.x, pos.y, width, height, "#333", true);
    draw.drawRectangle(pos.x, pos.y, width * pct, height, "#3fb950", true);
  }
}
```

## Player owns the health bar

```ts
import {
  GameObject,
  SquareHitbox,
  Vector,
  onKeyHold,
  type GameEvent,
} from "sliver-engine";

class Player extends GameObject {
  public hp = 10;
  public maxHp = 10;
  private static readonly SPEED = 120;

  constructor(position: Vector) {
    super("player", position);
    this.addHitbox(new SquareHitbox(Vector.zero(), new Vector(16, 16), this));
    this.setPhisics({
      immovable: false,
      affectedByGravity: false,
      friction: 0,
      restitution: 0,
    });

    // Attach UI as a child so it follows the player automatically.
    const healthBar = new HealthBar();
    this.addChild(healthBar);
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  override tick(): void {
    this.speed = Vector.zero();
    super.tick();
  }

  @onKeyHold<Player>("w", (obj) => obj.speed = new Vector(0, -Player.SPEED))
  @onKeyHold<Player>("a", (obj) => obj.speed = new Vector(-Player.SPEED, 0))
  @onKeyHold<Player>("s", (obj) => obj.speed = new Vector(0, Player.SPEED))
  @onKeyHold<Player>("d", (obj) => obj.speed = new Vector(Player.SPEED, 0))
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}
```

Why this pattern is nice:

- The UI doesn’t need to find the player globally or subscribe to messages.
- The bar automatically inherits scene/context from the parent via `addChild(...)`.

## Interactive example

This sandbox shows a health bar as a child object attached to the player.

- Click the player square to damage it (`-1 HP`).
- Click the `Heal +1` button to recover HP.
- Move with `WASD` to see the health bar keep its relative offset.
- The health bar reads `hp`/`maxHp` from `getMotherShip()`.
- Edit `Player.ts` to tweak player/health behavior.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/Player.ts": sandpack1PlayerTs,
		"/HealthBar.ts": {
			code: sandpack1HealthBarTs,
		},
		"/HealButton.ts": sandpack1HealButtonTs,
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/Player.ts", "/HealthBar.ts", "/HealButton.ts"]}
	activeFile="/Player.ts"
	layout="editor-first"
	previewHeight={380}
	editorHeight={260}
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
