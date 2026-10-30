import { GameObject, Vector, type CanvasController, type Scene } from "sliver-engine";
import type { GameState } from "./types";

const PLAYER_SIZE = 36;
const MAX_HP = 10;

export class PlayerState extends GameObject {
	public level = 1;
	public hp = MAX_HP;

	constructor(position: Vector) {
		super("player-state", position.clone());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	damage(amount: number): void {
		this.hp = Math.max(0, this.hp - amount);
	}

	heal(amount: number): void {
		this.hp = Math.min(MAX_HP, this.hp + amount);
	}

	levelUp(): void {
		this.level = Math.min(99, this.level + 1);
	}

	toState(): GameState {
		return {
			schemaVersion: 1,
			level: this.level,
			hp: this.hp,
		};
	}

	applyState(state: GameState): void {
		this.level = state.level;
		this.hp = state.hp;
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const draw = canvas.getShapeDrawer();
		draw.drawRectangle(pos.x, pos.y, PLAYER_SIZE, PLAYER_SIZE, "#38bdf8", true);
		draw.drawText("P", pos.x + PLAYER_SIZE / 2, pos.y + PLAYER_SIZE / 2 + 1, "#0f172a", "18px", "center");
	}
}
