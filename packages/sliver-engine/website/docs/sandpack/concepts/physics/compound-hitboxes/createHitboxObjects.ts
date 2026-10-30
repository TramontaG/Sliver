import {
CircleHitbox,
GameObject,
SquareHitbox,
Vector,
grabbable,
type GameEvent,
} from "sliver-engine";
import {
createHitboxConfigs,
type HitboxConfig,
type HitboxDemoObjectConfig,
} from "./createHitboxConfigs";

class HitboxDemoObject extends GameObject {
private readonly config: HitboxDemoObjectConfig;

constructor(name: string, config: HitboxDemoObjectConfig) {
super(name, config.position.clone());
this.config = config;
config.hitboxes.forEach((hitboxConfig) => {
this.addHitbox(this.buildHitbox(hitboxConfig));
});
this.setPhisics({
immovable: false,
affectedByGravity: true,
restitution: 0.35,
friction: 0.35,
mass: 1,
});
this.setRenderFunction((obj, canvas) => {
const pos = obj.getPosition();
canvas
.getShapeDrawer()
.drawRectangle(
pos.x,
pos.y,
this.config.shapeSize.x,
this.config.shapeSize.y,
this.config.shapeColor,
true,
);
});
}

private buildHitbox(config: HitboxConfig) {
if (config.type === "circle") {
return new CircleHitbox(config.offset.clone(), config.circleRadius, this, {
solid: config.solid,
debug: config.debug,
});
}

return new SquareHitbox(config.offset.clone(), config.squareSize.clone(), this, {
solid: config.solid,
debug: config.debug,
});
}

@grabbable()
override handleEvent(event: GameEvent): void {
super.handleEvent(event);
}
}

export const createHitboxObjects = () => {
const configs = createHitboxConfigs();
return [
new HitboxDemoObject("hitbox-object-a", configs.objectA),
new HitboxDemoObject("hitbox-object-b", configs.objectB),
];
};
