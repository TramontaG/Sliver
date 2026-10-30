import { Button, Vector } from "sliver-engine";
import type { Player } from "./Player";

export class HealButton extends Button {
	constructor(player: Player) {
		super(
			"heal-player",
			new Vector(398, 310),
			new Vector(160, 42),
			"Heal +1",
			"#22c55e",
			"white",
			() => {
				player.heal(1);
			},
		);
	}
}
