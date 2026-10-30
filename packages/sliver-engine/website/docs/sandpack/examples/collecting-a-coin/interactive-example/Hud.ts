import { GameObject, Vector, type CanvasController, type Scene } from "sliver-engine";

export class CoinCounter extends GameObject {
	private coins = 0;

	constructor() {
		super("hud:coins", Vector.zero());
		this.setPhisics({ immovable: true });
	}

	override onAddedToScene(): void {
		this.onMessage<{ amount: number }>("score:coin_collected", ({ amount }) => {
			this.coins += amount;
		});
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		canvas
			.getShapeDrawer()
			.drawText("Coins: " + this.coins, 16, 24, "#e2e8f0", "16px", "left");
	}
}
