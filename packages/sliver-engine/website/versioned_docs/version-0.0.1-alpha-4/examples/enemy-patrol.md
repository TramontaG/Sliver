---
title: Enemy patrol (Walker)
sidebar_position: 6
---

This example shows a basic enemy patrol using `Walker`:

- move along waypoints
- optional obstacle avoidance
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
      1.5,   // speed: px per tick
      true,  // debug
      true,  // cyclic
      {
        avoidObstacles: true,
        gridCellSize: 16,
        recalculateEveryTicks: 30,
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

