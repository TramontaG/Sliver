import type { CanvasController } from "../../CanvasController";
import { Vector } from "../../Lib/Vector";
import type { GameObject } from "../index";

type HitboxOptions = {
  debug?: boolean;
  solid?: boolean;
};

type Hitbox = SquareHitbox | CircleHitbox;

const normalizeHitboxOptions = (
  options?: HitboxOptions | boolean
): Required<HitboxOptions> => {
  if (typeof options === "boolean") {
    return { debug: options, solid: true };
  }

  return {
    debug: options?.debug ?? false,
    solid: options?.solid ?? true,
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const rotateAround = (point: Vector, pivot: Vector, angle: number): Vector => {
  if (angle === 0) return point.clone();
  const rotated = point.toSubtracted(pivot).rotate(angle);
  rotated.add(pivot);
  return rotated;
};

const projectVertices = (
  vertices: Vector[],
  axis: Vector
): { min: number; max: number } => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const vertex of vertices) {
    const projection = vertex.dotProduct(axis);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }

  return { min, max };
};

type ObbData = {
  center: Vector;
  axisX: Vector;
  axisY: Vector;
  halfX: number;
  halfY: number;
};

const DEBUG_STROKE_WIDTH = 2;

const getObbData = (
  vertices: [Vector, Vector, Vector, Vector],
  size: Vector
): ObbData => {
  const center = vertices[0].toAdded(vertices[2]).toMultiplied(0.5);
  const axisX = vertices[1].toSubtracted(vertices[0]).normalize();
  const axisY = vertices[3].toSubtracted(vertices[0]).normalize();
  return {
    center,
    axisX,
    axisY,
    halfX: size.x / 2,
    halfY: size.y / 2,
  };
};

const closestPointOnObb = (point: Vector, obb: ObbData): Vector => {
  const d = point.toSubtracted(obb.center);
  const distX = d.dotProduct(obb.axisX);
  const distY = d.dotProduct(obb.axisY);

  const clampedX = clamp(distX, -obb.halfX, obb.halfX);
  const clampedY = clamp(distY, -obb.halfY, obb.halfY);

  return obb.center
    .toAdded(obb.axisX.toMultiplied(clampedX))
    .toAdded(obb.axisY.toMultiplied(clampedY));
};

class SquareHitbox {
  public solid: boolean;
  private debug: boolean;

  constructor(
    public offset: Vector,
    public size: Vector,
    public gameObject: GameObject,
    options: HitboxOptions | boolean = {}
  ) {
    const resolved = normalizeHitboxOptions(options);
    this.debug = resolved.debug;
    this.solid = resolved.solid;
  }

  public getTransformedVertices(): [Vector, Vector, Vector, Vector] {
    const topLeft = this.getAbsolutePosition();
    const topRight = new Vector(topLeft.x + this.size.x, topLeft.y);
    const bottomRight = new Vector(
      topLeft.x + this.size.x,
      topLeft.y + this.size.y
    );
    const bottomLeft = new Vector(topLeft.x, topLeft.y + this.size.y);

    const angle = this.gameObject.rotation ?? 0;
    if (angle === 0) {
      return [topLeft, topRight, bottomRight, bottomLeft];
    }

    const pivot = this.gameObject.getRotationCenter();
    return [
      rotateAround(topLeft, pivot, angle),
      rotateAround(topRight, pivot, angle),
      rotateAround(bottomRight, pivot, angle),
      rotateAround(bottomLeft, pivot, angle),
    ];
  }

	public getAbsolutePosition() {
		const gameObjectPosition = this.gameObject.getPosition();
		return gameObjectPosition.toAdded(this.offset);
	}

  private intersectsWithSquare(other: SquareHitbox): boolean {
    const verticesA = this.getTransformedVertices();
    const verticesB = other.getTransformedVertices();

    const axes: Vector[] = [
      verticesA[1].toSubtracted(verticesA[0]).normalize(),
      verticesA[3].toSubtracted(verticesA[0]).normalize(),
      verticesB[1].toSubtracted(verticesB[0]).normalize(),
      verticesB[3].toSubtracted(verticesB[0]).normalize(),
    ];

    for (const axis of axes) {
      if (axis.squaredMagnitude() === 0) continue;

      const projA = projectVertices(verticesA, axis);
      const projB = projectVertices(verticesB, axis);

      if (projA.max < projB.min || projB.max < projA.min) {
        return false;
      }
    }

    return true;
  }

