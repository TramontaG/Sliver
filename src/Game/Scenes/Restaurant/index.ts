import { CanvasController, GameObject, Scene, Vector } from "sliver-engine";
import { gridCellSize } from "../../Definitions/Grid";
import { spawnCustomerGroupMessage } from "../../Messages/Restaurant";
import {
  Hero,
  Obstacle,
  Table,
  TileClickFeedback,
  RestaurantController,
  LamenEmpireButton,
} from "../../GameObjects";

class RestaurantBackground extends GameObject {
  constructor(position: Vector) {
    super("RestaurantBackground", position);
  }

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
    const { width, height } = canvas.getCanvas();
    canvas.getShapeDrawer().drawSprite("rest_1", 0, 0, width, height);
  }
}

export class GridOverlay extends GameObject {
  constructor() {
    super("GridOverlay", new Vector(0, 0));
    this.zIndex = 999;
  }

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);
    const { width, height } = canvas.getCanvas();
    const drawer = canvas.getShapeDrawer();
    const offset = scene.getOffset();

    for (let x = offset.x % gridCellSize; x <= width; x += gridCellSize) {
      drawer.drawLine(new Vector(x, 0), new Vector(x, height), 1, "#00c2ff");
    }

    for (let y = offset.y % gridCellSize; y <= height; y += gridCellSize) {
      drawer.drawLine(new Vector(0, y), new Vector(width, y), 1, "#00c2ff");
    }
  }
}

const restaurantScene = new Scene("Restaurant", "rgba(247, 231, 203, 1)");
restaurantScene.addGameObject(new RestaurantBackground(new Vector(0, 0)));
restaurantScene.addGameObject(new Hero(new Vector(48, 176)));
restaurantScene.addGameObject(new RestaurantController());
restaurantScene.addGameObject(
  new LamenEmpireButton(new Vector(110, 40), "Spawn Group", 2, () => {
    const count = Math.floor(Math.random() * 4) + 1;
    restaurantScene
      .getContext()
      ?.sendMessage(spawnCustomerGroupMessage, { count });
  })
);

const sofaSeatOffsets = [
  new Vector(-gridCellSize, -gridCellSize * 0.5),
  new Vector(-gridCellSize, gridCellSize * 0.5),
  new Vector(gridCellSize * 2, -gridCellSize * 0.5),
  new Vector(gridCellSize * 2, gridCellSize * 0.5),
];

const smallTableSeatOffsets = [
  new Vector(-gridCellSize * 0.5, gridCellSize * 0.5),
  new Vector(gridCellSize * 1.5, gridCellSize * 0.5),
];

// Sofas
restaurantScene.addGameObject(new Table(11, 6, 2, 5, sofaSeatOffsets));
restaurantScene.addGameObject(new Table(18, 6, 2, 5, sofaSeatOffsets));
restaurantScene.addGameObject(new Table(11, 12, 2, 5, sofaSeatOffsets));
restaurantScene.addGameObject(new Table(18, 12, 2, 5, sofaSeatOffsets));

// Table for two
restaurantScene.addGameObject(new Table(5, 7, 1, 1, smallTableSeatOffsets));
restaurantScene.addGameObject(new Table(5, 9, 1, 1, smallTableSeatOffsets));
restaurantScene.addGameObject(new Table(5, 11, 1, 1, smallTableSeatOffsets));
restaurantScene.addGameObject(new Table(5, 13, 1, 1, smallTableSeatOffsets));
restaurantScene.addGameObject(new Table(5, 15, 1, 1, smallTableSeatOffsets));

// Obstacles
restaurantScene.addGameObject(new Obstacle(9, 6, 1, 4));
restaurantScene.addGameObject(new Obstacle(9, 12, 1, 4));
restaurantScene.addGameObject(new Obstacle(14, 6, 1, 4));
restaurantScene.addGameObject(new Obstacle(14, 12, 1, 4));

restaurantScene.addGameObject(new Obstacle(16, 6, 1, 4));
restaurantScene.addGameObject(new Obstacle(16, 12, 1, 4));
restaurantScene.addGameObject(new Obstacle(21, 6, 1, 4));
restaurantScene.addGameObject(new Obstacle(21, 12, 1, 4));

// restaurantScene.addGameObject(new GridOverlay());
restaurantScene.addGameObject(new TileClickFeedback());

export { restaurantScene };
