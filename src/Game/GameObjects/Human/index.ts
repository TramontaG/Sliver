import {
  GameObject,
  Vector,
  renderSpriteAnimation,
  type CanvasController,
  type Scene,
} from "sliver-engine";
import { createSpriteAnimation, spriteSize } from "../../Definitions/Sprites";

class Human extends GameObject {
  protected spriteName: string;
  protected frames: ReturnType<typeof createSpriteAnimation>;
  protected readonly scale: number;
  protected readonly frameSize: Vector;
  private readonly renderOffset: Vector;

  constructor(
    name: string,
    position: Vector,
    spriteName: string,
    scale = 2,
    renderOffset?: Vector
  ) {
    super(name, position);
    this.spriteName = spriteName;
    this.frames = createSpriteAnimation(this.spriteName);
    this.scale = scale;
    this.frameSize = new Vector(spriteSize[0], spriteSize[1] * 2);
    this.renderOffset =
      renderOffset ?? this.frameSize.toMultiplied(this.scale * 0.5);
  }

  protected getAnimationDefinitionNames(): string[] {
    const isWalking = !this.speed.equals(Vector.zero());
    const direction = this.getDominantDirection();
    const state = isWalking ? "walk" : "idle";
    const frames = this.frames[state]![direction!];
    return frames.map((_frame, index) => {
      return `people:${this.spriteName}:${state}:${direction}:${index}`;
    });
  }

  protected getRenderPosition(): Vector {
    return this.getPosition().toSubtracted(this.renderOffset);
  }

  @renderSpriteAnimation((human) => human.getAnimationDefinitionNames(), {
    ticksPerFrame: 6,
    scale: (human: Human) => human.scale,
    overridePosition: (human: Human) => human.getRenderPosition(),
  })
  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
  }
}

export { Human };
