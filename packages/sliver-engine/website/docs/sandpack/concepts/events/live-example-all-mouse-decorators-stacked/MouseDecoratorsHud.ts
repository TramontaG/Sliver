import { GameObject, Vector, type CanvasController } from "sliver-engine";
import type { MouseDecoratorsObjectBase } from "./MouseDecoratorsObject.base";

const PANEL_X = 24;
const PANEL_Y = 28;
const PANEL_LINE_HEIGHT = 16;

export class MouseDecoratorsHud extends GameObject {
private readonly target: MouseDecoratorsObjectBase;

constructor(target: MouseDecoratorsObjectBase) {
super("mouse-decorators-hud", Vector.zero());
this.target = target;
this.setPhisics({
immovable: true,
affectedByGravity: false,
});
this.setRenderFunction((_obj, canvas: CanvasController) => {
const draw = canvas.getShapeDrawer();

draw.drawText(
"Interact with the box: click, hover and scroll",
PANEL_X,
PANEL_Y,
"#e2e8f0",
"14px",
"left",
);

this.target.getHudLines().forEach((line, index) => {
draw.drawText(
line,
PANEL_X,
PANEL_Y + (index + 2) * PANEL_LINE_HEIGHT,
"#cbd5e1",
"12px",
"left",
);
});
});
}
}
