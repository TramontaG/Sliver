import type { Vector } from "../Lib/Vector";
import { SpriteLibrary } from "./SpriteLibrary";

type DrawTextOptions = {
  /**
   * If provided, wraps the text to fit within this max width (in pixels).
   * When omitted, no wrapping is applied.
   */
  wrapText?: number;
  /**
   * Line height in pixels, used when wrapping is enabled.
   * Defaults to `Math.ceil(fontSizePx * 1.3)`.
   */
  lineHeight?: number;
  /**
   * Maximum lines to render when wrapping is enabled.
   * Defaults to unlimited.
   */
  maxLines?: number;
  /**
   * Optional text baseline override for this call.
   */
  baseline?: CanvasTextBaseline;
};

const DEFAULT_STROKE_WIDTH = 2;

class ShapeDrawer {
  private defaultFont: string = "Arial";

  constructor(
    private context: CanvasRenderingContext2D,
    private spriteLibrary: SpriteLibrary
  ) {}

  /**
   * Executes drawing instructions with a temporary alpha multiplier.
   */
  withOpacity(opacity: number, draw: () => void): void {
    if (opacity >= 1) {
      draw();
      return;
    }

    this.context.save();
    this.context.globalAlpha *= opacity;
    draw();
    this.context.restore();
  }

