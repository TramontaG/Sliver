import type { GameEvent } from "sliver-engine";
import {
	GameObject,
	Scene,
	SquareHitbox,
	Vector,
	Walker,
	grabbable,
	onKeyPressed,
	type WalkerPathNotFoundBehavior,
	type WalkerPathfindingOptions,
} from "sliver-engine";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;
const SCENE_BACKGROUND = "#0f172a";
const SHOW_HITBOXES = true;
const WALL_THICKNESS = 20;
const ACTOR_SIZE = new Vector(16, 16);
const WALKER_SPEED = 120;
const SNAP_DISTANCE = 96;
const DRAGGABLE_COLOR = "#475569";
const DRAGGABLE_COLOR_ACTIVE = "#64748b";
const DEFAULT_PATH_NOT_FOUND_BEHAVIOR: WalkerPathNotFoundBehavior = "snap";

const WALKER_WAYPOINTS = [
	new Vector(66, 66),
	new Vector(438, 66),
	new Vector(438, 250),
	new Vector(66, 250),
];

const BASE_PATHFINDING_OPTIONS: WalkerPathfindingOptions = {
	avoidObstacles: true,
	gridCellSize: 16,
	recalculateEveryTicks: 12,
	maxExpandedNodes: 8_000,
	maxSearchRadiusTiles: 48,
	snapTargetToEdgeDistance: SNAP_DISTANCE,
};

const createPathfindingOptions = (
	pathNotFoundBehavior: WalkerPathNotFoundBehavior,
): WalkerPathfindingOptions => ({
	...BASE_PATHFINDING_OPTIONS,
	pathNotFoundBehavior,
});

class WalkerDebugObstacle extends GameObject {
	protected readonly draggable: boolean;

	constructor(
		name: string,
		position: Vector,
		private readonly size: Vector,
		private readonly color: string,
		draggable: boolean = false,
	) {
		super(name, position.clone());
		this.draggable = draggable;
		this.setPhisics({
			immovable: true,
			affectedByGravity: false,
			restitution: 0,
			staticFriction: 0.6,
			dynamicFriction: 0.4,
			mass: 1,
			inertiaScale: 1,
		});
		this.addHitbox(
			new SquareHitbox(Vector.zero(), size.clone(), this, {
				solid: true,
				debug: SHOW_HITBOXES,
			}),
		);
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const drawer = canvas.getShapeDrawer();
			const fillColor =
				this.draggable && obj.beingGrabbed
					? DRAGGABLE_COLOR_ACTIVE
					: this.color;

			drawer.drawRectangle(pos.x, pos.y, this.size.x, this.size.y, fillColor, true);
			drawer.drawRectangle(
				pos.x,
				pos.y,
				this.size.x,
				this.size.y,
				"rgba(15,23,42,0.45)",
				false,
			);

			if (this.draggable) {
				drawer.drawText(
					"drag",
					pos.x + this.size.x / 2,
					pos.y + this.size.y / 2 + 4,
					"#e2e8f0",
					"10px",
					"center",
				);
			}
		});
	}
}

class DraggableWalkerDebugObstacle extends WalkerDebugObstacle {
	@grabbable<DraggableWalkerDebugObstacle>()
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}

class WalkerDebugPatrolActor extends GameObject {
	public readonly patrolWalker: Walker;
	private pathNotFoundBehavior: WalkerPathNotFoundBehavior =
		DEFAULT_PATH_NOT_FOUND_BEHAVIOR;

	constructor(position: Vector) {
		super("walker-debug-patroller", position.clone());
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			restitution: 0,
			staticFriction: 0.12,
			dynamicFriction: 0.06,
			mass: 1,
			inertiaScale: 1,
		});
		this.addHitbox(
			new SquareHitbox(Vector.zero(), ACTOR_SIZE, this, {
				solid: true,
				debug: SHOW_HITBOXES,
			}),
		);
		this.showOriginDebug = true;

		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const drawer = canvas.getShapeDrawer();

			drawer.drawRectangle(
				pos.x,
				pos.y,
				ACTOR_SIZE.x,
				ACTOR_SIZE.y,
				"#f59e0b",
				true,
			);
			drawer.drawRectangle(
				pos.x + 4,
				pos.y + 4,
				ACTOR_SIZE.x - 8,
				ACTOR_SIZE.y - 8,
				"#fde68a",
				true,
			);
			drawer.drawRectangle(
				pos.x,
				pos.y,
				ACTOR_SIZE.x,
				ACTOR_SIZE.y,
				"rgba(15,23,42,0.45)",
				false,
			);
		});

		this.patrolWalker = new Walker(
			this,
			WALKER_WAYPOINTS.map((waypoint) => waypoint.clone()),
			WALKER_SPEED,
			true,
			true,
			createPathfindingOptions(this.pathNotFoundBehavior),
		);
		this.setWalker(this.patrolWalker);
		this.patrolWalker.start();
	}

	public getPathNotFoundBehavior(): WalkerPathNotFoundBehavior {
		return this.pathNotFoundBehavior;
	}

	public setPathNotFoundBehavior(
		pathNotFoundBehavior: WalkerPathNotFoundBehavior,
	): void {
		this.pathNotFoundBehavior = pathNotFoundBehavior;
		this.patrolWalker.setPathfindingOptions(
			createPathfindingOptions(pathNotFoundBehavior),
		);
	}
}

