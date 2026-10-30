---
title: Game loop
sidebar_position: 2
---

Sliver separates **simulation** (“ticks”) from **rendering** (“frames”):

- **Tick loop** (fixed-ish rate): runs your game logic and advances scenes / game objects.
- **Render loop** (display rate): redraws the canvas as fast as the browser allows (`requestAnimationFrame`).

The `Game` class is the orchestrator for both loops, plus input/event dispatching, save loading, and the shared [`GameContext`](./game-context.md).

## Creating a Game

Minimal setup (from Getting Started):

```ts
import {
  CanvasController,
  Game,
  Scene,
  SceneManager,
  SoundManager,
} from "sliver-engine";

const canvas = new CanvasController(800, 600);
const mainScene = new Scene("main", "#0b0a18");
const scenes = new SceneManager({ main: mainScene }, mainScene);

const game = new Game({
  canvas,
  scenes,
  soundManager: new SoundManager(),
  ticksPerSecond: 60,
});

game.start();
```

### `GameOptions`

When you construct a `Game`, you provide:

- `canvas`: the `CanvasController` the engine renders into
- `scenes`: the `SceneManager` (scene stack, transitions, ticking)
- `soundManager`: the `SoundManager` instance (see [`Audio`](./audio.md))
- `ticksPerSecond?`: target tick rate (defaults to `60`)
- `saveNamespace?`: optional `localStorage` namespace for saves (see [`Saves`](./saves.md))

## Lifecycle and timing

### `start()`

Calling `game.start()` does three things:

1. Calls `setup()` once
2. Starts the **tick interval**
3. Starts the **render loop**

### `setup()` (runs once)

`setup()` is idempotent (calling it multiple times is safe). It:

- loads saves (`this.saves.loadAll()`)
- calls `onSetup()` (a hook for your game code)

Use `onSetup()` to initialize game state that depends on saves being loaded.

### Tick loop (game logic)

Ticks run on a `setInterval`, and the engine checks elapsed time using `performance.now()` to decide whether to process the next tick.

On each tick:

1. `game.onTick()` runs (your hook)
2. `sceneManager.tick()` runs (engine)
   - increments `GameContext`’s tick counter
   - updates any active transitions
   - calls `tick()` on all active scenes, which calls `tick()` on their game objects

Important behavior to understand:

- This is not a “catch up” fixed-step loop; if the browser stalls for a while, the engine won’t automatically run multiple ticks to compensate. In other words, ticks are **not** guaranteed to run at a fixed rate, they can lag.
- `onTick()` runs **before** scenes tick, so it’s a good place for global orchestration (spawning, high-level state changes, etc.).

#### Time-based movement

Because ticks target a fixed rate, many games model “time” as:

```ts
const dt = 1 / game.getTickRate(); // seconds per tick
```

Example: move at 120 pixels/second:

```ts
const speed = 120; // px/s
const dt = 1 / this.getContext()!.getTickRate();
this.position.add(new Vector(speed * dt, 0));
```

If you want purely tick-based movement (no seconds), just treat “1 tick” as your unit and tune speeds accordingly.

### Render loop (drawing)

Rendering uses `requestAnimationFrame`. Every frame:

1. the canvas is cleared (`canvas.clearCanvas()`)
2. `game.render()` draws all active scenes in order

That means your game should be rendered from state every frame (don’t rely on pixels “staying there”).

#### Frames are not counted automatically (yet)

`GameContext` has `getFrameCount()` / `incrementFrameCount()`, but the engine doesn’t currently increment frame count inside the render loop. If you need a frame counter for profiling/animation, you can increment it in a custom render loop (for example by subclassing `Game` and overriding `start()`).

## Extending `Game` (hooks)

`Game` is designed to be subclassed so you can override its hooks:

- `protected onSetup(): void` — called once during setup (after saves load)
- `protected onTick(): void` — called once per tick, before scenes tick

Example:

```ts
import { Game } from "sliver-engine";

class MyGame extends Game {
  protected onSetup(): void {
    // register initial scene, load assets, etc.
    this.getContext().setCurrentScene("main");
  }

  protected onTick(): void {
    const ctx = this.getContext();

    // global input-driven actions
    if (ctx.isKeyPressed("Escape")) {
      ctx.pushScene("pause");
    }
  }
}
```

## Input and events

When a `Game` is constructed, it creates a `GameEventsdispatcher` that:

- listens to keyboard events on `window` (`keydown`/`keyup`)
- listens to mouse events on the game canvas (`mousemove`/`mousedown`/`mouseup`/`wheel`)
- updates the internal `KeyAccumulator` on key presses/releases
- forwards events into the game via `game.handleEvent(event)`

Mouse positions (`x`, `y`) are computed from the canvas element’s bounding rect (client coordinates mapped into the canvas’ top-left origin). If you scale the canvas with CSS (avoid doing that), you may want to account for that in your own code when comparing to world coordinates.

### Event delivery order

`game.handleEvent(event)` dispatches events to:

1. active scenes in **reverse order** (top-most/last active scene handles first)
2. within a scene, game objects are also processed in **reverse order**

This happens to ensure that the scenes and objects on top receive the event first. It's the natural way of thinking. You wouldn't want an object on the background to receive the click with higher priority than the object on top of it.

Both scene and object handlers can stop propagation by setting `event.stopPropagation = true`.

This order is what makes UI overlays / pause menus work naturally: the most recently pushed scene gets first chance to consume the input.

See [`Input & events`](./events.md) for decorators like `@onClick` and propagation patterns.

## Scene stack: overlay vs replace (and “pause”)

The scene manager keeps a list of **active scenes**, and the game:

- **ticks all active scenes** every tick
- **renders all active scenes** every frame (in order)
- **delivers input to active scenes** in reverse order (top-most first)

This is great for overlays (HUDs, pause menus, dialog boxes): push a scene on top and let it capture input.

If you want to truly “pause” the gameplay simulation underneath, you have two common options:

- Use `transitionToScene(..., "replace")` / `setCurrentScene(...)` to replace gameplay with a pause scene.
- Keep the gameplay scene active, but gate its update logic behind a flag (so it doesn’t advance while the pause menu is open).

## Saves integration

The game owns a `GameSaves` instance (`game.saves`) and loads it during `setup()`.

Common patterns:

```ts
game.onLoadSaveFile((save) => {
  console.log("Loaded save:", save);
});

const id = game.saveGame({ level: 3, hp: 10 }, { label: "Checkpoint" });
```

See [`Saves`](./saves.md) for the full API.

## The shared GameContext

The `Game` constructs a single [`GameContext`](./game-context.md) and binds it into the scene manager. That context is how scenes and game objects access:

- the canvas (`getCanvas()`) and rendering helpers
- the scene manager (`getSceneManager()`) and scene control helpers
- input state (`isKeyPressed`, `getPressedKeys`)
- audio (`getSoundManager()`)
- message bus (`sendMessage`, `subscribeToMessage`)

If you’re trying to do “global” work from inside a `GameObject` (switch scenes, play a sound, broadcast an event), start by grabbing `this.getContext()` and using the context helpers.

## Audio note (first user interaction)

Most browsers require a user gesture before audio can play. If your game uses sound, unlock audio on the first click/tap/key press as described in [`Audio`](./audio.md).
