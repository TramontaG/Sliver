import { CircleShape, ConvexPolygonShape } from "../Shapes";
import type { PhysicsTransform } from "../Shapes";

type ContactShape = CircleShape | ConvexPolygonShape;

type ContactProxy = {
	bodyId: string;
	shapeId: string;
	shape: ContactShape;
	transform: PhysicsTransform;
};

type ContactProxyOptions = {
	bodyId: string;
	shapeId: string;
	shape: ContactShape;
	transform: PhysicsTransform;
};

const cloneTransform = (transform: PhysicsTransform): PhysicsTransform => {
	return {
		position: transform.position.clone(),
		angle: transform.angle,
	};
};

const createContactProxy = (options: ContactProxyOptions): ContactProxy => {
	return {
		bodyId: options.bodyId,
		shapeId: options.shapeId,
		shape: options.shape,
		transform: cloneTransform(options.transform),
	};
};

export { createContactProxy };

export type { ContactProxy, ContactProxyOptions, ContactShape };
