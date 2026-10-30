---
title: Game loop
---

The `Game` orchestrates a tick/render loop (configurable ticks-per-second) and exposes a shared `GameContext` (tick/frame counters, input, message bus, sound manager, etc.).

Start from the setup in `Getting started`, then add objects to scenes and implement `tick()` / `render()` hooks on your `GameObject`s.

