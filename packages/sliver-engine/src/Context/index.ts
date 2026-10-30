import type { CanvasController } from "../CanvasController";
import type { Game } from "../Game";
import type { GameObject } from "../GameObject";
import type { Scene } from "../Scenes";
import type { SceneManager } from "../Scenes/SceneManager";
import type { SceneTransition } from "../Scenes/SceneManager/Transitions";
import { KeyAccumulator } from "../Events/keyAccumulator";
import type { SoundManager } from "../SoundManager";

type MessageHandler<TPayload = unknown> = (
  payload: TPayload,
  sender?: GameObject | null
) => void;

class MessageBus {
  private channels = new Map<string, Set<MessageHandler>>();

  subscribe<TPayload>(
    channel: string,
    handler: MessageHandler<TPayload>
  ): () => void {
    const handlers = this.channels.get(channel) ?? new Set<MessageHandler>();
    handlers.add(handler as MessageHandler);
    this.channels.set(channel, handlers);

    return () => {
      this.unsubscribe(channel, handler);
    };
  }

  unsubscribe<TPayload>(
    channel: string,
    handler: MessageHandler<TPayload>
  ): void {
    const handlers = this.channels.get(channel);
    if (!handlers) {
      return;
    }

    handlers.delete(handler as MessageHandler);
    if (handlers.size === 0) {
      this.channels.delete(channel);
    }
  }

  publish<TPayload>(
    channel: string,
    payload: TPayload,
    sender?: GameObject | null
  ): void {
    const handlers = this.channels.get(channel);
    handlers?.forEach((handler) => handler(payload, sender ?? null));
  }
}

type GameContextOptions = {
  game: Game;
  canvas: CanvasController;
  sceneManager: SceneManager;
  keyAccumulator: KeyAccumulator;
  soundManager: SoundManager;
};

class GameContext {
  private messageBus = new MessageBus();
  private frameCount: number = 0;
  private tickCount: number = 0;

  constructor(private options: GameContextOptions) {}

  getGame(): Game {
    return this.options.game;
  }

  incrementFrameCount(): void {
    this.frameCount++;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getTickRate(): number {
    return this.options.game.getTickRate();
  }

  incrementTickCount(): void {
    this.tickCount++;
  }

  getCanvas(): CanvasController {
    return this.options.canvas;
  }

  getSceneManager(): SceneManager {
    return this.options.sceneManager;
  }

  getSoundManager(): SoundManager {
    return this.options.soundManager;
  }

  getKeyAccumulator(): KeyAccumulator {
    return this.options.keyAccumulator;
  }

  getCurrentScene(): Scene | null {
    return this.options.sceneManager.getCurrentScene();
  }

  getActiveScenes(): Scene[] {
    return this.options.sceneManager.getActiveScenes();
  }

  getAllScenes(): Scene[] {
    return this.options.sceneManager.getAllScenes();
  }

  setCurrentScene(name: string): void {
    this.options.sceneManager.setSceneAsCurrent(name);
  }

  pushScene(name: string): void {
    const scene = this.options.sceneManager.getScene(name);
    if (scene) {
      this.options.sceneManager.pushSceneToActive(scene);
    }
  }

  popScene(): Scene | undefined {
    return this.options.sceneManager.popSceneFromActive();
  }

  transitionToScene(
    name: string,
    transition?: SceneTransition,
    mode: "replace" | "push" = "replace"
  ): Promise<void> {
    return this.options.sceneManager.transitionToScene(name, transition, mode);
  }

  sendMessage<TPayload>(
    channel: string,
    payload: TPayload,
    sender?: GameObject | null
  ): void {
    this.messageBus.publish(channel, payload, sender);
  }

  getPressedKeys(): string[] {
    return this.options.keyAccumulator.getPressedKeys();
  }

  isKeyPressed(key: string): boolean {
    return this.options.keyAccumulator.isPressed(key);
  }

  subscribeToMessage<TPayload>(
    channel: string,
    handler: MessageHandler<TPayload>
  ): () => void {
    return this.messageBus.subscribe(channel, handler);
  }
}

export { GameContext, MessageBus };
export type { MessageHandler };
