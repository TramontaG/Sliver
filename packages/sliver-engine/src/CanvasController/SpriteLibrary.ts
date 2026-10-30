import { Vector } from "../Lib/Vector";

type SpriteDefinition =
  | {
      kind: "rect";
      sheetName: string;
      topLeft: Vector;
      bottomRight: Vector;
    }
  | {
      kind: "indexes";
      sheetName: string;
      indexes: (number | null)[][];
    };

type SpriteBitmapEntry = {
  bitmap: ImageBitmap | HTMLCanvasElement;
  size: Vector;
};

type SpriteManifest = {
  sprites: Record<string, SpriteManifestEntry>;
};

type SpriteManifestEntry = {
  sheet: string;
  rect?: {
    mode?: "grid" | "id";
    from: [number, number] | number;
    to: [number, number] | number;
  };
  grid?: {
    mode?: "grid" | "id";
    tiles: (number | null | [number, number])[][];
  };
};

const isDrawable2DContext = (
  context: RenderingContext | OffscreenCanvasRenderingContext2D | null
): context is CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D =>
  !!context && "drawImage" in context;

class SpriteLibrary {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private spriteSheets: Map<
    string,
    {
      image: HTMLImageElement;
      frameWidth: number;
      frameHeight: number;
      columns: number;
    }
  > = new Map();
  private spriteDefinitions: Map<string, SpriteDefinition> = new Map();
  private spriteDefinitionBitmaps: Map<string, SpriteBitmapEntry> = new Map();

