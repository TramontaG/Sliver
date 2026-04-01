import { Vector } from "sliver-engine";

const gridCellSize = 32;

const gridToCenter = (col: number, row: number) => {
  return new Vector(
    col * gridCellSize + gridCellSize / 2,
    row * gridCellSize + gridCellSize / 2
  );
};

const gridRectToCenter = (
  col: number,
  row: number,
  widthCells: number,
  heightCells: number
) => {
  return gridToCenter(col + widthCells / 2, row + heightCells / 2);
};

export { gridCellSize, gridToCenter, gridRectToCenter };
