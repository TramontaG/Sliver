# CanvasGE project guidelines

These guidelines aim to keep the engine and docs consistent with the existing
codebase. Prefer following established patterns from nearby modules over
inventing new ones.

## TypeScript style

- Use named exports only; avoid default exports.
- Prefer `type` instead of `interface`
- Use `import type` for type-only imports.
- Keep `strict`-safe code: null-check `getContext()`/`getCanvas()` before use.
- Prefer `const`/`readonly`; keep mutation localized and explicit.
- Use tab indentation, semicolons, and double quotes.

## File and module structure

- Use PascalCase file names for classes (`SpriteLibrary.ts`, `TextBox.ts`).
- Keep module barrels in `index.ts` and update them when adding public APIs.
- Public API changes should be exported from `src/index.ts` as well.
- Keep engine code in `src/`; documentation changes belong in `website/docs/`.

## Engine conventions

- Use `Vector` for positions, sizes, velocities, and offsets (avoid `{x, y}`).
- Subclass `GameObject` for anything that ticks/renders; call `super.*` when
  overriding (`tick`, `render`, `handleEvent`).
- Prefer `setTickFunction` / `setRenderFunction` when an object is data-driven.
- Use hitboxes for interactions; keep `solid`/`debug` flags explicit.
- Use event decorators (`@onClick`, `@onKeyPressed`, etc.) for input handlers.
- Keep scene wiring in `SceneManager`; favor small, named helper functions for
  setup (see `src/DebugGame/main.ts`).

## Constants and naming

- Use `const` module-level constants in UPPER_SNAKE_CASE.
- Prefer descriptive names for options and callbacks (`options`, `onFinished`).
- Keep booleans descriptive (`enabled`, `solid`, `affectedByGravity`).

## Docs and examples

- When adding a new engine feature, update `website/docs/` and the relevant
  versioned docs if you are releasing a new version.
- Update README usage examples if public APIs change.
- If you need to understand how to use any given tool, read the docs.

## Tooling

- Use Bun for scripts (`bun run typecheck`, `bun run build`, `bun run docs:*`).

## BEFORE WORKING ON A PROMPT

- If the prompt is a question, do not implement anything yet, just reply the question.
- Only change the code if the user requests you to do so.
