---
title: Physics
sidebar_position: 6
---

Sliver’s physics is intentionally lightweight and **tick-based**:

- Movement is integrated once per tick (`position += speed`, `rotation += angularVelocity`).
- Gravity is a per-tick vector stored on the `Scene`.
- Collisions are resolved from `Hitbox` overlaps after all objects tick.

This makes physics deterministic with respect to ticks, and keeps the engine simple. It also means you should think in “per tick” units unless you convert from seconds using the tick rate.

## Physics properties on GameObject

Every `GameObject` has a `phisics` descriptor (note the spelling):

```ts
gameObject.setPhisics({
  immovable: false,
  affectedByGravity: true,
  restitution: 0.2,
  friction: 0.4,
  mass: 2,
});
```

- `immovable`: if `true`, collision resolution won’t translate the object and its inverse mass is treated as `0`.
- `affectedByGravity`: if `true`, the scene gravity vector is added to `speed` each tick (only if not immovable and not being dragged).
- `restitution`: bounciness used for collision impulse resolution (`0` = no bounce, `1` = perfectly elastic). Values are clamped to `[0, 1]`.
- `friction`: tangential impulse clamp (`0` = no friction). Values are clamped to `[0, 1]`.
- `mass`: used to distribute collision impulses and translation. If `<= 0` or invalid, it falls back to `1`.

## Motion: speed and angular velocity

The engine integrates motion in `GameObject.tick()`:

- `speed` (`Vector`) is applied to `position` once per tick.
- `angularVelocity` (`number`) is applied to `rotation` once per tick.

Example: constant velocity:

```ts
import { Vector } from "sliver-engine";

gameObject.speed = new Vector(2, 0); // +2 px per tick
```

If you prefer “pixels per second”, compute a per-tick delta using the tick rate:

```ts
const dt = 1 / this.getContext()!.getTickRate();
this.speed = new Vector(120 * dt, 0); // 120 px/s converted to px/tick
```

## Gravity (Scene)

Scenes store a gravity vector:

```ts
import { Vector } from "sliver-engine";

scene.setGravity(new Vector(0, 0.4));
```

Gravity is applied by `GameObject.tick()` when:

- `phisics.affectedByGravity === true`
- `phisics.immovable === false`
- `beingGrabbed === false` (dragging temporarily disables gravity; see [`Input & events`](./events.md) for the drag/grab decorators and patterns)

Gravity is added directly to `speed` once per tick, so treat it as “acceleration per tick”.

## Hitboxes (Square and Circle)

Collisions use `Hitbox`es attached to `GameObject`s:

- `SquareHitbox(offset, size, gameObject, options?)`
- `CircleHitbox(offset, radius, gameObject, options?)`

Attach hitboxes with `addHitbox`:

```ts
import { GameObject, SquareHitbox, Vector } from "sliver-engine";

const box = new GameObject("crate", new Vector(100, 100));
box.setPhisics({ immovable: false });
box.addHitbox(new SquareHitbox(Vector.zero(), new Vector(32, 32), box));
```

### Hitbox options: `solid` and `debug`

```ts
box.addHitbox(
  new SquareHitbox(Vector.zero(), new Vector(32, 32), box, {
    solid: true,
    debug: false,
  })
);
```

- `solid: false` means “detect overlap, but don’t resolve collisions/impulses”.
  - This is useful for UI hit-testing or trigger volumes.
- `debug: true` renders the hitbox (via the object’s debug rendering path).

Tip: `GameObject.addHitbox` warns when you add 5+ hitboxes; many hitboxes can get expensive because collisions are pairwise.

## Collision pipeline (what happens each tick)

After all objects tick, `Scene` runs collision handling:

1) It filters to **active** objects that have hitboxes.
2) It loops over object pairs and checks hitbox intersections.
3) For each overlapping pair:
   - calls `a.beforeColision(b)` and `b.beforeColision(a)` once per pair per tick
   - calls `a.onColision(b, penetration)` / `b.onColision(a, -penetration)` once per pair per tick
   - computes a resolution using `ColisionHandler.resolveCollision(...)`
   - translates objects (unless immovable) and may apply impulses (speed/angularVelocity)

Important details:
- If either object’s `beforeColision` returns `false`, the pair is ignored for the remainder of that tick.
- If either hitbox is `solid: false`, the engine will still notify `onColision` (overlap), but will skip resolution/impulses.
- The engine runs a small number of resolution passes to settle stacks (to reduce deep interpenetration).

### Using `beforeColision` for triggers and filters

Example: ignore collisions with your own bullets, but still react to others:

```ts
override beforeColision(other: GameObject): boolean {
  return other.name !== "bullet";
}
```

### Using `onColision` for gameplay reactions

```ts
import { GameObject, Vector } from "sliver-engine";

override onColision(other: GameObject, penetration: Vector): void {
  if (other.name === "spikes") {
    this.sendMessage("player:died", null);
  }
}
```

`penetration` is the overlap vector (minimum translation direction/amount) computed from hitboxes, which is often useful for “which side did we hit?” style logic.

## Common patterns

### Static ground + dynamic player

- Ground: `immovable: true` (default) with a solid hitbox
- Player: `immovable: false`, `affectedByGravity: true`, a solid hitbox

### Non-solid triggers

Use a non-solid hitbox and handle the overlap in `onColision`:

```ts
trigger.addHitbox(
  new SquareHitbox(Vector.zero(), new Vector(64, 64), trigger, { solid: false })
);
```

### “Pause” without physics advancing

Scenes are all ticked while active. If you push an overlay scene (pause menu) but want gameplay physics to stop, gate your gameplay objects’ `tick()` logic (or switch scenes with replace). See [`Game loop`](./game-loop.md) and [`Scenes`](./scenes.md).
