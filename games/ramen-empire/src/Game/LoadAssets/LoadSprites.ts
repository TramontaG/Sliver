import { CanvasController, type SpriteLibrary } from "sliver-engine";
import {
  createFaceAnimation,
  createSpriteManifest,
  createSpriteAnimation,
  createUIspriteAnimation,
  faceSpritesheetSize,
  interiorSpritesheetSize,
  spriteSize,
} from "../Definitions/Sprites";

// Dynamically import all paid assets from the Paid/People directory
const people = import.meta.glob<string>(
  "../Assets/Paid/People/*.{png,jpg,jpeg,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

const ui = import.meta.glob<string>(
  "../Assets/Paid/UI/*.{png,jpg,jpeg,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

const interiors = import.meta.glob<string>(
  "../Assets/Paid/Interiors/*.{png,jpg,jpeg,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

const getFileBaseName = (path: string) => {
  const fileName = path.split("/").pop() ?? path;
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
};

const loadSprites = async (library: SpriteLibrary) => {
  const requiredSprites = [
    [people, "Hero", "People/Hero"],
    [ui, "Button", "UI/Button"],
    [interiors, "rest_1", "Interiors/rest_1"],
    [interiors, "Interiors_16x16", "Interiors/Interiors_16x16"],
  ] as const;
  const missing = requiredSprites
    .filter(([assets, name]) =>
      !Object.keys(assets).some((path) => getFileBaseName(path) === name)
    )
    .map(([, , path]) => path);

  if (missing.length > 0) {
    throw new Error(
      "Assets privados ausentes: " + missing.join(", ") + ". " +
      "Restaure os arquivos originais nas pastas People, UI, Interiors e Sounds " +
      "em games/ramen-empire/src/Game/Assets/Paid/ e recarregue a página. " +
      "Esses arquivos não estão incluídos no Git."
    );
  }

  const names = await Promise.all(
    Object.entries(people).map(async ([path, url]) => {
      const name = getFileBaseName(path);
      const assetUrl = new URL(url, window.location.origin);
      const [frameWidth, frameHeight] = name.startsWith("face:")
        ? faceSpritesheetSize
        : spriteSize;

      await library.loadSpriteSheet(name, assetUrl, frameWidth, frameHeight);

      return name;
    })
  );

  const _ui = await Promise.all(
    Object.entries(ui).map(async ([path, url]) => {
      const name = getFileBaseName(path);
      const sheetName = `ui:${name}`;
      const assetUrl = new URL(url, window.location.origin);
      const [frameWidth, frameHeight] = [64, 32];

      await library.loadSpriteSheet(
        sheetName,
        assetUrl,
        frameWidth,
        frameHeight
      );

      return sheetName;
    })
  );

  const _interiors = await Promise.all(
    Object.entries(interiors).map(async ([path, url]) => {
      const name = getFileBaseName(path);
      const assetUrl = new URL(url, window.location.origin);
      if (name === "rest_1") {
        await library.loadSprite(name, assetUrl);
        return name;
      }

      const sheetName = name === "Interiors_16x16" ? "interiors" : name;
      const [frameWidth, frameHeight] = interiorSpritesheetSize;

      await library.loadSpriteSheet(
        sheetName,
        assetUrl,
        frameWidth,
        frameHeight
      );

      return sheetName;
    })
  );

  const peopleSheets = names.filter((name) => !name.startsWith("face:"));
  library.loadSpriteDefinitions(createSpriteManifest(peopleSheets));

  return [...names, ..._ui, ..._interiors].reduce(
    (acc, name) => {
      if (name.startsWith("ui:")) {
        acc.ui[name] = createUIspriteAnimation(name);
      }

      if (name.startsWith("face:")) {
        acc.faces[name] = createFaceAnimation();
      }

      if (name.startsWith("interior:")) {
        acc.interiors[name] = name;
      }

      return acc;
    },
    {
      ui: {},
      people: {},
      faces: {},
      interiors: {},
    } as {
      ui: Record<string, ReturnType<typeof createUIspriteAnimation>>;
      people: Record<string, ReturnType<typeof createSpriteAnimation>>;
      faces: Record<string, ReturnType<typeof createFaceAnimation>>;
      interiors: Record<string, string>;
    }
  );
};

const canvasController = new CanvasController(800, 600);
const spriteLibrary = canvasController.getSpriteLibrary();

export { spriteLibrary, canvasController, loadSprites };
