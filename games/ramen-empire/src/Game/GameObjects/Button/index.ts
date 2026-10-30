import {
  CanvasController,
  GameObject,
  onClick,
  renderTile,
  Scene,
  SquareHitbox,
  Vector,
  type GameEvent,
} from "sliver-engine";

const getBtnSprite = (btn: LamenEmpireButton) => {
  const btnSprites = window.definitions.sprites.ui["ui:Button"]!;
  return btn.hovering ? btnSprites[btn.type][1] : btnSprites[btn.type][0];
};

class LamenEmpireButton extends GameObject {
  size: Vector;
  scale: number;
  text: string = "Button";
  type: "primary" | "secondary" | "tertiary";
  onClick?: () => void;

  constructor(
    position: Vector,
    text: string,
    scale: number,
    onClick?: () => void,
    type: "primary" | "secondary" | "tertiary" = "primary"
  ) {
    super("LamenEmpireButton", position);
    this.size = new Vector(64, 21).multiply(scale);
    this.scale = scale;
    this.type = type;
    this.onClick = onClick;
    this.text = text;

    this.addHitbox(
      new SquareHitbox(
        // Crazy shennanigans to center the hitbox
        this.size.toMultiplied(-0.5).toAdded(new Vector(0, -2)),
        this.size,
        this
      )
    );
  }

  @renderTile("ui:Button", (btn) => getBtnSprite(btn), {
    scale: (btn: LamenEmpireButton) => btn.scale,
    overridePosition: (btn: LamenEmpireButton) =>
      btn.getPosition().toAdded(new Vector(-32, -16).multiply(btn.scale)),
  })
  override render(canvas: CanvasController, scene: Scene) {
    super.render(canvas, scene);
    // Shennanigans to center the text on the button
    const { x, y } = this.getPosition().toAdded(
      new Vector(0, 2).multiply(this.scale)
    );

    canvas
      .getShapeDrawer()
      .drawText(
        this.text,
        x,
        y,
        "black",
        (12 * this.scale).toString() + "px",
        "center"
      );
  }

  @onClick<LamenEmpireButton>((btn, event) => {
    btn.onClick?.();
    btn.getContext()?.getSoundManager().playSound("confirm_3");
    event.stopPropagation = true;
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}

export { LamenEmpireButton };
