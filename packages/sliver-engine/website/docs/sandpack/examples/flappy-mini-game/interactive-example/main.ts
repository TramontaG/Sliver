import {
  CanvasController,
  Game,
  Scene,
  SceneManager,
  SoundManager,
  Vector,
} from "sliver-engine";
import { Bird } from "./Bird";
import { PipeSpawner } from "./PipeSpawner";
import { ScoreHud } from "./ScoreHud";
import { BIRD_START, CANVAS_HEIGHT, CANVAS_WIDTH, GRAVITY } from "./constants";
import { Ceiling, Ground } from "./WorldBoundaries";

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);

// Those shennenigans should be done with CSS
const canvasElement = canvas.getCanvas();
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvasElement.style.width = "100%";
canvasElement.style.maxWidth = CANVAS_WIDTH + "px";
canvasElement.style.height = "auto";
canvasElement.style.aspectRatio = CANVAS_WIDTH + " / " + CANVAS_HEIGHT;
canvasElement.style.display = "block";
canvasElement.style.margin = "0 auto";

// Create a scene with gravity
const mainScene = new Scene("flappy-demo", "#0b1a2e");
mainScene.setGravity(new Vector(0, GRAVITY));

// Intantiate the game objects
const bird = new Bird(BIRD_START.clone());
const spawner = new PipeSpawner(bird);
const hud = new ScoreHud();
const ground = new Ground();
const ceiling = new Ceiling();

// Add the gameObjects to the Main Scene
mainScene.addGameObject([bird, spawner, ground, ceiling, hud]);

// Instantiate the game
const scenes = new SceneManager({ main: mainScene }, mainScene);
const game = new Game({
  canvas,
  scenes,
  soundManager: new SoundManager(),
  ticksPerSecond: 60,
});

game.start();
