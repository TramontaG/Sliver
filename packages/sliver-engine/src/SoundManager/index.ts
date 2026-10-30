type Audio = {
  buffer: AudioBuffer;
  volume: number;
  tags: string[];
};

type AudioPlayOptions = {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  /** wait time in seconds before playing the sound */
  wait?: number;
  /** Audio start time offset in seconds */
  start?: number;
  /** Audio end time in seconds */
  end?: number;
  /** how long to play the sound. Takes precedence over
   *  end if both are provided
   */
  duration?: number;
};

type SongTransitionOptions = {
  /** Fade duration in seconds (used for both fade-in and fade-out). */
  fade?: number;
  /** Fade-in duration in seconds. Overrides `fade` for the fade-in side. */
  fadeIn?: number;
  /** Fade-out duration in seconds. Overrides `fade` for the fade-out side. */
  fadeOut?: number;
};

type SongPlayOptions = Pick<AudioPlayOptions, "volume" | "loop" | "playbackRate"> &
  SongTransitionOptions;

type SongController = {
  name: string;
  stop: (options?: Pick<SongTransitionOptions, "fadeOut" | "fade">) => void;
};

class SoundManager {
  private sounds: Record<string, Audio> = {};
  public active: boolean = false;

  private context = new AudioContext();
  public masterGain = this.context.createGain();

  private currentSong?: {
    id: number;
    name: string;
    source: AudioBufferSourceNode;
    gain: GainNode;
    controller: SongController;
  };
  private songIdCounter = 0;

  constructor() {}

  /**
   * Has to be called whenever the user clicks something or hits a key
   * to unlock the audio context. Browsers require this to prevent
   * autoplaying sounds.
   */
  async unlock() {
    this.masterGain.connect(this.context.destination);

    if (this.context.state !== "running") {
      await this.context.resume();
      this.active = true;
    }
  }

  setMasterGain(volume: number) {
    // Avoid negative volumes
    this.masterGain.gain.value = Math.max(0, volume);
  }

  getMasterGain() {
    return this.masterGain.gain.value;
  }

  getLoadedSounds() {
    return this.sounds;
  }

  setSoundVolume(sound: string, volume: number) {
    const audioEntry = this.sounds[sound];
    if (!audioEntry) {
      throw new Error(
        `Tried to set volume of sound ${sound} but it was not loaded into the library`
      );
    }

    audioEntry.volume = Math.max(0, volume);
  }

  getSoundVolume(sound: string) {
    const audioEntry = this.sounds[sound];
    if (!audioEntry) {
      throw new Error(
        `Tried to set volume of sound ${sound} but it was not loaded into the library`
      );
    }

    return audioEntry.volume;
  }

  async loadSound(name: string, url: URL, tags: string[] = []) {
    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(
        `Failed to fetch audio ${name}: ${res.status}-${res.statusText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    this.sounds[name] = {
      buffer: audioBuffer,
      volume: 1,
      tags,
    };
  }

  getCurrentSongName() {
    return this.currentSong?.name;
  }

  stopSong(options: Pick<SongTransitionOptions, "fadeOut" | "fade"> = {}) {
    if (!this.currentSong) return;
    const fadeOutSeconds = Math.max(0, options.fadeOut ?? options.fade ?? 0);
    this.stopSongPlayback(this.currentSong, fadeOutSeconds);
  }

  /**
   * Plays a single tracked "song" (typically background music).
   * - If the same song is requested, nothing happens.
   * - If a different song is requested, the previous song is stopped and the new one starts.
   * - Optional fade transition is supported (in seconds) via `fade`, `fadeIn`, `fadeOut`.
   */
  playSong(name: string, options: SongPlayOptions = {}): SongController {
    if (!this.active) {
      this.unlock();
    }

    if (this.currentSong?.name === name) {
      return this.currentSong.controller;
    }

    const audioEntry = this.sounds[name];
    if (!audioEntry) {
      throw new Error(
        `Tried to play song ${name} but it was not found in the library`
      );
    }

    const fadeOutSeconds = Math.max(0, options.fadeOut ?? options.fade ?? 0);
    const fadeInSeconds = Math.max(0, options.fadeIn ?? options.fade ?? 0);

    if (this.currentSong) {
      this.stopSongPlayback(this.currentSong, fadeOutSeconds);
    }

    const { buffer, volume: defaultVolume } = audioEntry;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? true;
    source.playbackRate.value = options.playbackRate ?? 1;

    const gain = this.context.createGain();
    const targetVolume = Math.max(0, options.volume ?? defaultVolume);

    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(fadeInSeconds > 0 ? 0 : targetVolume, now);
    if (fadeInSeconds > 0) {
      gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInSeconds);
    }

    source.connect(gain);
    gain.connect(this.masterGain);

    const id = ++this.songIdCounter;

    // one try-catch for each disconnect to avoid one failing to stop the others
    const onEnd = () => {
      try {
        source.disconnect();
      } catch {}
      try {
        gain.disconnect();
      } catch {}
      if (this.currentSong?.id === id) {
        this.currentSong = undefined;
      }
    };

    source.onended = onEnd;
    source.start(now);

    const controller: SongController = {
      name,
      stop: (stopOptions = {}) => {
        const fadeOut = Math.max(0, stopOptions.fadeOut ?? stopOptions.fade ?? 0);
        this.stopSongPlayback({ source, gain }, fadeOut);
      },
    };

    this.currentSong = { id, name, source, gain, controller };
    return controller;
  }

  playSound(name: string, options: AudioPlayOptions = {}) {
    // This will work only if the sonud was triggered by a
    // User interaction.
    if (!this.active) {
      this.unlock();
    }
    const audioEntry = this.sounds[name];

    if (!audioEntry) {
      throw new Error(
        `Tried to play sound ${name} but it was not found in the library`
      );
    }

    const { buffer, volume } = audioEntry;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;
    source.playbackRate.value = options.playbackRate ?? 1;

    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, options.volume ?? volume);

    source.connect(gain);
    gain.connect(this.masterGain);

    const waitTime = options.wait ?? 0;
    const audioStart = options.start ?? 0;
    const audioDuration = (() => {
      if (options.duration) {
        return options.duration;
      } else if (options.end) {
        return options.end - (options.start ?? 0);
      } else {
        return undefined;
      }
    })();

    // one try-catch for each disconnect to avoid one failing to stop the others
    const onEnd = () => {
      try {
        source.disconnect();
      } catch {}
      try {
        gain.disconnect();
      } catch {}
    };

    source.onended = onEnd;
    source.start(
      this.context.currentTime + waitTime,
      audioStart,
      audioDuration
    );

    return {
      stop: () => {
        try {
          source.stop();
        } catch (e) {}
        onEnd();
      },
    };
  }

  private stopSongPlayback(
    song: { source: AudioBufferSourceNode; gain: GainNode },
    fadeOutSeconds: number
  ) {
    const { source, gain } = song;
    const now = this.context.currentTime;

    const stopAt = now + Math.max(0, fadeOutSeconds);

    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      if (fadeOutSeconds > 0) {
        gain.gain.linearRampToValueAtTime(0, stopAt);
      } else {
        gain.gain.setValueAtTime(0, now);
      }
    } catch {}

    try {
      source.stop(stopAt);
    } catch {}
  }
}

export {
  SoundManager,
  type AudioPlayOptions,
  type SongPlayOptions,
  type SongTransitionOptions,
  type SongController,
  type Audio,
};
