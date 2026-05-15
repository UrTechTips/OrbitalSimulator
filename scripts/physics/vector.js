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
}
export { Vector };