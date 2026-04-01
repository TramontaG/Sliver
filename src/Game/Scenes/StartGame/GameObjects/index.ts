import { fadeTransition, Scene, Vector } from "sliver-engine";
import { LamenEmpireButton } from "../../../GameObjects";
import { defaultSaveLabel } from "../../../Definitions/Saves";

const startGameScene = new Scene("StartGame", "rgba(255,255,255,1)");

startGameScene.addGameObject(
  new LamenEmpireButton(new Vector(400, 300), "Start", 4, () => {
    const ctx = startGameScene.getContext();
    const game = ctx?.getGame();
    const existingSaves = game?.saves.list() ?? [];
    const hasDefaultSave = existingSaves.some(
      (save) => save?.label === defaultSaveLabel
    );
    const nextScene = hasDefaultSave ? "restaurantScene" : "introScene";
    ctx?.getSceneManager().transitionToScene(nextScene, fadeTransition(200));
  })
);

export { startGameScene };
