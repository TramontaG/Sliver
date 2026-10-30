import {
  GameObject,
  Vector,
  type CanvasController,
  type GameContext,
  type Scene,
} from "sliver-engine";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

export class ScoreHud extends GameObject {
  private score = 0;
  private gameOver = false;
  public override zIndex = 1;

  constructor() {
    super("hud", Vector.zero());
  }

  override onAddedToScene(_scene: Scene, _context: GameContext): void {
    // Listen to messages
    this.onMessage<{ amount: number }>("score:pipe", ({ amount }) => {
      if (!this.gameOver) {
        this.score += amount;
      }
    });
    this.onMessage("game:over", () => {
      this.gameOver = true;
    });
    this.onMessage("game:reset", () => {
      this.gameOver = false;
      this.score = 0;
    });
  }

  override render(canvas: CanvasController, _scene: Scene): void {
    const draw = canvas.getShapeDrawer();
    // Draw Score HUD
    draw.drawText("Score: " + this.score, 16, 26, "white", "18px", "left");
    if (!this.gameOver) return;

    // Draw Game Over HUD
    draw.drawText(
      "Game Over",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 18,
      "white",
      "30px",
      "center",
    );

    draw.drawText(
      "Press Space or Click to restart",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 16,
      "white",
      "15px",
      "center",
    );
  }
}
