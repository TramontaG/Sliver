# Sliver Engine game-dev guidelines

This guide is for building a game _with_ Sliver Engine as an npm package.
It assumes you are consuming the library in your own project.

## Quick start

- Install: `npm install sliver-engine` (or your package manager of choice).
- Create a canvas, scenes, and a `Game` instance.
- If you use decorators (`@onClick`, `@renderSprite`, mixins, etc.), enable
  `experimentalDecorators: true` in your `tsconfig.json`.

## Core concepts (how the engine thinks)

- Ticks and frames are split. Update state in `tick()`, draw in `render(...)`.
- The engine is tick-based. If you want real time, convert using
  `dt = 1 / ctx.getTickRate()`.
- `GameContext` is the glue. Use it for scenes, audio, input, and messaging.
- `GameObject` is the unit of gameplay. Most logic should live there.

## GameContext patterns

- `this.getContext()` can be `null` until the object is added to a scene.
- Subscribe to messages in `onAddedToScene` instead of `tick()`.
- Use the helpers instead of raw dependencies:
  - `ctx.setCurrentScene`, `ctx.pushScene`, `ctx.popScene`, `ctx.transitionToScene`
  - `ctx.isKeyPressed` / `ctx.getPressedKeys`
  - `ctx.getSoundManager()` for audio

## Scenes and scene stack

- A scene is a screen/state: gameplay, menu, pause, cutscene.
- The scene stack can have multiple active scenes; _all_ active scenes tick.
- To truly pause gameplay, replace the scene (`setCurrentScene` or
  `transitionToScene(..., "replace")`) or gate your gameplay tick logic.
- Use `scene.setOffset(...)` for camera movement; it shifts render and hit-tests.
- Use transitions for polish; only one transition can run at a time.

## GameObject patterns

- Use `Vector` for positions, sizes, velocities, offsets (avoid `{ x, y }`).
- Call `super.tick()`, `super.render(...)`, and `super.handleEvent(event)` when
  overriding; the base behavior includes physics and hover state.
- Prefer `setTickFunction` / `setRenderFunction` for data-driven state machines.
- Use `destroy()` for removal (it detaches children and removes from the scene).
- Use `getScenePosition()` for world logic and `getPosition()` for rendering.

## Input and events

- Use decorators on `handleEvent(event)` instead of manual `switch` logic.
- Remember hitbox-based mouse decorators require at least one hitbox.
- `@onKeyPressed` runs once; `@onKeyHold` runs every tick while held.
- Use `event.stopPropagation = true` to stop scene/object propagation.

## Physics and collisions

- Attach hitboxes and set physics flags to participate in collisions.
- Use `solid: false` hitboxes for triggers (overlap without collision response).
- `beforeColision` can filter; return `false` to ignore a pair for the tick.
- `onColision` is where gameplay reactions happen.
- Gravity is per-tick; set it on the scene (`scene.setGravity(...)`).

## Rendering and sprites

- Render via `CanvasController` and `ShapeDrawer` helpers.
- Use `renderSprite` / `renderSpriteAnimation` decorators for sprites.
- Centralize sprite frame indexes in constants to avoid magic numbers.
- Prefer `SpriteLibrary.loadSpriteSheet` for grid sheets.
- Keep drawing in `render(...)` only; do not mutate gameplay state there.

## Audio

- Create one `SoundManager` for the game and pass it into `Game`.
- Preload sounds with `loadSound` before playing them.
- Unlock audio on first user interaction (`sound.unlock()` or play a sound
  on a button press).
- Use `playSong` for background music and `playSound` for SFX.

## Messaging (decoupled communication)

- Use `ctx.sendMessage` / `this.sendMessage` for loose coupling.
- Use `onMessage` / `onceOnMessage` to subscribe, ideally in `onAddedToScene`.
- Pick consistent channel names (`system:event`, `feature:event`).

## UI and HUDs

- Simple UI can be `GameObject`s that render text or shapes.
- Attach UI as a child when it should follow a character
  (`setPositionRelativeToMotherShip(true)`), like a health bar under the character or an particle spawner
- Use `Button` and other widgets from the engine for quick menus, but prefer to extend them.

## Scripted events and cutscenes

- Use scripted events for dialog and sequences (`scripted`, `sequenceOf`, etc.).
- Keep state immutable when composing scripted events.
- `TextBoxSequence` is the fastest way to build dialog sequences.

## Walker (patrols and pathing)

- Use `Walker` for waypoint patrols; it writes to `gameObject.speed`.
- Keep only one movement system writing to `speed` at a time.
- Enable pathfinding only when needed; it is grid-based and can be tuned.

## Saves

- Use `game.saves` for small JSON snapshots (localStorage-based).
- Always treat `read()` as nullable and version your save data.
- Use save `label`s for user-facing menus.

## Common pitfalls

- `getContext()` can be `null` until the object is attached to a scene. For setting up an object, use `onAddedToScene` (context is not null when it gets triggered).
- `pushScene("pause")` does not pause gameplay; it only overlays it. For pausing the scene underneath the pause scene, the tick should be ignored.
- Hitbox-based mouse events will not fire without hitboxes.
- Avoid heavy work in `render(...)`; keep it deterministic and draw-only.

## Tooling

- Use your project tooling (Vite, Parcel, Webpack, etc.).
- The engine is browser-only and expects DOM + Canvas + Web Audio.
- TypeScript is strongly recommended for typed events and state.

## Documentation references

- Keep local notes for pages you rely on (Game Objects, Scenes, Events).
- The documentations that you added are listed below (feel free to add more if you find them usefu):
