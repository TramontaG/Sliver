import {
  GameObject,
  Vector,
  type CanvasController,
  type GameEvent,
  type Scene,
} from "sliver-engine";
import { gridCellSize } from "../../Definitions/Grid";

type TileKey = string;

const tileKey = (col: number, row: number): TileKey => `${col},${row}`;

class TileClickFeedback extends GameObject {
  private alphaByTile = new Map<TileKey, number>();
  private readonly fadePerSecond = 1.2;

  constructor() {
    super("TileClickFeedback", new Vector(0, 0));
    this.zIndex = 1000;
  }

  override tick(): void {
    super.tick();
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    const dt = 1 / ctx.getTickRate();
    const decay = this.fadePerSecond * dt;

    for (const [key, alpha] of this.alphaByTile.entries()) {
      const next = Math.max(0, alpha - decay);
      if (next <= 0) {
        this.alphaByTile.delete(key);
      } else {
        this.alphaByTile.set(key, next);
      }
    }
  }

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
    const drawer = canvas.getShapeDrawer();
    const offset = scene.getOffset();

    for (const [key, alpha] of this.alphaByTile.entries()) {
      const [colRaw, rowRaw] = key.split(",");
      const col = Number(colRaw);
      const row = Number(rowRaw);
      const x = col * gridCellSize + offset.x;
      const y = row * gridCellSize + offset.y;
      drawer.drawRectangle(
        x,
        y,
        gridCellSize,
        gridCellSize,
        `rgba(255, 214, 0, ${alpha})`,
        false
      );
    }
  }

  override handleEvent(event: GameEvent): void {
    if (event.type === "mouseButtonPressed" && event.button === 0) {
      const offset = this.scene?.getOffset() ?? Vector.zero();
      const worldX = event.x - offset.x;
      const worldY = event.y - offset.y;
      const col = Math.floor(worldX / gridCellSize);
      const row = Math.floor(worldY / gridCellSize);
      this.alphaByTile.set(tileKey(col, row), 1);
    }
    super.handleEvent(event);
  }
}

export { TileClickFeedback };
