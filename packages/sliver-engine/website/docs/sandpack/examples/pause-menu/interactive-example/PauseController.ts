import {
	GameObject,
	Vector,
	fadeTransition,
	onKeyPressed,
	type GameEvent,
} from "sliver-engine";

const PAUSE_SCENE = "pause";
const TRANSITION_DURATION = 250;

export class PauseController extends GameObject {
	constructor() {
		super("pause-controller", Vector.zero(), false, true);
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	@onKeyPressed<PauseController>("Escape", (obj) => {
		const ctx = obj.getContext();
		if (!ctx) return;
		void ctx.transitionToScene(
			PAUSE_SCENE,
			fadeTransition(TRANSITION_DURATION),
			"replace",
		);
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
