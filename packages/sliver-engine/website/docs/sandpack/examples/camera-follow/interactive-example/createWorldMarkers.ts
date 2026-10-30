import { GameObject, Vector } from "sliver-engine";

class Marker extends GameObject {
	constructor(name: string, position: Vector, private label: string) {
		super(name, position.clone());
		this.setPhisics({ immovable: true });
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const draw = canvas.getShapeDrawer();
			draw.drawRectangle(pos.x, pos.y, 6, 220, "#334155", true);
			draw.drawText(this.label, pos.x - 8, pos.y - 10, "#94a3b8", "12px", "left");
		});
	}
}

export const createWorldMarkers = (): Marker[] => {
	const positions = [80, 240, 400, 560, 720, 880];
	return positions.map((x, index) => {
		return new Marker(
			"marker-" + index,
			new Vector(x, 60),
			"x=" + x,
		);
	});
};