class WalkerDebugController extends GameObject {
	constructor(private readonly patroller: WalkerDebugPatrolActor) {
		super("walker-debug-controller", Vector.zero(), false, true);
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	private resetWalker(): void {
		this.patroller.patrolWalker.hardReset();
		this.patroller.patrolWalker.start();
	}

	private setPathNotFoundBehavior(
		pathNotFoundBehavior: WalkerPathNotFoundBehavior,
	): void {
		this.patroller.setPathNotFoundBehavior(pathNotFoundBehavior);
	}

	@onKeyPressed<WalkerDebugController>(" ", (obj) =>
		obj.patroller.patrolWalker.toggle(),
	)
	@onKeyPressed<WalkerDebugController>("r", (obj) => obj.resetWalker())
	@onKeyPressed<WalkerDebugController>("p", (obj) =>
		obj.patroller.patrolWalker.requestPathRecalculation(),
	)
	@onKeyPressed<WalkerDebugController>("1", (obj) =>
		obj.setPathNotFoundBehavior("snap"),
	)
	@onKeyPressed<WalkerDebugController>("2", (obj) =>
		obj.setPathNotFoundBehavior("stop"),
	)
	@onKeyPressed<WalkerDebugController>("3", (obj) =>
		obj.setPathNotFoundBehavior("continue"),
	)
	@onKeyPressed<WalkerDebugController>("4", (obj) =>
		obj.setPathNotFoundBehavior("throw"),
	)
	@onKeyPressed<WalkerDebugController>("q", (obj) =>
		obj.patroller.patrolWalker.pausePathfinding(),
	)
	@onKeyPressed<WalkerDebugController>("e", (obj) =>
		obj.patroller.patrolWalker.resumePathfinding(),
	)
	@onKeyPressed<WalkerDebugController>("x", (obj) =>
		obj.patroller.patrolWalker.abortPathfinding(),
	)
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}

const formatVector = (vector: Vector | null): string => {
	if (!vector) {
		return "none";
	}

	return `${Math.round(vector.x)}, ${Math.round(vector.y)}`;
};

const createHud = (patroller: WalkerDebugPatrolActor): GameObject => {
	const hud = new GameObject(
		"walker-debug-hud",
		new Vector(CANVAS_WIDTH / 2, 20),
	);
	hud.setPhisics({ immovable: true, affectedByGravity: false });
	hud.setRenderFunction((obj, canvas) => {
		const drawer = canvas.getShapeDrawer();
		const pos = obj.getPosition();
		const walker = patroller.patrolWalker;
		const target = walker.getTargetedWaypoint();
		const pathNodes = walker.getCurrentPath().length;

		drawer.drawText(
			"Walker Debug Scene",
			pos.x,
			pos.y,
			"#f8fafc",
			"16px",
			"center",
		);
		drawer.drawText(
			"1 snap | 2 stop | 3 continue | 4 throw | Q pause | E resume | X abort",
			pos.x,
			pos.y + 18,
			"#cbd5e1",
			"11px",
			"center",
		);
		drawer.drawText(
			"Drag marked walls | Space toggle | R reset | P recalc",
			pos.x,
			pos.y + 34,
			"#94a3b8",
			"11px",
			"center",
		);
		drawer.drawText(
			`behavior: ${patroller.getPathNotFoundBehavior()} | pathfinding paused: ${walker.isPathfindingPaused() ? "yes" : "no"} | active: ${walker.isActive() ? "yes" : "no"}`,
			pos.x,
			pos.y + 50,
			"#7dd3fc",
			"11px",
			"center",
		);
		drawer.drawText(
			`target: ${formatVector(target)} | path nodes: ${pathNodes} | actor: ${formatVector(patroller.getScenePosition())} | speed: ${WALKER_SPEED}px/s`,
			pos.x,
			pos.y + 66,
			"#fcd34d",
			"11px",
			"center",
		);
	});
	return hud;
};

const createArena = (): GameObject[] => {
	return [
		new WalkerDebugObstacle(
			"floor",
			new Vector(0, CANVAS_HEIGHT - WALL_THICKNESS),
			new Vector(CANVAS_WIDTH, WALL_THICKNESS),
			"#334155",
		),
		new WalkerDebugObstacle(
			"ceiling",
			new Vector(0, 0),
			new Vector(CANVAS_WIDTH, WALL_THICKNESS),
			"#334155",
		),
		new WalkerDebugObstacle(
			"left-wall",
			new Vector(0, 0),
			new Vector(WALL_THICKNESS, CANVAS_HEIGHT),
			"#334155",
		),
		new WalkerDebugObstacle(
			"right-wall",
			new Vector(CANVAS_WIDTH - WALL_THICKNESS, 0),
			new Vector(WALL_THICKNESS, CANVAS_HEIGHT),
			"#334155",
		),
		new DraggableWalkerDebugObstacle(
			"obstacle-top-left",
			new Vector(154, 52),
			new Vector(40, 120),
			DRAGGABLE_COLOR,
			true,
		),
		new DraggableWalkerDebugObstacle(
			"obstacle-center-column",
			new Vector(356, 96),
			new Vector(44, 120),
			DRAGGABLE_COLOR,
			true,
		),
		new DraggableWalkerDebugObstacle(
			"obstacle-bottom-bar",
			new Vector(140, 228),
			new Vector(156, 40),
			DRAGGABLE_COLOR,
			true,
		),
		new DraggableWalkerDebugObstacle(
			"obstacle-left-column",
			new Vector(52, 116),
			new Vector(44, 120),
			DRAGGABLE_COLOR,
			true,
		),
	];
};

const createWalkerDebugScene = (): Scene => {
	const scene = new Scene("walker-debug-scene", SCENE_BACKGROUND);
	scene.setGravity(Vector.zero());

	const patroller = new WalkerDebugPatrolActor(WALKER_WAYPOINTS[0]!.clone());

	scene.addGameObject(createArena());
	scene.addGameObject([
		createHud(patroller),
		patroller,
		new WalkerDebugController(patroller),
	]);

	return scene;
};

export { CANVAS_HEIGHT, CANVAS_WIDTH, createWalkerDebugScene };
