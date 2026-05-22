class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(b) {
        this.x += b.x;
        this.y += b.y;
        return this;
    }

    subtract(b) {
        this.x -= b.x;
        this.y -= b.y;
        return this;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    crossProduct(b) {
        return this.x * b.y - b.x * this.y;
    }

    dot(b) {
        return this.x * b.x + this.y * b.y;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleBetween(b) {
        return Math.atan2(this.y, this.x) - Math.atan2(b.y, b.x);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector(0, 0);
        return new Vector(this.x / mag, this.y / mag);
    }

    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };

    toString() {
        return `Vector(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    clone() {
        return new Vector(this.x, this.y);
    }
}
export { Vector };