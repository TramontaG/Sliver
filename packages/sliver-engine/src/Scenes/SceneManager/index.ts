import type { Scene } from "..";
import type { GameContext } from "../../Context";
import type { SceneTransition, TransitionScenes } from "./Transitions";
import { fadeTransition } from "./Transitions";

class SceneManager {
  private activeScenes: Scene[] = [];
  private context: GameContext | null = null;
  private activeTransition:
    | (TransitionScenes & {
        startedAt: number;
        config: SceneTransition;
        mode: "replace" | "push";
        resolve: () => void;
      })
    | null = null;

  constructor(
    private scenes: Record<string, Scene>,
    private currentScene: Scene | null = null
  ) {
    if (currentScene) {
      this.pushSceneToActive(currentScene);
    }
  }

  tick(): void {
    this.context?.incrementTickCount();
    this.updateTransition(performance.now());
    this.activeScenes.forEach((scene) => scene.tick());
  }

  getScene(name: string): Scene | null {
    return this.scenes[name] || null;
  }

  setSceneAsCurrent(name: string): void {
    const scene = this.getScene(name);
    if (scene) {
      scene.setContext(this.context);
      const previousActiveScenes = this.activeScenes;
      this.activeScenes = [scene];
      this.currentScene = scene;
      scene.activate();
      previousActiveScenes.forEach((activeScene) => {
        if (activeScene !== scene) {
          activeScene.deactivate();
        }
      });
    }
  }

  getAllScenes(): Scene[] {
    return Object.values(this.scenes);
  }

  getActiveScenes(): Scene[] {
    return this.activeScenes;
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  pushSceneToActive(scene: Scene): void {
    scene.setContext(this.context);
    this.activeScenes.push(scene);
    scene.activate();
  }

  popSceneFromActive(): Scene | undefined {
    const popped = this.activeScenes.pop();
    popped?.deactivate();
    return popped;
  }

  bindContext(context: GameContext): void {
    this.context = context;
    this.getAllScenes().forEach((scene) => scene.setContext(context));
  }

  async transitionToScene(
    name: string,
    transition: SceneTransition = fadeTransition(),
    mode: "replace" | "push" = "replace"
  ): Promise<void> {
    const target = this.getScene(name);

    if (!target) {
      return Promise.reject(new Error(`Scene "${name}" not found`));
    }

    if (this.activeTransition) {
      return Promise.reject(new Error("A transition is already running"));
    }

    target.setContext(this.context);

    const transitionScenes: TransitionScenes = {
      from: this.currentScene,
      to: target,
    };
    const fromScene = transitionScenes.from;

    const incomingOnTop = transition.incomingOnTop ?? true;
    const targetIndex = this.activeScenes.indexOf(target);
    const fromIndex = fromScene ? this.activeScenes.indexOf(fromScene) : -1;
    const targetIsActive = targetIndex !== -1;

    // Ensure the incoming scene renders during the transition, respecting
    // whether it should be above or below the outgoing scene.
    if (!targetIsActive) {
      if (mode === "push" || incomingOnTop) {
        this.activeScenes = [...this.activeScenes, target];
      } else if (fromIndex >= 0) {
        this.activeScenes = [
          ...this.activeScenes.slice(0, fromIndex),
          target,
          ...this.activeScenes.slice(fromIndex),
        ];
      } else {
        this.activeScenes = [...this.activeScenes, target];
      }
    } else if (mode === "push" || incomingOnTop) {
      this.activeScenes = [
        ...this.activeScenes.filter((scene) => scene !== target),
        target,
      ];
    }
    this.currentScene = target;
    target.activate();

    transition.setup?.(0, transitionScenes);

    return new Promise<void>((resolve) => {
      this.activeTransition = {
        ...transitionScenes,
        startedAt: performance.now(),
        config: transition,
        mode,
        resolve,
      };
    });
  }

  private updateTransition(now: number): void {
    if (!this.activeTransition) {
      return;
    }

    const { from, to, config, startedAt, mode, resolve } =
      this.activeTransition;
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / config.duration);
    const easedProgress = config.easing
      ? config.easing(progress)
      : progress;

    config.step(easedProgress, { from, to });

    if (progress >= 1) {
      config.cleanup?.(1, { from, to });

      const previousActiveScenes = this.activeScenes;

      if (mode === "replace") {
        this.activeScenes = [to];
      } else if (mode === "push") {
        // Keep existing stack but make sure "to" is on top once
        this.activeScenes = [
          ...this.activeScenes.filter((scene) => scene !== to),
          to,
        ];
      }

      const activeSet = new Set(this.activeScenes);
      previousActiveScenes.forEach((scene) => {
        if (!activeSet.has(scene)) {
          scene.deactivate();
        }
      });

      this.activeTransition = null;
      resolve();
    }
  }
}

export { SceneManager };