  /**
   * Draws a rectangle on the canvas with configurable fill/stroke behavior.
   *
   * @param x - The x-coordinate of the rectangle's top-left corner
   * @param y - The y-coordinate of the rectangle's top-left corner
   * @param width - The width of the rectangle
   * @param height - The height of the rectangle
   * @param color - The color to use for filling or stroking (default: "black")
   * @param filled - If true, fills the rectangle; if false, strokes the outline (default: true)
   * @param opacity - Alpha multiplier applied while drawing (default: 1)
   *
   * @example
   * // Draw a filled red rectangle
   * shapeDrawer.drawRectangle(10, 10, 100, 50, "red", true);
   *
   * @example
   * // Draw a blue rectangle outline
   * shapeDrawer.drawRectangle(10, 10, 100, 50, "blue", false);
   */
  drawRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = "black",
    filled: boolean = true,
    opacity: number = 1
  ): void {
    this.context.save();
    this.withOpacity(opacity, () => {
      this.context.fillStyle = color;
      if (filled) {
        this.context.fillRect(x, y, width, height);
      } else {
        this.context.lineWidth = DEFAULT_STROKE_WIDTH;
        this.context.strokeStyle = color;
        this.context.strokeRect(x, y, width, height);
      }
    });
    this.context.restore();
  }

  /**
   * Sets the default font family used for text rendering.
   *
   * @param font - The font family name to use as default (e.g., "Arial", "Verdana")
   *
   * @example
   * // Set default font to Arial
   * shapeDrawer.setDefaultFont("Arial");
   */
  setDefaultFont(font: string): void {
    this.defaultFont = font;
  }

  getDefaultFont(): string {
    return this.defaultFont;
  }

  /**
   * Draws a straight line between two points with customizable appearance.
   *
   * @param start - The starting point of the line as a Vector
   * @param end - The ending point of the line as a Vector
   * @param width - The thickness of the line in pixels
   * @param color - The color of the line (default: "red")
   * @param lineCap - The style of the line endings (default: "round")
   *
   * @example
   * // Draw a thick blue line with square caps
   * shapeDrawer.drawLine(new Vector(10, 10), new Vector(100, 50), 5, "blue", "square");
   *
   * @example
   * // Draw a thin red line with default round caps
   * shapeDrawer.drawLine(new Vector(0, 0), new Vector(100, 100), 1);
   */
  drawLine(
    start: Vector,
    end: Vector,
    width: number,
    color = "red",
    lineCap: CanvasLineCap = "round"
  ) {
    this.context.save();
    this.context.beginPath();
    this.context.lineWidth = width;
    this.context.strokeStyle = color;
    this.context.lineCap = lineCap;
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.stroke();
    this.context.closePath();
    this.context.restore();
  }

  /**
   * Draws a circle with customizable appearance and optional center dot.
   *
   * @param x - The x-coordinate of the circle's center
   * @param y - The y-coordinate of the circle's center
   * @param radius - The radius of the circle in pixels
   * @param color - The color to use for filling or stroking the circle (default: "black")
   * @param filled - If true, fills the circle; if false, strokes the outline (default: true)
   * @param centerDot - If true, draws a small dot at the center of the circle (default: true)
   * @param centerDotColor - The color of the center dot (default: "red")
   * @param centerDotRadius - The radius of the center dot in pixels (default: 2)
   *
   * @example
   * // Draw a filled blue circle with default center dot
   * shapeDrawer.drawCircle(100, 100, 50, "blue", true);
   *
   * @example
   * // Draw a red circle outline with no center dot
   * shapeDrawer.drawCircle(100, 100, 50, "red");
   *
   * @example
   * // Draw a green circle with custom center dot
   * shapeDrawer.drawCircle(100, 100, 50, "green", true, true, "yellow", 3);
   */
  drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string = "black",
    filled: boolean = true,
    centerDot: boolean = true,
    centerDotColor: string = "red",
    centerDotRadius: number = 2
  ): void {
    this.context.save();
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    if (filled) {
      this.context.fillStyle = color;
      this.context.fill();
    } else {
      this.context.lineWidth = DEFAULT_STROKE_WIDTH;
      this.context.strokeStyle = color;
      this.context.stroke();
    }

    if (centerDot) {
      this.context.beginPath();
      this.context.arc(x, y, centerDotRadius, 0, Math.PI * 2);
      this.context.fillStyle = centerDotColor;
      this.context.fill();
    }

    this.context.closePath();
    this.context.restore();
  }

  /**
   * Renders text at the specified position with customizable styling.
   *
   * @param text - The text string to render
   * @param x - The x-coordinate of the text position
   * @param y - The y-coordinate of the text position
   * @param color - The color of the text (default: "black")
   * @param size - The font size in pixels (default: "16px")
   * @param align - The text alignment (default: "center")
   * @param font - Optional font family to override the default font
   * @param options - Optional rendering options (e.g. text wrapping)
   *
   * @example
   * // Draw centered black text with default font
   * shapeDrawer.drawText("Hello", 100, 50);
   *
   * @example
   * // Draw right-aligned red text with custom font
   * shapeDrawer.drawText("World", 100, 50, "red", "20px", "right", "Verdana");
   *
   * @example
   * // Draw left-aligned text with default font but custom size
   * shapeDrawer.drawText("Welcome", 100, 50, "black", "12px", "left");
   */
  drawText(
    text: string,
    x: number,
    y: number,
    color: string = "black",
    size: string = "16px",
    align: CanvasTextAlign = "center",
    font?: string,
    options?: DrawTextOptions
  ): void {
    const fontToUse = font ?? this.defaultFont;
    const previousBaseline = this.context.textBaseline;
    this.context.fillStyle = color;
    this.context.font = `${size} ${fontToUse}`;
    this.context.textAlign = align;

    if (options?.baseline) {
      this.context.textBaseline = options.baseline;
    }

    const maxWidth = options?.wrapText;
    if (maxWidth === undefined) {
      this.context.fillText(text, x, y);
      if (options?.baseline) this.context.textBaseline = previousBaseline;
      return;
    }

    const lines = this.wrapText(this.context, text, maxWidth);
    const lineHeight = options?.lineHeight ?? this.defaultLineHeightPx(size);
    const maxLines = options?.maxLines ?? Number.POSITIVE_INFINITY;

    for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
      this.context.fillText(lines[i] ?? "", x, y + i * lineHeight);
    }

    if (options?.baseline) this.context.textBaseline = previousBaseline;
  }

  private defaultLineHeightPx(size: string): number {
    const match = /(-?\d+(\.\d+)?)px/.exec(size);
    const parsed = match ? Number(match[1]) : 16;
    const fontPx = Number.isFinite(parsed) ? parsed : 16;
    return Math.ceil(fontPx * 1.3);
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    if (maxWidth <= 0) return [];

    const hardLines = text.split("\n");
    const out: string[] = [];

    for (const hardLine of hardLines) {
      const line = hardLine.trimEnd();
      if (line.trim().length === 0) {
        out.push("");
        continue;
      }

      const words = line.split(/\s+/g);
      let current = "";

      for (const word of words) {
        const candidate = current.length === 0 ? word : `${current} ${word}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
          continue;
        }

        if (current.length > 0) {
          out.push(current);
          current = word;
          continue;
        }

        // Word is longer than maxWidth; hard-break it.
        let chunk = "";
        for (const char of word) {
          const next = `${chunk}${char}`;
          if (ctx.measureText(next).width <= maxWidth) {
            chunk = next;
            continue;
          }
          if (chunk.length > 0) {
            out.push(chunk);
            chunk = char;
          }
        }
        if (chunk.length > 0) out.push(chunk);
        current = "";
      }

      if (current.length > 0) out.push(current);
    }

    return out;
  }

  /**
   * Clears the canvas and fills it with a solid background color.
   *
   * @param color - The color to fill the canvas with (default: "white")
   *
   * @example
   * // Clear canvas with default white background
   * shapeDrawer.drawBackground();
   *
   * @example
   * // Clear canvas with custom gray background
   * shapeDrawer.drawBackground("#f0f0f0");
   */
  drawBackground(color: string = "white"): void {
    this.context.fillStyle = color;
    this.context.fillRect(
      0,
      0,
      this.context.canvas.width,
      this.context.canvas.height
    );
  }

  /**
   * Executes drawing operations within a clipped rectangular region.
   *
   * This method saves the current canvas state, creates a clipping region,
   * executes the provided drawing function, and then restores the original state.
   *
   * @param x - The x-coordinate of the clipping rectangle's top-left corner
   * @param y - The y-coordinate of the clipping rectangle's top-left corner
   * @param width - The width of the clipping rectangle
   * @param height - The height of the clipping rectangle
   * @param draw - A function containing the drawing operations to perform within the clipped region
   *
   * @example
   * // Draw shapes only within a specific region
   * shapeDrawer.withClippingRect(50, 50, 200, 200, () => {
   *   shapeDrawer.drawCircle(100, 100, 50, "blue");
   *   shapeDrawer.drawText("Clipped", 100, 100);
   * });
   */
  withClippingRect(
    x: number,
    y: number,
    width: number,
    height: number,
    draw: () => void
  ): void {
    this.context.save();
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this.context.clip();
    draw();
    this.context.restore();
  }

  /**
   * Executes drawing operations with a temporary rotation around a pivot point.
   *
   * This method saves the current canvas state, applies the rotation transform,
   * executes the provided drawing function, and then restores the original state.
   *
   * @param x - The x-coordinate of the rotation pivot
   * @param y - The y-coordinate of the rotation pivot
   * @param angle - Rotation angle in radians
   * @param draw - A function containing the drawing operations to perform while rotated
   */
  withRotation(x: number, y: number, angle: number, draw: () => void): void {
    if (angle === 0) {
      draw();
      return;
    }

    this.context.save();
    this.context.translate(x, y);
    this.context.rotate(angle);
    this.context.translate(-x, -y);
    draw();
    this.context.restore();
  }

  /**
   * Draws a sprite from the sprite library onto the canvas.
   *
   * @param spriteName - The name of the sprite to draw (must be loaded in the SpriteLibrary)
   * @param x - The x-coordinate of the top-left corner where the sprite will be drawn
   * @param y - The y-coordinate of the top-left corner where the sprite will be drawn
   * @param width - The width to scale the sprite to
   * @param height - The height to scale the sprite to
   *
   * @example
   * // Draw a sprite named "player" at position (100, 100) with size 50x50
   * shapeDrawer.drawSprite("player", 100, 100, 50, 50);
   *
   * @example
   * // Draw a sprite with different dimensions
   * shapeDrawer.drawSprite("enemy", 200, 200, 30, 40);
   */
  drawSprite(
    spriteName: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const sprite = this.spriteLibrary.getSprite(spriteName);
    if (sprite) {
      this.context.drawImage(sprite, x, y, width, height);
    }
  }

  /**
   * Loads a font (local URL or Google Fonts stylesheet) and registers it for use.
   *
   * This method handles both local font files and Google Fonts URLs. For Google Fonts,
   * it injects the stylesheet and waits for the font to be available. For local fonts,
   * it creates a new FontFace object and adds it to the document's font collection.
   *
   * @param fontName - The name of the font to load (must match the font family name)
   * @param url - The URL of the font file or Google Fonts stylesheet
   * @returns A Promise that resolves when the font is successfully loaded and available
   *
   * @example
   * // Load a Google Font
   * await shapeDrawer.loadFont("Roboto", "https://fonts.googleapis.com/css2?family=Roboto");
   *
   * @example
   * // Load a local font file
   * await shapeDrawer.loadFont("CustomFont", "/fonts/custom-font.woff2");
   *
   * @throws Will throw an error if the font fails to load
   */
  async loadFont(fontName: string, url: string): Promise<void> {
    // Google Fonts endpoints return CSS, so inject the stylesheet first and wait for the font to be available
    if (url.includes("fonts.googleapis.com")) {
      await new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = () => {
          document.fonts.load(`1em ${fontName}`).then(() => resolve());
        };
        link.onerror = () =>
          reject(new Error(`Failed to load font stylesheet: ${fontName}`));
        document.head.appendChild(link);
      });
      return;
    }

    const newFont = new FontFace(fontName, `url(${url})`);
    const loadedFont = await newFont.load();
    document.fonts.add(loadedFont);
    await document.fonts.load(`1em ${fontName}`);
  }
}

class CanvasController {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private spriteLibrary: SpriteLibrary = new SpriteLibrary();
  private shapeDrawer: ShapeDrawer;

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext("2d")!;
    this.shapeDrawer = new ShapeDrawer(this.context, this.spriteLibrary);
    const canvasContainer = document.getElementById("canvas-container");
    if (canvasContainer) {
      canvasContainer.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }
  }

  clearCanvas(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  getShapeDrawer(): ShapeDrawer {
    return this.shapeDrawer;
  }

  getSpriteLibrary(): SpriteLibrary {
    return this.spriteLibrary;
  }

  applyTranslation(translationVector: Vector): void {
    this.context.translate(translationVector.x, translationVector.y);
  }

  reset(): void {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
  }

  applyRotation(angle: number): void {
    this.context.rotate(angle);
  }
}

export * from "./Transformations";
export { CanvasController, ShapeDrawer, SpriteLibrary };
