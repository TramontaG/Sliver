import { Vector } from "../../Lib/Vector";

type ContactManifoldPoint = {
	id: string;
	position: Vector;
	penetration: number;
};

type ContactManifold = {
	bodyIdA: string;
	bodyIdB: string;
	shapeIdA: string;
	shapeIdB: string;
	normal: Vector;
	penetration: number;
	points: ContactManifoldPoint[];
};

export type { ContactManifold, ContactManifoldPoint };