  private intersectsWithCircle(other: CircleHitbox): boolean {
    const circleCenter = other.getTransformedPosition();
    const vertices = this.getTransformedVertices();
    const obb = getObbData(vertices, this.size);
    const closest = closestPointOnObb(circleCenter, obb);

    const dx = circleCenter.x - closest.x;
    const dy = circleCenter.y - closest.y;
    return dx * dx + dy * dy <= other.radius * other.radius;
  }

  public intersects(other: CircleHitbox | SquareHitbox): boolean {
    if (other instanceof CircleHitbox) {
      return this.intersectsWithCircle(other);
    }

    if (other instanceof SquareHitbox) {
      return this.intersectsWithSquare(other);
    }

    return false;
  }

	public intersectsWithPoint(point: Vector): boolean {
		const angle = this.gameObject.rotation ?? 0;
		if (angle === 0) {
      const thisPos = this.getAbsolutePosition();
      return !(
        point.x < thisPos.x ||
        point.x > thisPos.x + this.size.x ||
        point.y < thisPos.y ||
        point.y > thisPos.y + this.size.y
      );
    }

    const vertices = this.getTransformedVertices();
    const obb = getObbData(vertices, this.size);
    const d = point.toSubtracted(obb.center);
    const localX = d.dotProduct(obb.axisX);
    const localY = d.dotProduct(obb.axisY);
    return Math.abs(localX) <= obb.halfX && Math.abs(localY) <= obb.halfY;
  }

  public renderDebug(canvas: CanvasController): void {
    if (this.debug) {
      const pos = this.getAbsolutePosition();
      canvas
        .getShapeDrawer()
        .drawRectangle(pos.x, pos.y, this.size.x, this.size.y, "red", false);
    }
  }
}

class CircleHitbox {
  public solid: boolean;
  private debug: boolean;

  constructor(
    public offset: Vector,
    public radius: number,
    public gameObject: GameObject,
    options: HitboxOptions | boolean = {}
  ) {
    const resolved = normalizeHitboxOptions(options);
    this.debug = resolved.debug;
    this.solid = resolved.solid;
  }

  public getAbsolutePosition() {
    const gameObjectPosition = this.gameObject.getPosition();
    return gameObjectPosition.toAdded(this.offset);
  }

  public getTransformedPosition(): Vector {
    const pos = this.getAbsolutePosition();
    const angle = this.gameObject.rotation ?? 0;
    if (angle === 0) return pos;
    const pivot = this.gameObject.getRotationCenter();
    return rotateAround(pos, pivot, angle);
  }

	private intersectWithCircle(
		other: CircleHitbox,
		thisPos: Vector,
    otherPos: Vector
  ): boolean {
    const dx = thisPos.x - otherPos.x;
    const dy = thisPos.y - otherPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + other.radius;
  }

  private intersectWithSquare(
    other: SquareHitbox,
    thisPos: Vector,
    _otherPos: Vector
  ) {
    const vertices = other.getTransformedVertices();
    const obb = getObbData(vertices, other.size);
    const closest = closestPointOnObb(thisPos, obb);
    const dx = thisPos.x - closest.x;
    const dy = thisPos.y - closest.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  public intersects(other: CircleHitbox | SquareHitbox): boolean {
    const thisPos = this.getTransformedPosition();

    if (other instanceof CircleHitbox) {
      return this.intersectWithCircle(
        other,
        thisPos,
        other.getTransformedPosition()
      );
    }

    if (other instanceof SquareHitbox) {
      return this.intersectWithSquare(
        other,
        thisPos,
        other.getAbsolutePosition()
      );
    }

    return false;
  }

	public intersectsWithPoint(point: Vector): boolean {
		const thisPos = this.getTransformedPosition();
		const dx = point.x - thisPos.x;
    const dy = point.y - thisPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius;
  }

  public renderDebug(canvas: CanvasController): void {
    if (this.debug) {
      const pos = this.getAbsolutePosition();
      const drawer = canvas.getShapeDrawer();
      drawer.drawCircle(pos.x, pos.y, this.radius, "red", false);
      drawer.drawLine(
        pos,
        pos.toAdded(new Vector(this.radius, 0)),
        DEBUG_STROKE_WIDTH,
        "red"
      );
    }
  }
}

export { SquareHitbox, CircleHitbox, type HitboxOptions, type Hitbox };
