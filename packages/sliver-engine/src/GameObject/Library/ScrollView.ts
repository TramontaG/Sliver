import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { Scene } from "../../Scenes";
import type { GameEvent } from "../../Events";
import {
  onChildrenEvents,
  onMouseWheelOverHitbox,
} from "../../Events/decorators";
import { Vector } from "../../Lib/Vector";
import { SquareHitbox } from "../Hitboxes";

type ScrollViewOptions = {
  backgroundColor?: string;
  scrollbarWidth?: number;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  contentHeight?: number;
  scrollStep?: number;
};

class ScrollView extends GameObject {
  private size: Vector;
  private scrollOffset: number = 0;
  private contentHeight: number;
  private scrollbarWidth: number;
  private scrollbarColor: string;
  private scrollbarTrackColor: string;
  private backgroundColor: string;
  private scrollStep: number;
  private childOffsets = new Map<GameObject, Vector>();

  constructor(
    name: string,
    position: Vector,
    size: Vector,
    children: GameObject[] = [],
    options: ScrollViewOptions = {}
  ) {
    super(name, position);
    this.size = size;
    this.backgroundColor = options.backgroundColor ?? "#f7f7f7";
    this.scrollbarWidth = options.scrollbarWidth ?? 10;
    this.scrollbarColor = options.scrollbarColor ?? "#8a8a8a";
    this.scrollbarTrackColor = options.scrollbarTrackColor ?? "#cfcfcf";
    this.scrollStep = options.scrollStep ?? 40;
    this.contentHeight = Math.max(options.contentHeight ?? size.y, size.y);

    this.setRenderFunction(this.renderContainer);
    this.addHitbox(new SquareHitbox(Vector.zero(), this.size, this));
    children.forEach((child) => this.addChildWithOffset(child));
  }

  private getMaxScroll(): number {
    return Math.max(0, this.contentHeight - this.size.y);
  }

  private clampScroll(next: number): number {
    return Math.max(0, Math.min(this.getMaxScroll(), next));
  }

  private scrollBy(deltaY: number) {
    const next = this.clampScroll(this.scrollOffset + deltaY);
    if (next !== this.scrollOffset) {
      this.scrollOffset = next;
      this.syncChildrenPositions();
    }
  }

  private addChildWithOffset(child: GameObject, offset?: Vector): void {
    const relativeOffset = offset ?? child.getPosition().clone();
    this.childOffsets.set(child, relativeOffset.clone());
    this.bumpContentHeight(relativeOffset);
    this.syncChildPosition(child, relativeOffset);
    super.addChild(child);
  }

  private bumpContentHeight(relativeOffset: Vector): void {
    this.contentHeight = Math.max(
      this.contentHeight,
      relativeOffset.y + this.size.y
    );
  }

  override addChild(child: GameObject): void {
    this.addChildWithOffset(child);
  }

  override setPosition(position: Vector): void {
    super.setPosition(position);
    this.syncChildrenPositions();
  }

  override tick(): void {
    this.syncChildrenPositions();
    super.tick();
  }

  private syncChildPosition(child: GameObject, relativeOffset: Vector): void {
    const absolute = new Vector(
      this.getPosition().x + relativeOffset.x,
      this.getPosition().y + relativeOffset.y - this.scrollOffset
    );
    child.setPosition(absolute);
  }

  private syncChildrenPositions(): void {
    this.childOffsets.forEach((offset, child) =>
      this.syncChildPosition(child, offset)
    );
  }

  private renderContainer = (obj: GameObject, canvas: CanvasController) => {
    const shapeDrawer = canvas.getShapeDrawer();
    const pos = obj.getPosition();
    shapeDrawer.drawRectangle(
      pos.x,
      pos.y,
      this.size.x,
      this.size.y,
      this.backgroundColor
    );
  };

  private renderScrollbar(canvas: CanvasController): void {
    const shapeDrawer = canvas.getShapeDrawer();
    const pos = this.getPosition();
    const trackX = pos.x + this.size.x - this.scrollbarWidth;
    const trackHeight = this.size.y;
    const maxScroll = this.getMaxScroll();

    shapeDrawer.drawRectangle(
      trackX,
      pos.y,
      this.scrollbarWidth,
      trackHeight,
      this.scrollbarTrackColor
    );

    const visibleRatio = Math.min(1, this.size.y / this.contentHeight);
    const thumbHeight = Math.max(12, trackHeight * visibleRatio);
    const thumbTravel = trackHeight - thumbHeight;
    const scrollRatio = maxScroll === 0 ? 0 : this.scrollOffset / maxScroll;
    const thumbY = pos.y + scrollRatio * thumbTravel;

    shapeDrawer.drawRectangle(
      trackX,
      thumbY,
      this.scrollbarWidth,
      thumbHeight,
      this.scrollbarColor
    );
  }

  override render(canvas: CanvasController, scene: Scene): void {
    this.syncChildrenPositions();
    const pos = this.getPosition();

    canvas
      .getShapeDrawer()
      .withClippingRect(pos.x, pos.y, this.size.x, this.size.y, () =>
        super.render(canvas, scene)
      );
    this.renderScrollbar(canvas);
  }

  @onMouseWheelOverHitbox<ScrollView>((obj, event) => {
    obj.scrollBy(event.deltaY > 0 ? obj.scrollStep : -obj.scrollStep);
    event.stopPropagation = true;
  })
  @onChildrenEvents<ScrollView>()
  override handleEvent(event: GameEvent): void {}
}

export { ScrollView };
