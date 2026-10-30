---
title: Game objects
sidebar_position: 4
---
import sandpack1IndexTs from "../sandpack/concepts/game-objects/interactive-example-object-to-object-messages/index.ts?raw";
import sandpack1MessageObjectBaseTs from "../sandpack/concepts/game-objects/interactive-example-object-to-object-messages/MessageObjectBase.ts?raw";
import sandpack1ObjectATs from "../sandpack/concepts/game-objects/interactive-example-object-to-object-messages/ObjectA.ts?raw";
import sandpack1ObjectBTs from "../sandpack/concepts/game-objects/interactive-example-object-to-object-messages/ObjectB.ts?raw";
import sandpack1MainTs from "../sandpack/concepts/game-objects/interactive-example-object-to-object-messages/main.ts?raw";

`GameObject` is the base building block in Sliver. Most of your gameplay code lives in objects: players, enemies, UI widgets, triggers, effects, etc.

At runtime, a `GameObject` can:

- Update on every tick (`tick()`)
- Draw on every frame (`render(...)`)
- React to input via decorated `handleEvent(event)` (see [`Input & events`](./events.md))
- Participate in collisions via hitboxes (see [`Physics`](./physics))
- Communicate through the [`GameContext`](./game-context.md) message bus
- Own `children` (a parent/“mothership” relationship)

## Creating a GameObject

The base constructor is:

```ts
new GameObject(name, position, visible?, active?, hitboxes?, scene?, children?, showOriginDebug?)
```

Most of the time you either:

- subclass `GameObject`, or
- create one and assign runtime behavior with `setTickFunction` / `setRenderFunction`.

## Lifecycle hooks

`GameObject` exposes two lifecycle methods you can override:

- `onAddedToScene(scene, context)` runs once when the object is added to a scene _and_ the scene has a `GameContext`.
- `onRemovedFromScene(scene)` runs when the object is removed from the scene (including `destroy()`), after `onAddedToScene` has run.

This is the best place to subscribe to messages without a per-tick guard:

```ts
import { GameObject, Vector } from "sliver-engine";
import type { GameContext, Scene } from "sliver-engine";

class ScoreHud extends GameObject {
  private score = 0;

  constructor() {
    super("hud", new Vector(0, 0));
  }

  override onAddedToScene(_scene: Scene, _context: GameContext): void {
    this.onMessage<{ amount: number }>("score:add", ({ amount }) => {
      this.score += amount;
    });
  }
}
```

Note: if you add an object before the scene is bound to a `GameContext`, `onAddedToScene` runs later when the context becomes available.

## Tick vs render

Sliver’s loops are split (see [`Game loop`](./game-loop.md)):

- `tick()` runs at the game tick rate (default 60 TPS) and is where you update state.
- `render(canvas, scene)` runs every animation frame and is where you draw based on current state.

### `tickFn` and `renderFn` (runtime-swappable behavior)

Each `GameObject` has a `tickFn` and `renderFn` that are called from `tick()` / `render()`. You can replace them at runtime:

```ts
gameObject.setTickFunction((obj) => {
  // logic for the current “state”
});

gameObject.setRenderFunction((obj, canvas) => {
  // draw for the current “state”
});
```

This is a simple way to implement state machines without subclassing:

```ts
import { GameObject, Vector } from "sliver-engine";

const npc = new GameObject("npc", new Vector(200, 200));

const idle = () =>
  npc.setTickFunction(() => {
    npc.speed = Vector.zero();
  });

const flee = () =>
  npc.setTickFunction(() => {
    npc.speed = new Vector(-120, 0);
  });

idle();

// later, switch behavior instantly
npc.onMessage("npc:flee", () => flee());
```

Why it works well in Sliver:

- `tickFn`/`renderFn` are called _after_ key-tick decorators and _before_ physics integration, so they’re a natural place to update speed/rotation/state.
- Swapping functions is cheap and keeps call sites explicit (“set the object into flee mode now”).

## Visibility and activity

- `visible`: if `false`, the object won’t render (children won’t render either).
- `active`: if `false`, the object won’t tick (children won’t tick either).
- `zIndex`: render order within a scene; higher values draw later (on top).

`destroy()` is the common way to remove an object:

- marks it inactive and invisible
- detaches it from its parent (if any)
- destroys children
- removes it from the scene’s object list

## Position, scene space, and camera offset

There are two important coordinate spaces:

