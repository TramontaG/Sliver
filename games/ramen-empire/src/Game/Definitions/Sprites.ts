type SpriteManifest = {
  sprites: Record<string, SpriteManifestEntry>;
};

type SpriteManifestRectEntry = {
  sheet: string;
  rect: {
    from: [number, number] | number;
    to: [number, number] | number;
    mode: "grid" | "id";
  };
};

type SpriteManifestGridEntry = {
  sheet: string;
  grid: {
    tiles: (number | null | [number, number])[][];
    mode: "grid" | "id";
  };
};

type SpriteManifestEntry = SpriteManifestGridEntry | SpriteManifestRectEntry;

const adultSheetColumns = 56;
const kidSheetColumns = 24;
const peopleFrameTileHeight = 2;

const idleKidFrames = {
  right: [24, 25, 26, 27, 28, 29],
  up: [30, 31, 32, 33, 34, 35],
  left: [36, 37, 38, 39, 40, 41],
  down: [42, 43, 44, 45, 46, 47],
};

const walkKidFrames = {
  right: [48, 49, 50, 51, 52, 53],
  up: [54, 55, 56, 57, 58, 59],
  left: [60, 61, 62, 63, 64, 65],
  down: [66, 67, 68, 69, 70, 71],
};

const idleAdultFrames = {
  right: [
    [112, 168],
    [113, 169],
    [114, 170],
    [115, 171],
    [116, 172],
    [117, 173],
  ],
  up: [
    [118, 174],
    [119, 175],
    [120, 176],
    [121, 177],
    [122, 178],
    [123, 179],
  ],
  left: [
    [124, 180],
    [125, 181],
    [126, 182],
    [127, 183],
    [128, 184],
    [129, 185],
  ],
  down: [
    [130, 186],
    [131, 187],
    [132, 188],
    [133, 189],
    [134, 190],
    [135, 191],
  ],
};

const walkAdultFrames = {
  right: [
    [224, 280],
    [225, 281],
    [226, 282],
    [227, 283],
    [228, 284],
    [229, 285],
  ],
  up: [
    [230, 286],
    [231, 287],
    [232, 288],
    [233, 289],
    [234, 290],
    [235, 291],
  ],
  left: [
    [236, 292],
    [237, 293],
    [238, 294],
    [239, 295],
    [240, 296],
    [241, 297],
  ],
  down: [
    [242, 298],
    [243, 299],
    [244, 300],
    [245, 301],
    [246, 302],
    [247, 303],
  ],
};

export const createSpriteAnimation = (name: string) => {
  if (name.toLowerCase().startsWith("kid")) {
    return {
      idle: idleKidFrames,
      walk: walkKidFrames,
    };
  }

  if (name.startsWith("ui:")) {
    return {
      primary: [0, 1],
      secondary: [2, 3],
      tertiary: [4, 5],
    };
  }

  return {
    idle: idleAdultFrames,
    walk: walkAdultFrames,
  };
};

export const createFaceAnimation = () => {
  return {
    talking: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    yes: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    no: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  };
};

export const createUIspriteAnimation = (name: string) => {
  if (!name.startsWith("ui:")) {
    throw new Error(
      `createUIspriteAnimation expects a ui:* name, got: ${name}`
    );
  }

  return {
    primary: [0, 1],
    secondary: [2, 3],
    tertiary: [4, 5],
  };
};

export const createSpriteManifest = (
  peopleSheets: string[]
): SpriteManifest => {
  const directions = ["right", "up", "left", "down"] as const;
  const getPeopleSheetColumns = (sheetName: string) =>
    sheetName.toLowerCase().startsWith("kid")
      ? kidSheetColumns
      : adultSheetColumns;
  const buildFrameTiles = (frameId: number, columns: number) => {
    const tiles = [[frameId]];
    for (let row = 1; row < peopleFrameTileHeight; row += 1) {
      tiles.push([frameId + columns * row]);
    }
    return tiles;
  };
  const normalizeFrameTiles = (
    frame: number | [number, number],
    columns: number
  ) => {
    if (Array.isArray(frame)) {
      return frame.map((tileId) => [tileId]);
    }
    return buildFrameTiles(frame, columns);
  };
  const sprites: Record<string, SpriteManifestEntry> = {
    "ui:Button:primary": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[0]] },
    },
    "ui:Button:primary:hover": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[1]] },
    },
    "ui:Button:secondary": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[2]] },
    },
    "ui:Button:secondary:hover": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[3]] },
    },
    "ui:Button:tertiary": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[4]] },
    },
    "ui:Button:tertiary:hover": {
      sheet: "ui:Button",
      grid: { mode: "id", tiles: [[5]] },
    },
  };

  peopleSheets.forEach((sheetName) => {
    const animations = createSpriteAnimation(sheetName);
    const addFrames = (
      state: "idle" | "walk",
      direction: (typeof directions)[number],
      frames: Array<number | [number, number]>
    ) => {
      frames.forEach((frameId, index) => {
        const key = `people:${sheetName}:${state}:${direction}:${index}`;
        const columns = getPeopleSheetColumns(sheetName);
        sprites[key] = {
          sheet: sheetName,
          grid: { mode: "id", tiles: normalizeFrameTiles(frameId, columns) },
        };
      });
    };

    directions.forEach((direction) => {
      // @ts-ignore
      addFrames("idle", direction, animations.idle![direction]);
      // @ts-ignore
      addFrames("walk", direction, animations.walk![direction]);
    });
  });

  return { sprites };
};

export const spriteSize = [16, 16] as const;
export const interiorSpritesheetSize = [16, 16] as const;
export const kidSpritesheetSize = [16, 32] as const;
export const adultSpritesheetSize = [16, 32] as const;
export const faceSpritesheetSize = [32, 32] as const;
