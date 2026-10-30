---
title: Scripted events
sidebar_position: 11
---

Scripted events are Sliver’s way to build **composable async sequences** (dialog, cutscenes, tutorials, scripted interactions) that run against a `GameContext` and a state object.

At the core is a `ScriptEvent<TState>`:

- `run(ctx, state): Promise<TState>` executes the event and returns the next state
- `abort(reason)` requests cancellation (events/combinators typically propagate the aborted state)

## BaseTState (done/aborted/error)

Sliver’s scripted events use a shared state shape called `BaseTState`:

```ts
type BaseTState =
  | { done: false; aborted: undefined; error: undefined }
  | { done: true; aborted: string; error: undefined }
  | { done: true; aborted: undefined; error: Error }
  | { done: true; aborted: undefined; error: undefined };
```

In practice you define your own state shape (the engine will merge `BaseTState` into it at runtime):

```ts
type CutsceneState = {
  coinsAwarded: boolean;
};
```

## Creating events with `scripted(...)`

Use `scripted` to wrap an async function into a `ScriptEvent`:

```ts
import { scripted } from "sliver-engine";

type MyState = { counter: number };

export const increment = scripted<MyState>(async (_ctx, state) => {
  return { ...state, counter: state.counter + 1 };
}, "increment");
```

## Running an event

```ts
const finalState = await increment.run(ctx, { counter: 0 });
if (finalState.error) console.error(finalState.error);
```

## Combinators (compose bigger sequences)

Import combinators from the main package:

```ts
import {
  sequenceOf,
  parallel,
  first,
  conditional,
  all,
  repeat,
  repeatWhile,
  withTimeout,
  waitTicks,
  waitUntil,
  waitForKeyPress,
} from "sliver-engine";
```

Common patterns:

- `sequenceOf([a, b, c])`: run events in order
- `parallel([a, b])`: run events concurrently (merges resulting state)
- `conditional(predicate, thenEv, elseEv)`: branch based on state
- `waitTicks(n)`: delay by a number of game ticks
- `waitUntil(predicate)`: poll a condition on the game tick loop
- `waitForKeyPress(" ")`: wait until a key is held (uses `GameContext.getPressedKeys()`)

## Dialog: `TextBoxSequence` and `DisplayTextBox`

Sliver includes a textbox `GameObject` and helpers to run dialog as scripted events:

- `DisplayTextBox(entry)` shows a single `TextBox` and resolves when the user advances it.
- `TextBoxSequence(entries)` runs multiple entries in order.

`TextBoxSequence` takes an array of `TextEntry` objects:

```ts
import { TextBoxSequence, type TextEntry } from "sliver-engine";

const entries: TextEntry[] = [
  {
    position: "bottom",
    textSize: 18,
    boxColor: "rgba(0,0,0,0.75)",
    textColor: "white",
    lettersPerTick: 2,
    text: "Hello there.",
  },
  {
    position: "top",
    textSize: 18,
    boxColor: "rgba(0,0,0,0.75)",
    textColor: "white",
    skipTyping: true,
    text: "This one appears at the top and renders instantly.",
  },
];

await TextBoxSequence(entries).run(ctx, {
  // BaseTState fields are optional at the call site.
});
```

### Portrait sprites (animated sprite sheet)

`TextEntry.sprite` can display an animated portrait in a fixed **200×200 square** area on the left or right side of the textbox, centered vertically.

Prerequisite: load the sprite sheet before you show the textbox (see [`Rendering`](./rendering.md)):

```ts
const canvas = ctx.getCanvas();
await canvas
  .getSpriteLibrary()
  .loadSpriteSheet("Hero", new URL("./Hero.png", import.meta.url), 32, 32);
```

Then reference it from entries:

```ts
const heroTalking = {
  spritesheetName: "Hero",
  indexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  position: "left" as const,
  ticksPerFrame: 6,
  scale: 6,
  mirroring: "horizontal" as const,
};
```

## Tips

- Keep state updates immutable (`return { ...state, ... }`) so event composition stays predictable.
- Prefer `waitUntil`/`waitTicks` for pacing instead of `setTimeout` in gameplay code.
- If you need to “gate” the rest of a sequence on user input, `waitForKeyPress(...)` is usually the simplest option.
