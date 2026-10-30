import { GameObject, SquareHitbox, Vector } from "sliver-engine";
import {
ENCLOSURE_BORDER_COLOR,
ENCLOSURE_CEILING_POSITION,
ENCLOSURE_FLOOR_POSITION,
ENCLOSURE_HORIZONTAL_SIZE,
ENCLOSURE_LEFT_WALL_POSITION,
ENCLOSURE_RIGHT_WALL_POSITION,
ENCLOSURE_VERTICAL_SIZE,
} from "./enclosureDimensions";

type BoundConfig = {
name: string;
position: Vector;
size: Vector;
color: string;
};

const BOUNDS: BoundConfig[] = [
{
name: "ceiling",
position: ENCLOSURE_CEILING_POSITION.clone(),
size: ENCLOSURE_HORIZONTAL_SIZE.clone(),
color: ENCLOSURE_BORDER_COLOR,
},
{
name: "floor",
position: ENCLOSURE_FLOOR_POSITION.clone(),
size: ENCLOSURE_HORIZONTAL_SIZE.clone(),
color: ENCLOSURE_BORDER_COLOR,
},
{
name: "left-wall",
position: ENCLOSURE_LEFT_WALL_POSITION.clone(),
size: ENCLOSURE_VERTICAL_SIZE.clone(),
color: ENCLOSURE_BORDER_COLOR,
},
{
name: "right-wall",
position: ENCLOSURE_RIGHT_WALL_POSITION.clone(),
size: ENCLOSURE_VERTICAL_SIZE.clone(),
color: ENCLOSURE_BORDER_COLOR,
},
];

class Bound extends GameObject {
constructor(config: BoundConfig) {
super(config.name, config.position.clone());
this.addHitbox(
new SquareHitbox(Vector.zero(), config.size.clone(), this, {
solid: true,
debug: false,
}),
);
this.setPhisics({
immovable: true,
friction: 1,
restitution: 0,
});
this.setRenderFunction((obj, canvas) => {
const pos = obj.getPosition();
canvas
.getShapeDrawer()
.drawRectangle(pos.x, pos.y, config.size.x, config.size.y, config.color, true);
});
}
}

export const createBounds = (): Bound[] => {
	return BOUNDS.map((config) => new Bound(config));
};
