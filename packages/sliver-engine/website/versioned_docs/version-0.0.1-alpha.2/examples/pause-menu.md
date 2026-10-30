---
title: Pause menu
sidebar_position: 3
---

This example shows a pause menu that **really pauses gameplay**.

Important detail: in Sliver, **all active scenes tick**. If you only `pushScene("pause")`, the gameplay scene underneath will keep ticking.

To pause simulation, use `"replace"` (or `setCurrentScene`) so the gameplay scene is no longer active.

## Pause scene with a resume button

```ts
import { Scene, Vector, Button, fadeTransition } from "sliver-engine";

const pauseScene = new Scene("pause", "rgba(0,0,0,0.4)");
const RETURN_TO_SCENE = "main";

pauseScene.addGameObject(
  new Button(
    "resume",
    new Vector(300, 250),
    new Vector(200, 60),
    "Resume",
    "#6f42c1",
    "white",
    (btn) => {
      // Resume with a small fade transition.
      btn
        .getContext()
        ?.transitionToScene(RETURN_TO_SCENE, fadeTransition(250), "replace");
    }
  )
);
```

## Opening pause via a key combo

Use a key decorator on an always-present object (or your player):

```ts
import { GameObject, onKeyPressed, fadeTransition } from "sliver-engine";
import type { GameEvent } from "sliver-engine";

class PauseController extends GameObject {
  @onKeyPressed("Escape", (obj) => {
    const ctx = obj.getContext();
    if (!ctx) return;
    // Replace with a small fade, so the gameplay scene stops ticking.
    ctx.transitionToScene("pause", fadeTransition(250), "replace");
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}
```

Add `PauseController` to your gameplay scene once.

## Optional: keep gameplay visible while paused

If you want gameplay to remain visible while paused (a true overlay), you need to _stop ticking it yourself_ (because pushing an overlay keeps the gameplay scene active).

One simple pattern:

- push the pause scene (`pushScene("pause")`) so it renders on top and captures input (make sure it's background is transparent)
- set a flag on the scene to stop ticking
- override the method tick() of the scene to return early if this flag is set
