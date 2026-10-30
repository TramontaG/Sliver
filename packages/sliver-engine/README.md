# Sliver Engine

Pre-alpha TypeScript/HTML5 Canvas 2D game engine.

Official documentation: https://sliver-engine.gramont.digital

## Engine features (Sliver Engine)

- **Game loop + context**: tick/render split, configurable TPS, shared `GameContext`, message bus, and key state.
- **Scenes + transitions**: scene stack, camera offset, gravity, background/overlay, and built-in transitions.
- **Rendering**: canvas primitives, text, sprites/sprite-sheets, animation helpers, clipping, rotation, and font loading.
- **Input/events**: keyboard + mouse + wheel events with decorators (`@onClick`, `@onClickAnywhere`, `@onHover`, `@onKeyPressed`, `@grabbable`, ...).
- **Game objects**: `GameObject` base, tick/render hooks, child hierarchy, movement via `speed`, and scene/message helpers.
- **Walker**: waypoint movement with optional obstacle-avoidance pathfinding.
- **Physics + collisions**: gravity, restitution, friction, immovable bodies, and circle/rotated-square hitboxes.
- **Scripted events**: composable async sequences (`sequenceOf`, `parallel`, `waitUntil`, `waitTicks`, `waitForKeyPress`, ...).
- **Saves**: localStorage-backed saves with load hooks.
- **Audio**: `SoundManager` with preload, volume, looping, playback-rate, and timing controls.
- **Reusable widgets**: `Button`, `Text`, `TextBox`, `ScrollView`, `FloatingView`, `Group`, and shape helpers.
- **Mixins**: method decorators for before/after/replace composition.

## Running locally

1. Install deps: `bun install`
2. Typecheck: `bun run typecheck`
3. Build: `bun run build`
4. Debug sandbox (Parcel): `bun run debug:start` (served from `src/DebugGame/`)

## Documentation (Docusaurus)

You can check the documentation on repo or on https://sliver-engine.gramont.digital

## Notes

- Browser-only (DOM + Canvas + Web Audio).
- Tooling uses Bun (TypeScript 5).
- If you use the decorator helpers, enable `experimentalDecorators: true` in your TS config.
