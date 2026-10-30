export type PhysicsOptions = {
	immovable?: boolean;
	affectedByGravity?: boolean;
	restitution?: number;
	friction?: number;
	staticFriction?: number;
	dynamicFriction?: number;
	mass?: number;
	inertiaScale?: number;
};

type ColorPhysicsOptions = {
	cyan: PhysicsOptions;
	rose: PhysicsOptions;
};

export const createColorPhysicsOptions = (): ColorPhysicsOptions => {
	// Edit this section only.
	const cyanPhysicsOptions = {
		immovable: false,
		affectedByGravity: true,
		restitution: 0.35,
		staticFriction: 0.82,
		dynamicFriction: 0.46,
		mass: 1.2,
		inertiaScale: 0.82,
	};

	const rosePhysicsOptions = {
		immovable: false,
		affectedByGravity: true,
		restitution: 0.8,
		staticFriction: 0.18,
		dynamicFriction: 0.08,
		mass: 0.9,
		inertiaScale: 1.05,
	};

	return {
		cyan: cyanPhysicsOptions,
		rose: rosePhysicsOptions,
	};
};
