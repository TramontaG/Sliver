import { GameObject } from "..";
import { renderChevron, shapeWithParams } from "../../Assets/Shapes/Arrow";
import { withRotation } from "../../CanvasController/Transformations";
import type { GameEvent } from "../../Events";
import { onChildrenEvents } from "../../Events/decorators";
import type { Scene } from "../../Scenes";
import { Vector } from "../../Lib/Vector";
import { ClickableShape } from "./Clickableshape";
import { Group } from "./Group";
import { HoverableShape } from "./HoverableShape";

const createSceneTranslatorGameObject = (scene: Scene) =>
  new Group("ArrowGroup", [
    new HoverableShape(
      new Vector(750, 300),
      new Vector(50, 50),
      withRotation(
        0,
        shapeWithParams(renderChevron, {
          color: "purple",
          strokeWidth: 6,
          lineCap: "round",
          lineJoin: "round",
        })
      ),
      (obj) => {
        obj
          .getMotherShip()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(10, 0));
      },
      (obj) => {
        obj
          .getMotherShip()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, 0));
      }
    ),
    new HoverableShape(
      new Vector(400, 550),
      new Vector(50, 50),
      withRotation(
        Math.PI / 2,
        shapeWithParams(renderChevron, {
          color: "purple",
          strokeWidth: 6,
          lineCap: "round",
          lineJoin: "round",
        })
      ),
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, 10));
      },
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, 0));
      }
    ),
    new HoverableShape(
      new Vector(400, 0),
      new Vector(50, 50),
      withRotation(
        3 * (Math.PI / 2),
        shapeWithParams(renderChevron, {
          color: "purple",
          strokeWidth: 6,
          lineCap: "round",
          lineJoin: "round",
        })
      ),
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, -10));
      },
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, 0));
      }
    ),
    new HoverableShape(
      new Vector(0, 300),
      new Vector(50, 50),
      withRotation(
        Math.PI,
        shapeWithParams(renderChevron, {
          color: "purple",
          strokeWidth: 6,
          lineCap: "round",
          lineJoin: "round",
        })
      ),
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(-10, 0));
      },
      (obj) => {
        obj
          .getMotherShip<SceneTranslator>()!
          .getMotherShip<SceneTranslator>()!
          .setTranslationVector(new Vector(0, 0));
      }
    ),
  ]);

class SceneTranslator extends GameObject {
  private translationVector: Vector = Vector.zero();
  private translateScene: Scene | null = null;

  constructor(scene: Scene) {
    super("SceneTranslator", new Vector(0, 0));
    this.addChild(createSceneTranslatorGameObject(scene));
    this.translateScene = scene;
  }

  override tick(): void {
    console.log(this.translateScene);
    this.translateScene
      ?.getOffset()
      .add(new Vector(this.translationVector.x, this.translationVector.y));
  }

  setTranslationVector(translation: Vector): void {
    this.translationVector = translation;
  }

  @onChildrenEvents<SceneTranslator>()
  override handleEvent(event: GameEvent): void {}
}

export { SceneTranslator };
