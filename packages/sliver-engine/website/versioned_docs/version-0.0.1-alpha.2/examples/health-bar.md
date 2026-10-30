---
title: Health bar HUD
sidebar_position: 2
---

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
import { GameObject, SquareHitbox, Vector } from "sliver-engine";

class Player extends GameObject {
  public hp = 10;
  public maxHp = 10;

  constructor(position: Vector) {
    super("player", position);
    this.addHitbox(new SquareHitbox(Vector.zero(), new Vector(16, 16), this));
    this.setPhisics({ immovable: false });

    // Attach UI as a child so it follows the player automatically.
    const healthBar = new HealthBar();
    this.addChild(healthBar);
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }
}
```

Why this pattern is nice:

- The UI doesn’t need to find the player globally or subscribe to messages.
- The bar automatically inherits scene/context from the parent via `addChild(...)`.
