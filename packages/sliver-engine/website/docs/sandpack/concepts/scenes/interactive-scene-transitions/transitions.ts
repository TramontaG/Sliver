import {
	colorFlash,
	fadeTransition,
	slidePop,
	slidePush,
	slideReplace,
	type SceneTransition,
} from "sliver-engine";

const REPLACE_DURATION = 450;
const PUSH_DURATION = 450;
const POP_DURATION = 450;

// Transition used by "Scene A -> replace Scene B"
export const TRANSITION_A_TO_B: SceneTransition = slideReplace(
	"left",
	undefined,
	REPLACE_DURATION,
);
// export const TRANSITION_A_TO_B: SceneTransition = fadeTransition(REPLACE_DURATION);
// export const TRANSITION_A_TO_B: SceneTransition = colorFlash("#ffffff", 700);

// Transition used by "Scene B -> replace Scene A"
export const TRANSITION_B_TO_A: SceneTransition = slideReplace(
	"right",
	undefined,
	REPLACE_DURATION,
);
// export const TRANSITION_B_TO_A: SceneTransition = fadeTransition(REPLACE_DURATION);
// export const TRANSITION_B_TO_A: SceneTransition = colorFlash("#ffffff", 700);

// Transition used by "Scene A/B -> push Scene C"
export const TRANSITION_PUSH_C: SceneTransition = slidePush(
	"up",
	undefined,
	PUSH_DURATION,
);
// export const TRANSITION_PUSH_C: SceneTransition = fadeTransition(PUSH_DURATION);
// export const TRANSITION_PUSH_C: SceneTransition = colorFlash("#ffffff", 700);

// Transition used by "Scene C -> pop back"
export const TRANSITION_POP_C: SceneTransition = slidePop(
	"down",
	undefined,
	POP_DURATION,
);
// export const TRANSITION_POP_C: SceneTransition = fadeTransition(POP_DURATION);
// export const TRANSITION_POP_C: SceneTransition = colorFlash("#ffffff", 700);
