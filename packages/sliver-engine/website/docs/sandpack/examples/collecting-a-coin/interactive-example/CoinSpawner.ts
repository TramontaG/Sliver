import { GameObject, Vector } from "sliver-engine";
import { Coin } from "./Coin";

const MIN_X = 60;
const MAX_X = 956 - 76;
const MIN_Y = 60;
const MAX_Y = 380 - 76;

const randomBetween = (min: number, max: number): number => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export class CoinSpawner extends GameObject {
	constructor() {
		super("coin:spawner", Vector.zero(), false, true);
	}

	override onAddedToScene(): void {
		this.spawnCoin();
		this.onMessage("score:coin_collected", () => {
			this.spawnCoin();
		});
	}

	private spawnCoin(): void {
		if (!this.scene) return;
		this.scene.addGameObject(
			new Coin(
				new Vector(
					randomBetween(MIN_X, MAX_X),
					randomBetween(MIN_Y, MAX_Y),
				),
			),
		);
	}
}
