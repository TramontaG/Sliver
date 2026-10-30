import { SceneManager } from "sliver-engine";
import { startGameScene } from "./StartGame/GameObjects";
import { introScene } from "./IntroCutscene";
import { restaurantScene } from "./Restaurant";

const createScenes = () => {
  return [
    { startGameScene, introScene, restaurantScene },
    restaurantScene,
  ] as const;
};

const createSceneManager = () => {
  const [scenes, initialScene] = createScenes();

  return new SceneManager(scenes, initialScene);
};

export { createSceneManager };
