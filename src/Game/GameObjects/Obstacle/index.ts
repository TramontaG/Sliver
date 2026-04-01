import { GameObject, SquareHitbox, Vector } from "sliver-engine";
import { gridCellSize, gridRectToCenter } from "../../Definitions/Grid";

class Obstacle extends GameObject {
  constructor(
    gridColumn: number,
    gridRow: number,
    widthCells: number,
    heightCells: number
  ) {
    const center = gridRectToCenter(
      gridColumn,
      gridRow,
      widthCells,
      heightCells
    );
    super("Obstacle", center);
    const size = new Vector(
      widthCells * gridCellSize,
      heightCells * gridCellSize
    );
    this.addHitbox(
      new SquareHitbox(
        size.toMultiplied(-0.5).toAdded(new Vector(16, 16)),
        size,
        this,
        {
          solid: true,
          // debug: true,
        }
      )
    );
  }
}

export { Obstacle };
