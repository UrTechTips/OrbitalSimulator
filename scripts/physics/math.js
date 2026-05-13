function magnitude(vector) {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2);
}

function crossProduct(a, b) {
    return a.x * b.y - b.x * a.y;
}

export { magnitude, crossProduct };