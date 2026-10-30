---
title: Input & events
sidebar_position: 7
---
import sandpack1IndexTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/index.ts?raw";
import sandpack1MouseDecoratorsObjectBaseTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/MouseDecoratorsObject.base.ts?raw";
import sandpack1MouseDecoratorsObjectTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/MouseDecoratorsObject.ts?raw";
import sandpack1MouseDecoratorsHudTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/MouseDecoratorsHud.ts?raw";
import sandpack1CreateBoundsTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/createBounds.ts?raw";
import sandpack1MainTs from "../sandpack/concepts/events/live-example-all-mouse-decorators-stacked/main.ts?raw";
import sandpack2IndexTs from "../sandpack/concepts/events/live-example-all-key-decorators-stacked/index.ts?raw";
import sandpack2KeyboardDecoratorsObjectBaseTs from "../sandpack/concepts/events/live-example-all-key-decorators-stacked/KeyboardDecoratorsObject.base.ts?raw";
import sandpack2KeyboardDecoratorsObjectTs from "../sandpack/concepts/events/live-example-all-key-decorators-stacked/KeyboardDecoratorsObject.ts?raw";
import sandpack2CreateBoundsTs from "../sandpack/concepts/events/live-example-all-key-decorators-stacked/createBounds.ts?raw";
import sandpack2MainTs from "../sandpack/concepts/events/live-example-all-key-decorators-stacked/main.ts?raw";

Sliver’s default way to handle input is through **decorators** applied to a `GameObject`’s `handleEvent(event)` method.

This gives you:

- Hitbox-aware mouse events (`@onClick`, `@onHover`, …)
- Screen-wide mouse events (`@onClickAnywhere`, `@onMouseWheel`)
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

1. `Game` dispatches it to **active scenes in reverse order** (top-most scene first).
2. Each `Scene` dispatches it to **game objects in reverse order** (last added object first).

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
  @onClick<StartButton>((obj) => {
    obj.getContext()?.setCurrentScene("main");
  })
  @onHover<StartButton>((obj) => {
    obj.setOpacity(0.8);
  })
  @onStopHovering<StartButton>((obj) => {
    obj.setOpacity(1);
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

### `@onClickAnywhere(handler)`

Runs on `mouseButtonPressed` anywhere on the canvas (not hitbox-based).

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

### Live example: all mouse decorators stacked

This sandbox uses all mouse decorators on one object:

- `@onClick`
- `@onClickAnywhere`
- `@onMouseRelease`
- `@onHover`
- `@onStopHovering`
- `@onMouseMoved`
- `@onMouseWheel`
- `@onMouseWheelOverHitbox`

Only `MouseDecoratorsObject.ts` is editable. The base class (`MouseDecoratorsObject.base.ts`) contains the box behavior/state, and `MouseDecoratorsHud.ts` renders the text/counters.

<SandpackExample
files={{
"/index.ts": {
code: sandpack1IndexTs,
readOnly: true,
},
"/MouseDecoratorsObject.base.ts": {
code: sandpack1MouseDecoratorsObjectBaseTs,
			readOnly: true,
		},
		"/MouseDecoratorsObject.ts": sandpack1MouseDecoratorsObjectTs,
		"/MouseDecoratorsHud.ts": {
			code: sandpack1MouseDecoratorsHudTs,
			readOnly: true,
		},
		"/createBounds.ts": {
			code: sandpack1CreateBoundsTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
readOnly: true,
},
}}
visibleFiles={["/MouseDecoratorsObject.ts"]}
activeFile="/MouseDecoratorsObject.ts"
editorHeight={320}
showRunButton
hiddenFiles={[
"/index.html",
"/styles.css",
"/package.json",
"/index.ts",
	"/main.ts",
	"/createBounds.ts",
	"/MouseDecoratorsObject.base.ts",
	"/MouseDecoratorsHud.ts",
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

override tick(): void {
  this.speed = Vector.zero();
  super.tick();
}

@onKeyHold("ArrowLeft", (obj) => {
  obj.speed = new Vector(-120, 0);
})
@onKeyHold("ArrowRight", (obj) => {
  obj.speed = new Vector(120, 0);
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

### Live example: all key decorators stacked

This sandbox uses all key decorators on one object:

- `@onKeyPressed`
- `@onKeyHold`
- `@onKeyComboPressed`
- `@onKeyComboHold`

Try these key inputs:

- Hold `W/A/S/D` to move the box
- Hold `Shift + A` or `Shift + D` to rotate the box
- Tap `Shift + Space` to restore its rotation
- Tap `Space` to make it have a random opacity

Only `KeyboardDecoratorsObject.ts` is editable. The base class (`KeyboardDecoratorsObject.base.ts`) contains the box state and rendering boilerplate.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack2IndexTs,
			readOnly: true,
		},
		"/KeyboardDecoratorsObject.base.ts": {
			code: sandpack2KeyboardDecoratorsObjectBaseTs,
			readOnly: true,
		},
"/KeyboardDecoratorsObject.ts": sandpack2KeyboardDecoratorsObjectTs,
		"/createBounds.ts": {
			code: sandpack2CreateBoundsTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack2MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/KeyboardDecoratorsObject.ts"]}
	activeFile="/KeyboardDecoratorsObject.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/createBounds.ts",
		"/KeyboardDecoratorsObject.base.ts",
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

Because grabbing sets `beingGrabbed`, it interacts with physics: gravity is not applied while the object is being dragged. See [`Physics`](./physics).

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

It lives in the same decorators module, but it’s part of the physics/collision story. See [`Physics`](./physics) for recommended usage patterns.
