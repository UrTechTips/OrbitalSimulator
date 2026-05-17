class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    crossProduct(b) {
        return this.x * b.y - b.x * this.y;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector(0, 0);
        return new Vector(this.x / mag, this.y / mag);
    }

    scale(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    };
}
export { Vector };