import { Vector } from "sliver-engine";
import { scaleEnclosureScalar } from "./enclosureDimensions";

export const createGravity = () => {
	// Edit this section only.
	const gravityX = 0;
	const gravityY = 1200;

	return new Vector(
		scaleEnclosureScalar(gravityX),
		scaleEnclosureScalar(gravityY),
	);
};
