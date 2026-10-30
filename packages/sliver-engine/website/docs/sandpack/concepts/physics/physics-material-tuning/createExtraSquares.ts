import {
	GameObject,
	SquareHitbox,
	Vector,
	grabbable,
	type GameEvent,
} from "sliver-engine";
import {
	mapEnclosurePoint,
	scaleEnclosureOffset,
	scaleEnclosureSize,
} from "./enclosureDimensions";
import {
	createColorPhysicsOptions,
	type PhysicsOptions,
} from "./createColorPhysicsOptions";

type SquareConfig = {
	name: string;
	position: Vector;
	size: Vector;
	color: string;
	initialSpeed: Vector;
};

const CYAN_SQUARES: SquareConfig[] = [
	{
		name: "cyan-1",
		position: mapEnclosurePoint(68, 44),
		size: scaleEnclosureSize(14, 14),
		color: "#22d3ee",
		initialSpeed: scaleEnclosureOffset(120, 0),
	},
	{
		name: "cyan-2",
		position: mapEnclosurePoint(106, 58),
		size: scaleEnclosureSize(18, 18),
		color: "#22d3ee",
		initialSpeed: Vector.zero(),
	},
	{
		name: "cyan-3",
		position: mapEnclosurePoint(154, 50),
		size: scaleEnclosureSize(16, 16),
		color: "#22d3ee",
		initialSpeed: Vector.zero(),
	},
	{
		name: "cyan-4",
		position: mapEnclosurePoint(194, 64),
		size: scaleEnclosureSize(20, 20),
		color: "#22d3ee",
		initialSpeed: scaleEnclosureOffset(-90, 0),
	},
];

const ROSE_SQUARES: SquareConfig[] = [
	{
		name: "rose-1",
		position: mapEnclosurePoint(280, 48),
		size: scaleEnclosureSize(15, 15),
		color: "#fb7185",
		initialSpeed: scaleEnclosureOffset(-120, 0),
	},
	{
		name: "rose-2",
		position: mapEnclosurePoint(322, 60),
		size: scaleEnclosureSize(22, 22),
		color: "#fb7185",
		initialSpeed: Vector.zero(),
	},
	{
		name: "rose-3",
		position: mapEnclosurePoint(368, 54),
		size: scaleEnclosureSize(17, 17),
		color: "#fb7185",
		initialSpeed: Vector.zero(),
	},
	{
		name: "rose-4",
		position: mapEnclosurePoint(404, 66),
		size: scaleEnclosureSize(13, 13),
		color: "#fb7185",
		initialSpeed: scaleEnclosureOffset(90, 0),
	},
];

class ExtraSquare extends GameObject {
	private readonly size: Vector;

	constructor(config: SquareConfig, physicsOptions: PhysicsOptions) {
		super(config.name, config.position.clone());
		this.size = config.size.clone();
		this.addHitbox(
			new SquareHitbox(Vector.zero(), this.size.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics(physicsOptions);
		this.speed = config.initialSpeed.clone();
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, this.size.x, this.size.y, config.color, true);
		});
	}

	@grabbable()
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}

const buildSquares = (
	configs: SquareConfig[],
	physicsOptions: PhysicsOptions,
): ExtraSquare[] => {
	return configs.map((config) => new ExtraSquare(config, physicsOptions));
};

export const createExtraSquares = () => {
	const colorPhysicsOptions = createColorPhysicsOptions();
	return {
		cyan: buildSquares(CYAN_SQUARES, colorPhysicsOptions.cyan),
		rose: buildSquares(ROSE_SQUARES, colorPhysicsOptions.rose),
	};
};
