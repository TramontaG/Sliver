import { GameObject, Vector } from "sliver-engine";

export class CameraFollower extends GameObject {
	constructor(private target: GameObject) {
		super("camera:follower", Vector.zero(), false, true);
	}

	override tick(): void {
		const scene = this.scene;
		const ctx = this.getContext();
		if (!scene || !ctx) return;

		const canvasEl = ctx.getCanvas().getCanvas();
		const center = new Vector(canvasEl.width / 2, canvasEl.height / 2);

		// Read the target in scene space so we can align it to the canvas center.
		const targetPos = this.target.getScenePosition();

		// Scene offset is added at render time, so centering the target is just
		// the delta between the canvas center and the target position.
		scene.setOffset(center.toSubtracted(targetPos));
	}
}
