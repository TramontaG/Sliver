import { onSpawn } from "./decorators";

export class Player {
	@onSpawn()
	public spawn(): void {
		console.log("Player spawned");
	}
}
