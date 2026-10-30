---
title: Scenes
sidebar_position: 3
---

Scenes represent a “screen” (or state) in your game: main gameplay, main menu, pause overlay, cutscene, etc.

In Sliver, a `Scene` is responsible for:

- Holding and updating a list of `GameObject`s
- Rendering its background + objects + optional overlay
- Dispatching input/events to its objects (with propagation control)
- Running simple physics helpers: gravity + collision resolution
- Supporting camera-like movement via a scene `offset` (used by transitions too)

Scenes receive a shared [`GameContext`](./game-context.md) from the engine (via `SceneManager`), so game objects can access input, audio, scene switching, and the message bus.

## Creating scenes and registering them

Create scenes with:

```ts
import { Scene, SceneManager } from "sliver-engine";

const main = new Scene("main", "#0b0a18"); // name + optional background color
const pause = new Scene("pause");

const scenes = new SceneManager(
  { main, pause }, // registry (keys are the ids you switch by)
  main            // initial current scene (optional)
);
```

Notes:
- The **registry key** (`"main"`, `"pause"`) is what you’ll use with `setCurrentScene(...)` / `transitionToScene(...)`.
- The `Scene` constructor’s `name` is currently used mainly for logging (`setup()` prints it). It’s easiest if you keep it the same as the registry key.

## Scene lifecycle and context injection

When a scene becomes active, `SceneManager` will:

1) call `scene.setContext(gameContext)`
2) call `scene.setup()` once (the first time the scene is activated)
3) call `scene.onEnter()` every time the scene becomes active

This happens when you:
- set a scene as current
- push a scene on the stack
- transition to a scene

When a scene leaves the active stack, `scene.onExit()` is called.

If a scene becomes active before the game binds a context (for example, when you pass an initial scene to `SceneManager`), `setup()` and `onEnter()` are deferred until the context is available.

If you subclass `Scene`, use the hooks like this:

```ts
import { Scene } from "sliver-engine";

class MainScene extends Scene {
  override setup(): void {
    super.setup();
    // addGameObject(...), setGravity(...), etc.
  }

  override onEnter(): void {
    // reset timers, start music, subscribe to messages, etc.
  }

  override onExit(): void {
    // cleanup subscriptions, pause music, etc.
  }
}
```

## Adding and removing game objects

Add one or many objects:

```ts
scene.addGameObject(player);
scene.addGameObject([hud, enemy1, enemy2]);
```

What `addGameObject` does for you:
- sets `go.scene = scene`
- injects the scene’s `GameContext` into the object (and its children) so `this.getContext()` starts working
- triggers `go.onAddedToScene(scene, context)` once the context is available

Remove objects either by:
- calling `gameObject.destroy()` (recommended; also detaches children and removes from the scene), or
- `scene.removeGameObject(gameObject)` if you need manual removal

On removal, `go.onRemovedFromScene(scene)` runs after `onAddedToScene`.

## Tick: updates, gravity, collisions

Each tick, `Scene.tick()`:

1) calls `tick()` on every `GameObject` in the scene
2) runs collision detection + resolution across objects that have hitboxes

For a deeper dive (hitboxes, restitution/friction/mass, triggers, and collision hooks), see [`Physics`](./physics.md).

### Gravity

A scene has a gravity vector:

```ts
import { Vector } from "sliver-engine";

scene.setGravity(new Vector(0, 0.4));
```

Gravity is applied by `GameObject.tick()` when:
- `phisics.affectedByGravity === true`
- `phisics.immovable === false`
- the object isn’t being dragged (`beingGrabbed === false`)

Gravity is added directly to `speed` once per tick, so treat it as “acceleration per tick” rather than per-second.

### Collisions

After objects tick, the scene resolves collisions between hitboxes:

- Only **active** objects with at least one hitbox participate.
- Objects with `phisics.immovable === true` won’t be moved by resolution.
- `beforeColision(other)` runs on both objects the first time a pair is checked; if either returns `false`, that pair is ignored for the rest of the tick.
- `onColision(other, penetration)` is called once per pair per tick when overlap is detected.

If you want an object to be physical, you typically:
- give it one or more hitboxes
- set `immovable: false`
- optionally tweak `restitution`, `friction`, `mass`, and gravity behavior

See [`Physics`](./physics.md) for collision/response details, and [`Game objects`](./game-objects.md) for the hitbox and gameplay patterns.

## Render: background, objects, overlay

Each frame, the game renders every active scene (see [`Game loop`](./game-loop.md)).

`Scene.render(...)` draws, in order:

1) background fill (if the scene has a background color)
2) all game objects (`obj.render(canvas, scene)`)
3) an optional full-screen overlay color (used by some transitions)

Scenes also have an `opacity` that multiplies the canvas alpha during render, which is how fade transitions work.

## Events and propagation

When a scene receives an input event, `Scene.handleEvent(event)` forwards it to game objects in **reverse order** (last added gets first chance to handle it).

If any handler sets `event.stopPropagation = true`, the scene stops delivering the event to remaining objects.

This works together with the game-level dispatch order (top-most active scene first) to make overlays/menus easy to implement.

## Camera offset (scene `offset`)

Scenes have an `offset` vector that acts like a simple “camera” shift:

```ts
import { Vector } from "sliver-engine";

scene.setOffset(new Vector(-100, 0)); // pan camera right by 100px
```

Why this works:
- `GameObject.getPosition()` includes the scene offset, so most objects automatically render with the camera shift.
- Some input helpers/decorators convert mouse coordinates to “scene space” by subtracting the offset, so hit tests line up while the camera moves.

This same offset is also used by slide transitions.

## Scene stack and scene switching

`SceneManager` maintains:

- a `currentScene`
- a list of `activeScenes` (a stack)

`currentScene` is the “main” current scene. Pushing an overlay scene does not necessarily replace the current scene; it just adds a scene on top of the active stack.

Active scenes:
- are all **ticked** each tick
- are all **rendered** each frame (in order)
- receive input with the top-most scene first (reverse order), so overlays can consume events

You’ll usually switch scenes through the [`GameContext`](./game-context.md) helpers:

```ts
const ctx = game.getContext();

ctx.setCurrentScene("main"); // replace active stack with [main]
ctx.pushScene("pause");      // overlay pause on top
ctx.popScene();              // remove top-most active scene
```

## Transitions (fade / slide / flash)

Transitions are handled by `SceneManager.transitionToScene(...)` (also exposed on `GameContext`).

Built-in transitions are exported from `sliver-engine`:

```ts
import {
  fadeTransition,
  slideReplace,
  slidePush,
  slidePop,
  colorFlash,
} from "sliver-engine";

await game.getContext().transitionToScene("main", fadeTransition(450), "replace");
await game.getContext().transitionToScene("pause", slidePush("down"), "push");
await game.getContext().transitionToScene("main", slidePop("up"), "replace");
await game.getContext().transitionToScene("main", colorFlash("white", 750), "replace");
```

Transition details worth knowing:
- Only one transition can run at a time; starting a new one while another is active rejects with an error.
- A transition can control `opacity`, `offset`, and `overlay` on the involved scenes.
- `incomingOnTop` controls whether the incoming scene renders above or below the outgoing scene during the animation (used by pop-like transitions).

### Custom transitions

If you want something custom, build one with `createSceneTransition`:

```ts
import { createSceneTransition } from "sliver-engine";

const zoomFade = createSceneTransition(
  (t, { from, to }) => {
    from?.setOpacity(1 - t);
    to.setOpacity(t);
    // you can also animate offsets/overlays here
  },
  { duration: 600 }
);
```
