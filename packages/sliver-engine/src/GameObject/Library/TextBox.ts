import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { GameContext } from "../../Context";
import type { GameEvent } from "../../Events";
import { onClick, onKeyPressed } from "../../Events/decorators";
import { Vector } from "../../Lib";
import type { Scene } from "../../Scenes";
import { SquareHitbox } from "../Hitboxes";

type TextBoxOptions = {
  position: "top" | "middle" | "bottom";
  skipTyping?: boolean;
  boxColor?: string;
  textColor?: string;
  textSize: number;
  lettersPerTick?: number;
  sprite?: {
    spritesheetName: string;
    indexes: number[];
    position: "left" | "right";
    ticksPerFrame: number;
    scale: number;
    mirroring?: "horizontal" | "vertical" | "both";
  };
};

const __TEXT_BOX_HEIGHT__ = 200;
const __SPRITE_PADDING__ = 20;

const calculateTextBoxPosition = (
  placement: TextBoxOptions["position"],
  ctx: GameContext
) => {
  const { height: canvasHeight } = ctx.getCanvas().getCanvas();

  switch (placement) {
    case "top":
      return new Vector(0, 0);
    case "middle":
      return new Vector(0, canvasHeight / 2 - __TEXT_BOX_HEIGHT__ / 2);
    case "bottom":
      return new Vector(0, canvasHeight - __TEXT_BOX_HEIGHT__);
  }
};

class TextBox extends GameObject {
  private textIndex: number = 0;
  private renderedText: string = "";
  private finishedTyping: boolean = false;

  constructor(
    name: string,
    private text: string,
    private options: TextBoxOptions,
    private onFinished: () => void
  ) {
    super(name, Vector.zero());

    // Setting the position once it becomes active
    this.setTickFunction(() => {
      if (this.getContext()) {
        this.initializeTextBox();
        // We don't need to check context again after it gets initalized
        this.setTickFunction(() => {});
        this.setRenderFunction(this.renderTextBox.bind(this));
      }
    });
  }

  private initializeTextBox() {
    const { width: canvasWidth } = this.getContext()!.getCanvas().getCanvas();

    const textboxHitbox = new SquareHitbox(
      Vector.zero(),
      new Vector(canvasWidth, __TEXT_BOX_HEIGHT__),
      this,
      {
        solid: false,
      }
    );

    // Adding hitbox so it can be clicked
    this.addHitbox(textboxHitbox);

    // Setting the position accordingly to it's preset
    this.setPosition(
      calculateTextBoxPosition(this.options.position, this.getContext()!)
    );

    if (this.options.skipTyping) {
      this.renderedText = this.text;
      this.textIndex = this.text.length - 1;
      this.finishedTyping = true;
    }
  }

  private updateRenderdText() {
    if (this.finishedTyping) {
      return;
    }

    const lettersPerTick = this.options.lettersPerTick ?? 1;

    this.textIndex += Math.round(lettersPerTick);

    if (this.textIndex > this.text.length) {
      this.renderedText = this.text;
      this.finishedTyping = true;
    } else {
      this.renderedText = this.text.substring(0, this.textIndex);
    }
  }

  private requestAdvance() {
    if (this.finishedTyping) {
      this.onFinished();
      this.destroy();
    } else {
      this.finishedTyping = true;
      this.renderedText = this.text;
      this.textIndex = this.text.length - 1;
    }
  }

  override tick() {
    super.tick();
    this.updateRenderdText();
  }

  public getSpritePosition() {
    const sprite = this.options.sprite;
    if (!sprite) return Vector.zero();

    const ctx = this.getContext();
    if (!ctx) return Vector.zero();

    const canvasWidth = ctx.getCanvas().getCanvas().width;
    const portraitSide = __TEXT_BOX_HEIGHT__; // 200px square area

    const frameSize =
      ctx
        .getCanvas()
        .getSpriteLibrary()
        .getSpriteSheetFrameSize(sprite.spritesheetName) ?? null;

    const frameWidth = frameSize?.frameWidth ?? 32;
    const frameHeight = frameSize?.frameHeight ?? 32;

    const spriteWidthPx = frameWidth * sprite.scale;
    const spriteHeightPx = frameHeight * sprite.scale;

    const base = this.getPosition();
    const portraitLeft =
      sprite.position === "left"
        ? base.x + __SPRITE_PADDING__
        : base.x + canvasWidth - __SPRITE_PADDING__ - portraitSide;

    return new Vector(
      portraitLeft + (portraitSide - spriteWidthPx) / 2,
      base.y + (portraitSide - spriteHeightPx) / 2
    );
  }

  public getTextPosition() {
    const canvasWidth = this.getContext()!.getCanvas().getCanvas().width;

    let upperCorner = this.getPosition().toAdded(
      new Vector(__SPRITE_PADDING__, __SPRITE_PADDING__)
    );

    let downCorner = upperCorner.toAdded(
      new Vector(
        canvasWidth - __SPRITE_PADDING__ * 2,
        __TEXT_BOX_HEIGHT__ - __SPRITE_PADDING__ * 2
      )
    );

    if (!this.options.sprite) {
      return { upperCorner, downCorner };
    }

    if (this.options.sprite.position === "left") {
      return {
        upperCorner: upperCorner.toAdded(new Vector(200, 0)),
        downCorner,
      };
    }

    return {
      upperCorner,
      downCorner: downCorner.toAdded(new Vector(-200, 0)),
    };
  }

  private renderTextBox(self: GameObject, canvas: CanvasController) {
    const { downCorner, upperCorner } = this.getTextPosition();
    const defaultFont = canvas.getShapeDrawer().getDefaultFont();

    const width = downCorner.x - upperCorner.x;

    const { x, y } = this.getPosition();
    const canvasWidth = this.getContext()!.getCanvas().getCanvas().width;

    canvas
      .getShapeDrawer()
      .drawRectangle(
        x,
        y,
        canvasWidth,
        __TEXT_BOX_HEIGHT__,
        this.options.boxColor
      );

    const sprite = this.options.sprite;
    if (sprite) {
      const gameContext = this.getContext()!;
      const frameIndex =
        Math.floor(gameContext.getTickCount() / sprite.ticksPerFrame) %
        sprite.indexes.length;
      const spriteIndex = sprite.indexes[frameIndex] ?? sprite.indexes[0] ?? 0;
      const mirroring = sprite.mirroring ?? null;

      canvas
        .getSpriteLibrary()
        .drawSpriteFrame(
          canvas.getContext(),
          sprite.spritesheetName,
          spriteIndex,
          this.getSpritePosition(),
          sprite.scale,
          mirroring === "horizontal" || mirroring === "both",
          mirroring === "vertical" || mirroring === "both"
        );
    }

    canvas
      .getShapeDrawer()
      .drawText(
        this.renderedText,
        upperCorner.x,
        upperCorner.y,
        this.options.textColor ?? "white",
        `${this.options.textSize ?? 16}px`,
        "left",
        defaultFont,
        {
          wrapText: width,
          baseline: "top",
        }
      );
  }

  @onClick<TextBox>((self) => self.requestAdvance())
  @onKeyPressed<TextBox>(" ", (self) => self.requestAdvance())
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
  }
}

export { TextBox };
export type { TextBoxOptions };
