---
title: Audio
sidebar_position: 10
---

Sliver’s `SoundManager` is a small wrapper around the Web Audio API (`AudioContext`).

You typically:

1. create a single `SoundManager` for your game
2. preload sounds (SFX + music) with `loadSound`
3. “unlock” audio after a user interaction
4. use `playSound` for one-shots and `playSong` for background music

## Getting the SoundManager

`SoundManager` is available through the [`GameContext`](./game-context.md):

```ts
const sound = game.getContext().getSoundManager();
```

Your `Game` instance receives a `soundManager` in its constructor options, so you usually create it once and pass it in:

```ts
import { Game, SoundManager } from "sliver-engine";

const soundManager = new SoundManager();

const game = new Game({
  canvas,
  scenes,
  soundManager: soundManager,
});
```

## Unlocking audio (required by browsers)

Browsers block audio autoplay. Until the user clicks/taps/presses a key, the underlying `AudioContext` is typically “suspended”.

Call `unlock()` from a user interaction handler (recommended), once, as early as possible:

```ts
window.addEventListener("pointerdown", async () => {
  await game.getContext().getSoundManager().unlock();
});
```

I suggest you to integrate this unlock on your game in the following way

- Your start scene has nothing but a button for `start game`
- Clicking on this button transition to a scene and unlocks the audio

```ts
class MyButton extends GameObject {
  // {...}

  @onClick((self) => {
    self.getContext().getSoundManager().unlock();
  })
  override handleEvent(event: GameEvent) {
    super.handleEvent(event);
  }
}

// or

class MyButton extends GameObject {
  // {...}

  @onClick((self) => {
    self.getContext().getSoundManager().playSound("button_click");
    // If the first audio that's played comes from a user
    // interaction, the unlock happens automatically
  })
  override handleEvent(event: GameEvent) {
    super.handleEvent(event);
  }
}
```

Why this matters:

- `unlock()` connects the internal `masterGain` to the audio output and resumes the `AudioContext`.
- `playSound()` / `playSong()` try to unlock automatically when needed, but they don’t `await` it, so your very first sound is more reliable if you unlock explicitly on input.

## Preloading sounds

Load audio files into an in-memory library (decoded into an `AudioBuffer`):

```ts
const sound = game.getContext().getSoundManager();

await sound.loadSound(
  "jump",
  new URL("/audio/jump.wav", window.location.href),
  ["sfx", "player"]
);

await sound.loadSound(
  "bgm:forest",
  new URL("/audio/forest-theme.ogg", window.location.href),
  ["music"]
);
```

Notes:

- `loadSound(name, url, tags?)` fetches the asset and decodes it. If the fetch fails, it throws with the HTTP status.
- `tags` are stored with the sound entry (useful for your own filtering/organization via `getLoadedSounds()`).
- [TODO] `tags` will also be used to create a gain control for each tag in the future

## Master volume

`SoundManager` routes all sounds through a master gain node, so you can implement global volume/mute easily:

```ts
const sound = game.getContext().getSoundManager();

sound.setMasterGain(0.6); // clamps to >= 0
console.log(sound.getMasterGain()); // -> 0.6
```

## Per-sound default volume

Each loaded sound keeps a default volume (used when you don’t pass an explicit `volume` to `playSound` / `playSong`):

```ts
sound.setSoundVolume("jump", 0.3); // clamps to >= 0
console.log(sound.getSoundVolume("jump")); // -> 0.3
```

This is a good place to normalize loud assets so your call sites can stay simple.

## Playing one-shot sound effects

Use `playSound(name, options)` for SFX. It returns a small controller with a `stop()` method.

```ts
const sfx = sound.playSound("jump", {
  volume: 0.8,
  playbackRate: 1.1,
});

// ...later (optional)
sfx.stop();
```

### Useful options

- `loop`: repeat until stopped (defaults to `false`)
- `playbackRate`: speed/pitch (defaults to `1`)
- `wait`: delay before playing (seconds)
- `start`: offset into the audio file (seconds)
- `end`: stop at an absolute time in the file (seconds)
- `duration`: how long to play (seconds). If present, it takes precedence over `end`.

Example: play only a short “blip” segment, after a delay:

```ts
sound.playSound("ui:beep", {
  wait: 0.05,
  start: 0.12,
  duration: 0.08,
});
```

Why `duration` wins over `end`: it’s often easier to express “play 80ms from here” than to compute an absolute end time when you change `start`.

## Playing and controlling background music (“songs”)

Use `playSong(name, options)` for tracked background music.

Behavior:

- If you request the same song that’s already playing, nothing changes and you get the existing controller back.
- If you request a different song, the previous song is stopped and the new one starts.

By default, songs loop (`loop` defaults to `true` for `playSong`).

### Fading between songs

`playSong` supports fade transitions (in seconds) via `fade`, `fadeIn`, and `fadeOut`:

```ts
sound.playSong("bgm:forest", { volume: 0.5, fade: 0.6 });

// Later, cross-fade to another track
sound.playSong("bgm:cave", { volume: 0.5, fadeOut: 0.6, fadeIn: 0.8 });
```

To stop the current song:

```ts
sound.stopSong({ fadeOut: 0.5 });
```

Or use the controller returned by `playSong`:

```ts
const song = sound.playSong("bgm:forest");
song.stop({ fadeOut: 0.5 });
```

### Introspection and debugging

```ts
console.log(sound.getCurrentSongName()); // string | undefined
console.log(Object.keys(sound.getLoadedSounds())); // names you loaded
```
