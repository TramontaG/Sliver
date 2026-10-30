---
title: Input & events
sidebar_position: 7
---

Sliver’s default way to handle input is through **decorators** applied to a `GameObject`’s `handleEvent(event)` method.

This gives you:

- Hitbox-aware mouse events (`@onClick`, `@onHover`, …)
- Key handling (`@onKeyPressed` for one-shot, `@onKeyHold` for continuous; combos too)
- Event propagation control (`event.stopPropagation`)
- Composition: stack multiple decorators on the same method

## Enable decorators in TypeScript

Decorators are a TypeScript feature. Enable them in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## The event model (what actually happens)

### Event sources

The engine produces these event types:

- `keyPressed` / `keyReleased` (from `window`)
- `mouseMoved`, `mouseButtonPressed`, `mouseButtonReleased`, `mouseWheelScrolled` (from the game canvas element)

Mouse events include `x`/`y` in **canvas coordinates** (top-left is `0,0`).

### Dispatch order (who gets the event first)

When an event occurs:

1) `Game` dispatches it to **active scenes in reverse order** (top-most scene first).
2) Each `Scene` dispatches it to **game objects in reverse order** (last added object first).

### Stopping propagation

Any handler can set:

```ts
event.stopPropagation = true;
```

Once that happens, remaining objects won’t receive the event, and underlying scenes will effectively stop receiving it too (they’ll early-out because `stopPropagation` is already true).

This is what makes overlays work: your pause menu scene (on top) can consume input so the gameplay scene underneath doesn’t react.

## The recommended pattern: decorate `handleEvent`

Most of the time, you don’t manually switch on `event.type`. You decorate `handleEvent` and keep it tiny:

```ts
import { GameObject } from "sliver-engine";
import type { GameEvent } from "sliver-engine";
import { onClick, onHover, onStopHovering } from "sliver-engine";

class StartButton extends GameObject {
  @onClick<StartButton>(() => {
    this.getContext()?.setCurrentScene("main");
  })
  @onHover<StartButton>(() => {
    this.setOpacity(0.8);
  })
  @onStopHovering<StartButton>(() => {
    this.setOpacity(1);
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}
```

Why call `super.handleEvent(event)`:
- The base `GameObject.handleEvent` includes built-in hover state management.
- If you skip the `super` call, you opt out of that base behavior.

## Mouse decorators

Mouse decorators are usually **hitbox-based**, meaning they check if the mouse point is inside any of the object’s hitboxes.

Prerequisite: your object needs at least one hitbox for hitbox-based decorators to ever fire.

### `@onClick(handler)`

Runs on `mouseButtonPressed` if the pointer is inside the object’s hitboxes.

### `@onMouseRelease(handler)`

Runs on `mouseButtonReleased` if the pointer is inside the object’s hitboxes.

### `@onHover(handler)` / `@onStopHovering(handler)`

Runs on hover enter / hover exit (based on `mouseMoved`).

The engine keeps a `gameObject.hovering` boolean for you; these decorators flip it and run only on transitions (enter/exit), not every move.

### `@onMouseMoved(handler)`

Runs on every `mouseMoved` while the pointer is inside the hitboxes (continuous hover).

### `@onMouseWheel(handler)`

Runs on every `mouseWheelScrolled` anywhere on the canvas (not hitbox-based).

### `@onMouseWheelOverHitbox(handler)`

Runs on `mouseWheelScrolled` only if the pointer is inside the hitboxes.

## Keyboard decorators

Keyboard events update an internal `KeyAccumulator`. The key decorators use the **current key state** from the [`GameContext`](./game-context.md), which makes “hold to move” logic easy.

### `@onKeyPressed(key, handler)` (one-shot)

Runs the handler **once** when `key` becomes pressed.

```ts
import { onKeyPressed } from "sliver-engine";
import { Vector } from "sliver-engine";

@onKeyPressed("ArrowLeft", (obj) => {
  obj.sendMessage("ui:back", null);
})
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

### `@onKeyHold(key, handler)` (continuous)

Runs the handler every tick while `key` is held (good for movement).

```ts
import { onKeyHold } from "sliver-engine";
import { Vector } from "sliver-engine";

@onKeyHold("ArrowLeft", (obj) => {
  obj.speed = new Vector(-2, 0);
})
@onKeyHold("ArrowRight", (obj) => {
  obj.speed = new Vector(2, 0);
})
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

### `@onKeyComboPressed(keys, handler)` (one-shot)

Runs the handler **once** when **all** keys in `keys` become pressed.

```ts
import { onKeyComboPressed } from "sliver-engine";

@onKeyComboPressed(["Shift", "ArrowRight"], (obj) => {
  obj.sendMessage("player:dash", { dir: "right" });
})
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

Notes:
- Keys are compared against `KeyboardEvent.key` (e.g. `"ArrowLeft"`, `"a"`, `"Shift"`).
- These are tick handlers; they don’t require you to react to raw `keyPressed` events.

### `@onKeyComboHold(keys, handler)` (continuous)

Runs the handler every tick while **all** keys in `keys` are held.

```ts
import { onKeyComboHold } from "sliver-engine";

@onKeyComboHold(["Shift", "ArrowRight"], (obj) => {
  obj.speed.x = 5; // hold-to-dash
})
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

## Composition: stacking multiple decorators

You can stack decorators freely. This is the normal way to “compose” behavior in Sliver.

Important detail: when you stack multiple decorators, the **top-most decorator runs first** at runtime (because TypeScript applies method decorators bottom-up).

Example (order matters):

```ts
@onClick((obj, event) => {
  event.stopPropagation = true;
  obj.sendMessage("ui:clicked", obj.name);
})
@onMouseRelease((obj) => {
  // Note: stopPropagation affects dispatch to other objects/scenes,
  // not other decorators on the same object.
})
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

## Dragging: `@grabbable()`

`@grabbable()` makes an object draggable with the mouse:

- On press inside hitboxes: sets `beingGrabbed = true`, zeroes velocity, and stops propagation
- On move while grabbed: moves the object to follow the mouse (in scene/world space) and stops propagation
- On release: ends the grab and optionally “throws” the object based on recent movement (sets `speed`)

```ts
import { grabbable } from "sliver-engine";

@grabbable()
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

Because grabbing sets `beingGrabbed`, it interacts with physics: gravity is not applied while the object is being dragged. See [`Physics`](./physics.md).

## Forwarding events to children: `@onChildrenEvents()`

If your object is a container (has `children`) and you want children to also receive events, use:

```ts
import { onChildrenEvents } from "sliver-engine";

@onChildrenEvents()
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

This decorator calls your method first, then forwards the same `event` instance to every child’s `handleEvent`.

Tip: since the same `event` object is forwarded, a child can see `event.stopPropagation === true` if a parent already consumed it.

## Collision-related decorator: `@solidTo(predicate)`

`@solidTo` is a convenience decorator for collision filtering on `beforeColision(other)`.

It lives in the same decorators module, but it’s part of the physics/collision story. See [`Physics`](./physics.md) for recommended usage patterns.