  async loadSprite(name: string, url: URL): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(name, img);
        resolve();
      };
      img.onerror = reject;
      img.src = url.toString();
    });
  }

  async loadSvgSprite(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(name, img);
        resolve();
      };
      img.onerror = reject;

      fetch(url)
        .then((response) => response.text())
        .then((svgText) => {
          const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
          const url = URL.createObjectURL(svgBlob);
          img.src = url;
        })
        .catch(reject);
    });
  }

  /**
   * Load a fixed size sprite sheet
   */
  async loadSpriteSheet(
    name: string,
    url: URL,
    frameWidth: number,
    frameHeight: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const columns = Math.floor(img.width / frameWidth);

        this.spriteSheets.set(name, {
          image: img,
          frameWidth,
          frameHeight,
          columns,
        });

        resolve();
      };
      img.onerror = reject;
      img.src = url.toString();
    });
  }

  getSprite(name: string): HTMLImageElement | undefined {
    return this.sprites.get(name);
  }

  async loadSpriteDefinitionsFromJson(url: URL): Promise<void> {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Failed to load sprite manifest "${url.toString()}": ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as unknown;
    this.loadSpriteDefinitions(payload);
  }

  loadSpriteDefinitions(payload: unknown): void {
    const manifest = this.validateSpriteManifest(payload);

    Object.entries(manifest.sprites).forEach(([name, entry]) => {
      this.loadSpriteManifestEntry(name, entry);
    });
  }

  defineSpriteFromSheet(
    name: string,
    sheetName: string,
    topLeft: Vector,
    bottomRight: Vector
  ): void {
    this.ensureSpriteNameAvailable(name);
    this.spriteDefinitions.set(name, {
      kind: "rect",
      sheetName,
      topLeft: topLeft.clone(),
      bottomRight: bottomRight.clone(),
    });
  }

  defineSpriteFromSheetIndexes(
    name: string,
    sheetName: string,
    indexes: (number | null)[][]
  ): void {
    this.ensureSpriteNameAvailable(name);
    const clonedIndexes = indexes.map((row) => row.slice());
    this.spriteDefinitions.set(name, {
      kind: "indexes",
      sheetName,
      indexes: clonedIndexes,
    });
    const sheet = this.spriteSheets.get(sheetName);
    if (sheet) {
      this.bakeSpriteDefinitionBitmap(
        name,
        {
          kind: "indexes",
          sheetName,
          indexes: clonedIndexes,
        },
        sheet
      );
    }
  }

  getSpriteDefinition(name: string): SpriteDefinition | null {
    const definition = this.spriteDefinitions.get(name);
    if (!definition) return null;
    if (definition.kind === "rect") {
      return {
        kind: "rect",
        sheetName: definition.sheetName,
        topLeft: definition.topLeft.clone(),
        bottomRight: definition.bottomRight.clone(),
      };
    }
    return {
      kind: "indexes",
      sheetName: definition.sheetName,
      indexes: definition.indexes.map((row) => row.slice()),
    };
  }

  getSpriteSheetFrameSize(
    sheetName: string
  ): { frameWidth: number; frameHeight: number } | null {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) return null;
    return { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight };
  }

  /**
   * Render a named sprite defined from a sprite sheet selection.
   */
  drawSpriteDefinition(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    position: Vector,
    scale = 1,
    mirrorHorizontal = false,
    mirrorVertical = false
  ): void {
    const definition = this.spriteDefinitions.get(spriteName);
    if (!definition) return;

    const sheet = this.spriteSheets.get(definition.sheetName);
    if (!sheet) return;

    const { image, frameWidth, frameHeight } = sheet;

    if (definition.kind === "rect") {
      const startCol = Math.min(definition.topLeft.x, definition.bottomRight.x);
      const startRow = Math.min(definition.topLeft.y, definition.bottomRight.y);
      const endCol = Math.max(definition.topLeft.x, definition.bottomRight.x);
      const endRow = Math.max(definition.topLeft.y, definition.bottomRight.y);

      const spriteWidth = (endCol - startCol + 1) * frameWidth;
      const spriteHeight = (endRow - startRow + 1) * frameHeight;

      const sx = startCol * frameWidth;
      const sy = startRow * frameHeight;

      ctx.imageSmoothingEnabled = false;

      ctx.save();

      if (mirrorHorizontal || mirrorVertical) {
        const centerX = position.x + (spriteWidth * scale) / 2;
        const centerY = position.y + (spriteHeight * scale) / 2;

        ctx.translate(centerX, centerY);

        if (mirrorHorizontal) {
          ctx.scale(-1, 1);
        }
        if (mirrorVertical) {
          ctx.scale(1, -1);
        }

        ctx.translate(-centerX, -centerY);
      }

      ctx.drawImage(
        image,
        sx,
        sy,
        spriteWidth,
        spriteHeight,
        position.x,
        position.y,
        spriteWidth * scale,
        spriteHeight * scale
      );

      ctx.restore();
      return;
    }

    const rowCount = definition.indexes.length;
    const columnCount = Math.max(
      0,
      ...definition.indexes.map((row) => row.length)
    );

    const spriteWidth = columnCount * frameWidth;
    const spriteHeight = rowCount * frameHeight;

    ctx.imageSmoothingEnabled = false;

    ctx.save();

    if (mirrorHorizontal || mirrorVertical) {
      const centerX = position.x + (spriteWidth * scale) / 2;
      const centerY = position.y + (spriteHeight * scale) / 2;

      ctx.translate(centerX, centerY);

      if (mirrorHorizontal) {
        ctx.scale(-1, 1);
      }
      if (mirrorVertical) {
        ctx.scale(1, -1);
      }

      ctx.translate(-centerX, -centerY);
    }

    const baked = this.spriteDefinitionBitmaps.get(spriteName);
    if (baked) {
      ctx.drawImage(
        baked.bitmap,
        position.x,
        position.y,
        baked.size.x * scale,
        baked.size.y * scale
      );
      ctx.restore();
      return;
    }

    this.bakeSpriteDefinitionBitmap(spriteName, definition, sheet);

    const bakedAfter = this.spriteDefinitionBitmaps.get(spriteName);
    if (bakedAfter) {
      ctx.drawImage(
        bakedAfter.bitmap,
        position.x,
        position.y,
        bakedAfter.size.x * scale,
        bakedAfter.size.y * scale
      );
      ctx.restore();
      return;
    }

    definition.indexes.forEach((row, rowIndex) => {
      row.forEach((index, colIndex) => {
        if (index === null || index < 0) return;
        const sx = (index % sheet.columns) * frameWidth;
        const sy = Math.floor(index / sheet.columns) * frameHeight;
        ctx.drawImage(
          image,
          sx,
          sy,
          frameWidth,
          frameHeight,
          position.x + colIndex * frameWidth * scale,
          position.y + rowIndex * frameHeight * scale,
          frameWidth * scale,
          frameHeight * scale
        );
      });
    });

    ctx.restore();
  }

  private ensureSpriteNameAvailable(name: string): void {
    if (this.sprites.has(name) || this.spriteDefinitions.has(name)) {
      throw new Error(`Sprite name "${name}" is already in use.`);
    }
  }

  private bakeSpriteDefinitionBitmap(
    name: string,
    definition: Extract<SpriteDefinition, { kind: "indexes" }>,
    sheet: {
      image: HTMLImageElement;
      frameWidth: number;
      frameHeight: number;
      columns: number;
    }
  ): void {
    if (this.spriteDefinitionBitmaps.has(name)) return;

    const rowCount = definition.indexes.length;
    const columnCount = Math.max(
      0,
      ...definition.indexes.map((row) => row.length)
    );

    if (rowCount <= 1 && columnCount <= 1) return;

    const width = columnCount * sheet.frameWidth;
    const height = rowCount * sheet.frameHeight;

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : document.createElement("canvas");

    if (!(canvas instanceof OffscreenCanvas)) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d");
    if (!isDrawable2DContext(context)) return;

    context.imageSmoothingEnabled = false;

    definition.indexes.forEach((row, rowIndex) => {
      row.forEach((index, colIndex) => {
        if (index === null || index < 0) return;
        const sx = (index % sheet.columns) * sheet.frameWidth;
        const sy = Math.floor(index / sheet.columns) * sheet.frameHeight;
        context.drawImage(
          sheet.image,
          sx,
          sy,
          sheet.frameWidth,
          sheet.frameHeight,
          colIndex * sheet.frameWidth,
          rowIndex * sheet.frameHeight,
          sheet.frameWidth,
          sheet.frameHeight
        );
      });
    });

    if (
      canvas instanceof OffscreenCanvas &&
      "transferToImageBitmap" in canvas
    ) {
      const bitmap = canvas.transferToImageBitmap();
      this.spriteDefinitionBitmaps.set(name, {
        bitmap,
        size: new Vector(width, height),
      });
      return;
    }

    this.spriteDefinitionBitmaps.set(name, {
      bitmap: canvas as HTMLCanvasElement,
      size: new Vector(width, height),
    });
  }

  private validateSpriteManifest(payload: unknown): SpriteManifest {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Sprite manifest must be an object.");
    }

    const sprites = (payload as SpriteManifest).sprites;
    if (!sprites || typeof sprites !== "object" || Array.isArray(sprites)) {
      throw new Error("Sprite manifest must include a 'sprites' object.");
    }

    return { sprites };
  }

  private loadSpriteManifestEntry(name: string, entry: SpriteManifestEntry): void {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Sprite "${name}" must be an object.`);
    }

    if (!entry.sheet || typeof entry.sheet !== "string") {
      throw new Error(`Sprite "${name}" must define a sheet name.`);
    }

    const hasRect = !!entry.rect;
    const hasGrid = !!entry.grid;
    if (hasRect === hasGrid) {
      throw new Error(`Sprite "${name}" must define exactly one of rect or grid.`);
    }

    if (entry.rect) {
      const mode = entry.rect.mode ?? "grid";
      if (mode !== "grid" && mode !== "id") {
        throw new Error(`Sprite "${name}" rect mode must be "grid" or "id".`);
      }

      if (mode === "grid") {
        const from = this.parseGridPoint(entry.rect.from, name, "rect.from");
        const to = this.parseGridPoint(entry.rect.to, name, "rect.to");
        this.defineSpriteFromSheet(
          name,
          entry.sheet,
          new Vector(from[0], from[1]),
          new Vector(to[0], to[1])
        );
        return;
      }

      const fromId = this.parseTileId(entry.rect.from, name, "rect.from");
      const toId = this.parseTileId(entry.rect.to, name, "rect.to");
      const sheet = this.requireSpriteSheet(entry.sheet, name);
      const from = this.tileIdToGrid(sheet.columns, fromId);
      const to = this.tileIdToGrid(sheet.columns, toId);
      this.defineSpriteFromSheet(
        name,
        entry.sheet,
        new Vector(from[0], from[1]),
        new Vector(to[0], to[1])
      );
      return;
    }

    if (!entry.grid) return;
    const mode = entry.grid.mode ?? "id";
    if (mode !== "grid" && mode !== "id") {
      throw new Error(`Sprite "${name}" grid mode must be "grid" or "id".`);
    }

    if (!Array.isArray(entry.grid.tiles)) {
      throw new Error(`Sprite "${name}" grid tiles must be a 2D array.`);
    }

    if (mode === "id") {
      const tiles = entry.grid.tiles.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
          throw new Error(
            `Sprite "${name}" grid row ${rowIndex} must be an array.`
          );
        }
        return row.map((tile, colIndex) =>
          this.parseTileIdOrNull(tile, name, `grid.tiles[${rowIndex}][${colIndex}]`)
        );
      });
      this.defineSpriteFromSheetIndexes(name, entry.sheet, tiles);
      return;
    }

    const sheet = this.requireSpriteSheet(entry.sheet, name);
    const tiles = entry.grid.tiles.map((row, rowIndex) => {
      if (!Array.isArray(row)) {
        throw new Error(
          `Sprite "${name}" grid row ${rowIndex} must be an array.`
        );
      }
      return row.map((tile, colIndex) => {
        if (tile === null) return null;
        const point = this.parseGridPoint(
          tile,
          name,
          `grid.tiles[${rowIndex}][${colIndex}]`
        );
        return this.gridToTileId(sheet.columns, point[0], point[1]);
      });
    });
    this.defineSpriteFromSheetIndexes(name, entry.sheet, tiles);
  }

  private requireSpriteSheet(
    sheetName: string,
    spriteName: string
  ): {
    image: HTMLImageElement;
    frameWidth: number;
    frameHeight: number;
    columns: number;
  } {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) {
      throw new Error(
        `Sprite "${spriteName}" references missing spritesheet "${sheetName}".`
      );
    }
    return sheet;
  }

  private parseGridPoint(
    value: [number, number] | number,
    spriteName: string,
    fieldName: string
  ): [number, number] {
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return [value[0], value[1]];
    }
    throw new Error(`Sprite "${spriteName}" ${fieldName} must be [col, row].`);
  }

  private parseTileId(
    value: [number, number] | number,
    spriteName: string,
    fieldName: string
  ): number {
    if (typeof value === "number") {
      return value;
    }
    throw new Error(`Sprite "${spriteName}" ${fieldName} must be a tile id.`);
  }

  private parseTileIdOrNull(
    value: number | null | [number, number],
    spriteName: string,
    fieldName: string
  ): number | null {
    if (value === null) return null;
    if (typeof value === "number") return value;
    throw new Error(`Sprite "${spriteName}" ${fieldName} must be a tile id.`);
  }

  private tileIdToGrid(columns: number, id: number): [number, number] {
    return [id % columns, Math.floor(id / columns)];
  }

  private gridToTileId(columns: number, col: number, row: number): number {
    return row * columns + col;
  }

  /**
   * Render the sprite frame by its index in the sheet
   * Indexes grow from left to right, top to bottom
   */
  drawSpriteFrame(
    ctx: CanvasRenderingContext2D,
    sheetName: string,
    index: number,
    position: Vector,
    scale = 1,
    mirrorHorizontal = false,
    mirrorVertical = false
  ): void {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) return;

    const { image, frameWidth, frameHeight, columns } = sheet;

    const sx = (index % columns) * frameWidth;
    const sy = Math.floor(index / columns) * frameHeight;

    ctx.imageSmoothingEnabled = false; // nearest neighbor

    // Save the current context state
    ctx.save();

    // Apply transformations if needed
    if (mirrorHorizontal || mirrorVertical) {
      // Calculate the center of the sprite
      const centerX = position.x + (frameWidth * scale) / 2;
      const centerY = position.y + (frameHeight * scale) / 2;

      // Translate to the center of the sprite
      ctx.translate(centerX, centerY);

      // Apply mirroring
      if (mirrorHorizontal) {
        ctx.scale(-1, 1);
      }
      if (mirrorVertical) {
        ctx.scale(1, -1);
      }

      // Translate back to the original position
      ctx.translate(-centerX, -centerY);
    }

    // Draw the image with the applied transformations
    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      position.x,
      position.y,
      frameWidth * scale,
      frameHeight * scale
    );

    // Restore the context state
    ctx.restore();
  }

  /**
   * Render a specific cell from the sprite sheet grid
   */
  drawSpriteGrid(
    ctx: CanvasRenderingContext2D,
    sheetName: string,
    col: number,
    row: number,
    position: Vector,
    scale = 1
  ): void {
    const sheet = this.spriteSheets.get(sheetName);
    if (!sheet) return;

    const { image, frameWidth, frameHeight } = sheet;

    const sx = col * frameWidth;
    const sy = row * frameHeight;

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      position.x,
      position.y,
      frameWidth * scale,
      frameHeight * scale
    );
  }
}

export { SpriteLibrary };
