import { Scene } from "sliver-engine";
import { runIntroCutscene } from "./ScriptedEvents";

class IntroScene extends Scene {
  override setup(): void {
    super.setup();
    runIntroCutscene(this.getContext()!);
  }
}

const createIntroScene = () => {
  return new IntroScene("IntroCutscene", "rgba(255, 0, 255 ,1)");
};

const introScene = createIntroScene();

export { introScene };
