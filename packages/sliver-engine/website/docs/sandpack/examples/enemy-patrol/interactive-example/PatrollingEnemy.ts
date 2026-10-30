import { GameObject, SquareHitbox, Vector, Walker } from "sliver-engine";

const ENEMY_SIZE = 18;

export class PatrollingEnemy extends GameObject {
	constructor(position: Vector) {
		super("enemy", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(ENEMY_SIZE, ENEMY_SIZE), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: false, affectedByGravity: false });

		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, ENEMY_SIZE, ENEMY_SIZE, "#f59e0b", true);
		});

		const walker = new Walker(
			this,
			[
				new Vector(92, 72),
				new Vector(398, 72),
				new Vector(398, 220),
				new Vector(92, 220),
			],
			96,
			true,
			true,
			{
				avoidObstacles: true,
				gridCellSize: 16,
				recalculateEveryTicks: 20,
				pathNotFoundBehavior: "snap",
				snapTargetToEdgeDistance: 32,
			},
		);

		this.setWalker(walker);
		walker.start();
	}
}
