import {
  GameObject,
  Vector,
  type GameContext,
  type Scene,
} from "sliver-engine";
import {
  CANVAS_WIDTH,
  PIPE_MAX_TOP,
  PIPE_MIN_TOP,
  PIPE_SPAWN_TICKS,
  randomBetween,
} from "./constants";
import { PipePair } from "./PipePair";
import type { Bird } from "./Bird";

export class PipeSpawner extends GameObject {
  private pipes: PipePair[] = [];
  private ticksSincePipe = PIPE_SPAWN_TICKS;
  private paused = false;

  constructor(private bird: Bird) {
    super("pipe-spawner", Vector.zero(), false, true);
    this.setPhisics({ immovable: true, affectedByGravity: false });
  }

  override onAddedToScene(_scene: Scene, _context: GameContext): void {
    // Listen to messages of the game cycle
    this.onMessage("game:over", () => this.pausePipes());
    this.onMessage("game:reset", () => this.resetPipes());
  }

  override tick(): void {
    if (!this.paused) {
      // Count ticks as timer to spawn more pipes
      this.ticksSincePipe += 1;
      if (this.ticksSincePipe >= PIPE_SPAWN_TICKS) {
        this.spawnPipe();
        this.ticksSincePipe = 0;
      }
    }
    super.tick();
  }

  private pausePipes(): void {
    this.paused = true;
    this.pipes.forEach((pipe) => pipe.setFrozen(true));
  }

  private resetPipes(): void {
    this.paused = false;
    this.ticksSincePipe = PIPE_SPAWN_TICKS;
    this.pipes.forEach((pipe) => pipe.destroy());
    this.pipes = [];
  }

  private spawnPipe(): void {
    if (!this.scene) return;
    const gapTop = randomBetween(PIPE_MIN_TOP, PIPE_MAX_TOP);
    const pipe = new PipePair(CANVAS_WIDTH + 40, gapTop, this.bird);
    this.pipes.push(pipe);
    this.scene.addGameObject(pipe);
  }
}