- **scene/world space** (your “real” coordinates)
- **canvas space** (scene space plus the scene’s camera offset)

Use:

- `getScenePosition()` for world logic (pathing, physics reasoning, storing positions)
- `getPosition()` for rendering and pointer hit-testing (it includes the scene offset)

`getPosition()` adds the scene’s `offset` automatically, so when you pan the camera (or run a slide transition), objects render and interact correctly.

## Children and the “mothership” relationship

A `GameObject` can own children:

```ts
parent.addChild(child);
```

What this does:

- sets the child’s “mothership” (`child.getMotherShip()`)
- propagates `scene` and `GameContext` into the child
- ensures child ticks and renders with the parent

### Relative positioning

Children are not automatically positioned relative to their parent. If you want a child’s position to be relative to the parent:

```ts
child.setPositionRelativeToMotherShip(true);
```

When enabled, the child’s world position becomes:

`motherShip.absolutePosition + child.localPosition`

This is useful for things like a health bar attached to a character, or a weapon attached to a player.

## Input and event handling (decorators)

`handleEvent(event)` is where objects react to input, and the default pattern is to use decorators on `handleEvent`.

The base `GameObject.handleEvent` already includes `@onHover` / `@onStopHovering` to maintain `gameObject.hovering`, so your override should usually call `super.handleEvent(event)`.

See [`Input & events`](./events.md) for:

- click/hover/wheel decorators
- key decorators (`@onKeyPressed` for one-shot, `@onKeyHold` for continuous; combos too)
- composition (stacking multiple decorators)

If you want to compose arbitrary methods (not just `handleEvent`), see [`Mixins`](./mixins.md).

## Messaging between GameObjects

Objects communicate through the `GameContext` message bus (publish/subscribe). `GameObject` exposes small wrappers:

### Send

```ts
this.sendMessage("ui:clicked", { id: "start" });
```

That publishes on the global message bus and sets `sender` to the current object.

### Listen

```ts
const unsubscribe = this.onMessage<{ id: string }>(
  "ui:clicked",
  (payload, sender) => {
    if (payload.id === "start") {
      // react
    }
  }
);
```

To remove the handler later:

```ts
unsubscribe();
```

If you only need the first event, use `onceOnMessage`:

```ts
this.onceOnMessage("ui:clicked", () => {
  // fire once
});
```

Use messages when you want loose coupling (UI talks to gameplay without direct references, enemies broadcast “died”, etc.).

### Interactive example: object-to-object messages

This sandbox has one scene with two objects:

- clicking `Object A` sends a message that makes `Object B` change color
- clicking `Object B` sends a message that makes `Object A` change color
- both objects extend a shared `MessageObjectBase`
- each object has its own file and its own decorators

`Object A` uses `@onClick`, while `Object B` stacks `@onHover`, `@onStopHovering`, and `@onClick`.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/MessageObjectBase.ts": sandpack1MessageObjectBaseTs,
		"/ObjectA.ts": sandpack1ObjectATs,
		"/ObjectB.ts": sandpack1ObjectBTs,
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/ObjectA.ts", "/ObjectB.ts", "/MessageObjectBase.ts"]}
	activeFile="/ObjectA.ts"
	layout="editor-first"
	previewHeight={380}
	editorHeight={320}
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

## Collisions, hitboxes, and physics hooks

To make an object participate in collisions, give it one or more hitboxes and set physics flags (`immovable`, `mass`, `restitution`, etc.).

Collision flow is:

- `beforeColision(other)` (return `false` to ignore)
- `onColision(other, penetration)` (react to overlap)

Note: the public API uses the single-`l` spellings `beforeColision` and `onColision`. If you write `beforeCollision` / `onCollision`, those hooks will not run.

See [`Physics`](./physics) for hitbox creation, triggers (`solid: false`), and how velocity-based collision response is applied.

## Scene control from a GameObject

Since a `GameObject` has access to the [`GameContext`](./game-context.md), you can switch scenes from inside an object:

```ts
const ctx = this.getContext();
if (!ctx) return;

ctx.setCurrentScene("main");
ctx.pushScene("pause");
await ctx.transitionToScene("level2", transition, "replace");
```

## Walker (pathing/movement helper)

Sliver includes a `Walker` helper you can attach to an object via `setWalker(...)`. It can move an object along waypoints and optionally avoid obstacles.

See [`Walker`](./walker) for usage and configuration.
