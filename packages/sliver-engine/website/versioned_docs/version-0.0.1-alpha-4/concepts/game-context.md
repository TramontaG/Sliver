---
title: Game Context
sidebar_position: 1
---

`GameContext` is the “glue” object that connects your game code to engine services. Instead of reaching for globals/singletons, scenes and game objects receive a context instance and can query what they need (canvas, scenes, audio, input, messaging).

## Getting the context

From your `Game` instance:

```ts
const ctx = game.getContext();
```

From a `Scene` or `GameObject` that has been added to a scene (they get the context injected by the engine):

```ts
const ctx = this.getContext();
if (!ctx) return; // not attached yet
```

Why it can be `null`: a `GameObject`/`Scene` only gets a context after it’s registered with the running game/scene manager.

## What GameContext contains

### Core references

- `getGame()`: access to the `Game` instance (tick rate, saves, etc.)
- `getCanvas()`: the engine `CanvasController` (rendering helpers, raw 2D context access)
- `getSceneManager()`: the `SceneManager` (scene stack + transitions)
- `getSoundManager()`: the [`SoundManager`](./audio.md) (SFX/music playback)
- `getKeyAccumulator()`: the raw `KeyAccumulator` (usually you’ll use the helper methods below)

## Scene control helpers

`GameContext` exposes a few convenience wrappers around the `SceneManager`:

```ts
ctx.setCurrentScene("MainMenu");
ctx.pushScene("PauseMenu");
ctx.popScene();

await ctx.transitionToScene("Level1", transition, "replace"); // or "push"
```

These are useful from game objects (UI buttons, triggers, etc.) without having to keep a reference to the scene manager.

## Input helpers

The context keeps an internal `KeyAccumulator`, and provides simple queries:

```ts
if (ctx.isKeyPressed("ArrowLeft")) {
  // move player
}

const pressed = ctx.getPressedKeys(); // string[]
```

Prefer these helpers over accessing the `KeyAccumulator` directly unless you need lower-level behavior.

## Messaging (decoupled communication)

`GameContext` includes a small publish/subscribe `MessageBus`. It’s meant for “broadcast” style events where objects shouldn’t know about each other directly.

### Sending a message

```ts
ctx.sendMessage("player:hit", { damage: 10 }, this);
```

- `channel` is a string (use a naming convention like `system:event` or `feature:event`)
- `payload` is any value (use TypeScript generics for strong typing)
- `sender` is optional; when you send from a `GameObject`, pass `this` so listeners can ignore their own events if needed

### Subscribing to a message

```ts
const unsubscribe = ctx.subscribeToMessage<{ damage: number }>(
  "player:hit",
  (payload, sender) => {
    console.log(payload.damage, sender);
  }
);
```
Later, unsubscribe if needed:

```ts
unsubscribe();
```

### Convenience from GameObject

`GameObject` exposes small wrappers around the context:

```ts
this.sendMessage("ui:clicked", { id: "start" });
this.onMessage("ui:clicked", (payload) => console.log(payload));
```

Under the hood this uses the same `GameContext` message bus, just with less boilerplate.

## Tick and frame counters

`GameContext` tracks:

- `getTickCount()` and `incrementTickCount()`: the engine increments tick count from `SceneManager.tick()`.
- `getFrameCount()` and `incrementFrameCount()`: available for render-loop tracking (not currently incremented automatically in the engine).

You can use these for lightweight instrumentation (e.g., “do X every 30 ticks”).
