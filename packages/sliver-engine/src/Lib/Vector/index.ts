class Vector {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	magnitude(): number {
		return Math.sqrt(this.squaredMagnitude());
	}

	squaredMagnitude(): number {
		return this.x * this.x + this.y * this.y;
	}

	isZero(epsilon: number = 0): boolean {
		const resolvedEpsilon = Math.max(0, epsilon);
		return this.squaredMagnitude() <= resolvedEpsilon * resolvedEpsilon;
	}

	add(other: Vector): Vector {
		this.x += other.x;
		this.y += other.y;
		return this;
	}

	toAdded(other: Vector): Vector {
		return new Vector(this.x + other.x, this.y + other.y);
	}

	subtract(other: Vector): Vector {
		this.x -= other.x;
		this.y -= other.y;
		return this;
	}

	toSubtracted(other: Vector): Vector {
		return new Vector(this.x - other.x, this.y - other.y);
	}

	multiply(scalar: number): Vector {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	toMultiplied(scalar: number): Vector {
		return new Vector(this.x * scalar, this.y * scalar);
	}

	dotProduct(other: Vector): number {
		return this.x * other.x + this.y * other.y;
	}

	crossProduct(other: Vector): number {
		return this.x * other.y - this.y * other.x;
	}

	leftPerpendicular(): Vector {
		const nextX = -this.y;
		const nextY = this.x;
		this.x = nextX;
		this.y = nextY;
		return this;
	}

	toLeftPerpendicular(): Vector {
		return this.clone().leftPerpendicular();
	}

	rightPerpendicular(): Vector {
		const nextX = this.y;
		const nextY = -this.x;
		this.x = nextX;
		this.y = nextY;
		return this;
	}

	toRightPerpendicular(): Vector {
		return this.clone().rightPerpendicular();
	}

	clone(): Vector {
		return new Vector(this.x, this.y);
	}

	equals(other: Vector): boolean {
		return this.x === other.x && this.y === other.y;
	}

	static zero(): Vector {
		return new Vector(0, 0);
	}

	normalize(minMagnitude: number = 0): Vector {
		const resolvedMinMagnitude = Math.max(0, minMagnitude);
		const length = this.magnitude();

		if (length <= resolvedMinMagnitude) {
			return this;
		}

		this.x /= length;
		this.y /= length;
		return this;
	}

	toNormalized(minMagnitude: number = 0): Vector {
		return this.clone().normalize(minMagnitude);
	}

	rotate(angle: number): Vector {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const nextX = this.x * cos - this.y * sin;
		const nextY = this.x * sin + this.y * cos;
		this.x = nextX;
		this.y = nextY;
		return this;
	}

	toRotated(angle: number): Vector {
		return this.clone().rotate(angle);
	}

	toWorldSpace(origin: Vector, angle: number): Vector {
		return this.toRotated(angle).add(origin);
	}

	toLocalSpace(origin: Vector, angle: number): Vector {
		return this.toSubtracted(origin).rotate(-angle);
	}
}

export { Vector };
