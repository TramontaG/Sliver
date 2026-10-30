import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { Scene } from "../../Scenes";
import { Vector } from "../../Lib/Vector";

type TextOptions = {
  color?: string;
  size?: string;
  align?: CanvasTextAlign;
  font?: string;
};

class Text extends GameObject {
  private text: string;
  private color: string;
  private size: string;
  private align: CanvasTextAlign;
  private font?: string;

  constructor(
    name: string,
    position: Vector,
    text: string,
    { color = "black", size = "16px", align = "center", font }: TextOptions = {}
  ) {
    super(name, position);
    this.text = text;
    this.color = color;
    this.size = size;
    this.align = align;
    this.font = font;

    this.setRenderFunction(this.renderText);
  }

  setText(text: string): void {
    this.text = text;
  }

  getText(): string {
    return this.text;
  }

  private renderText = (obj: GameObject, canvas: CanvasController): void => {
    const pos = obj.getPosition();
    canvas
      .getShapeDrawer()
      .drawText(
        this.text,
        pos.x,
        pos.y,
        this.color,
        this.size,
        this.align,
        this.font
      );
  };

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
  }
}

export { Text };
export type { TextOptions };
