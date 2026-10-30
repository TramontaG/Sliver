---
title: Walker
sidebar_position: 5
---

`Walker` is an optional movement helper for `GameObject`s. It can:

- move an object along a list of waypoints (patrol paths, NPC routes)
- loop those waypoints (cyclic) or stop at the end
- optionally do simple grid-based pathfinding to avoid solid obstacles
- draw debug visuals for waypoints and the computed path

Under the hood, `Walker.tick()` sets `gameObject.speed` every tick. The object’s normal `tick()` then applies that speed to its position.

## Attaching a Walker

Create a walker and attach it to a game object:

```ts
import { GameObject, Vector, Walker } from "sliver-engine";

const npc = new GameObject("npc", new Vector(100, 100));

const walker = new Walker(
  npc,
  [new Vector(100, 100), new Vector(300, 100), new Vector(300, 300)],
  2,        // speed (pixels per tick)
  true,     // debug
  true      // cyclic (loop)
);

npc.setWalker(walker);
walker.start();
```

Notes:
- Waypoints are interpreted in **scene/world space** (they’re compared to `getScenePosition()`).
- `speed` is per tick, not per second. Convert from px/s using `1 / ctx.getTickRate()` if needed (see [`Game loop`](./game-loop.md)).
- Debug drawing respects the scene offset (so it stays aligned if the camera moves).

## Starting, stopping, and resetting

- `start()`: activates movement (and requests path recalculation)
- `toggle()`: switches active/inactive (stops by zeroing object speed)
- `reset()`: resets indices/path but does not teleport
- `hardReset()`: resets and teleports the object to the first waypoint (if it exists)

```ts
walker.toggle();
walker.reset();
walker.hardReset();
```

## Changing waypoints at runtime

```ts
walker.setWaypoints([a, b, c], true); // cyclic
```

`setWaypoints` also resets internal path state and stops the object momentarily (`speed = 0`) so the new route starts cleanly.

## Completion callback

If `ciclic` is `false`, the walker stops after reaching the final waypoint and calls `onComplete`:

```ts
walker.setOnComplete(() => {
  npc.sendMessage("npc:arrived", { name: npc.name });
});
```

## Obstacle avoidance (pathfinding)

When enabled, the walker runs a lightweight grid A* search to route around obstacles.

```ts
walker.setPathfindingOptions({
  avoidObstacles: true,
  gridCellSize: 16,
  recalculateEveryTicks: 30,
});
```

How obstacle avoidance works:
- Only **solid** hitboxes are considered (`hitbox.solid === true`).
- The walker builds a “proxy body” from the moving object’s solid hitboxes.
- It treats other active objects’ solid hitboxes in the same scene as obstacles.
- It searches on a 4-neighbor grid (up/down/left/right) and then simplifies the resulting path.

### When paths recalculate

The walker can recalculate when:

- you call `requestPathRecalculation()`
- `recalculateEveryTicks` elapses
- `shouldRecalculatePath(ctx)` returns `true`

```ts
walker.setPathfindingOptions({
  avoidObstacles: true,
  shouldRecalculatePath: ({ tick }) => tick % 10 === 0,
});
```

If there are no obstacles (or the object has no solid hitboxes), the walker falls back to moving directly toward the waypoint.

### When no path is found

If obstacle avoidance is enabled and the walker cannot find a path, it throws by default. You can control that behavior:

```ts
walker.setPathfindingOptions({
  avoidObstacles: true,
  pathNotFoundBehavior: "snap", // "throw" | "stop" | "snap" | "continue"
  snapTargetToEdgeDistance: 12,
});
```

- `throw`: throw an error when no path is found.
- `stop`: stop the walker and leave the object in place.
- `snap`: if the waypoint is near the edge of a solid hitbox, snap to that edge and path to it instead.
- `continue`: skip pathfinding and walk straight toward the waypoint.

For custom handling, use `onPathNotFound`:

```ts
walker.setPathfindingOptions({
  avoidObstacles: true,
  onPathNotFound: ({ goal }) => ({ behavior: "snap", goal }),
});
```

### Performance knobs

For large scenes, tune:

- `maxExpandedNodes`: cap the A* work per recalculation
- `maxSearchRadiusTiles`: cap search distance (in tiles) around the start

```ts
walker.setPathfindingOptions({
  avoidObstacles: true,
  maxExpandedNodes: 5000,
  maxSearchRadiusTiles: 64,
});
```

## Debug drawing

If `debug` is `true`, the walker draws:

- waypoints (red circles) and waypoint links (red lines)
- the current computed path nodes (cyan circles/lines)

Walker debug rendering is called from the owning object’s render path, but it intentionally cancels object rotation so the path is drawn in world space.

## Interaction with physics

Since `Walker` sets `gameObject.speed`, it composes naturally with Sliver physics:

- collisions can push the object off its ideal path; the walker will drop “already reached” nodes and continue
- if you also set speed elsewhere (your own `tickFn`), last write wins—prefer one source of movement at a time

For physics details (hitboxes, solid vs trigger, impulses), see [`Physics`](./physics.md).
