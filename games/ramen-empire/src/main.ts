import "./style.css";
import "./Game/Definitions/Sprites";
import { RamenEmpireGame } from "./Game";
import { loadEverything } from "./Game/LoadAssets";
import { canvasController } from "./Game/LoadAssets/LoadSprites";
import { soundLibrary } from "./Game/LoadAssets/LoadSounds";
import { createSceneManager } from "./Game/Scenes";
import { installBrowserTestApi, type BrowserTestApi } from "./Game/TestInstrumentation";

type AssetDefinitions = Awaited<ReturnType<typeof loadEverything>>;

declare global {
  interface Window {
    game: RamenEmpireGame;
    definitions: AssetDefinitions;
    __testApi?: BrowserTestApi;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root element");

const createGame = async () => {
  const definitions = await loadEverything();
  window.definitions = definitions;

  const game = new RamenEmpireGame({
    canvas: canvasController,
    soundManager: soundLibrary,
    scenes: createSceneManager(),
  });

  window.game = game;
  game.start();
  installBrowserTestApi(game, window);

  return game;
};

createGame().then((game) => {
  console.log("Game started:", game);
}).catch((error: unknown) => {
  console.error("Não foi possível iniciar o Ramen Empire:", error);
  const container = document.querySelector("#canvas-container") ?? app;
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.className = "startup-error";
  message.textContent = "Não foi possível iniciar o Ramen Empire. " +
    (error instanceof Error ? error.message : String(error));
  container.replaceChildren(message);
});
