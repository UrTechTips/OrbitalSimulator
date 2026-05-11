class Camera {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.scale = 100;
    }

    worldToScreen(worldX, worldY, canvas)  {
        return [
            (worldX - this.x) * this.scale + canvas.width / 2,
            - (worldY - this.y) * this.scale + canvas.height / 2
        ]
    }

    screenToWorld(screenX, screenY, canvas) {
        return [
            (screenX - canvas.width / 2) / this.scale + this.x,
            - ((screenY - canvas.height / 2) / this.scale) + this.y
        ]
    }

    zoom(factor) {
        this.scale *= factor;
        if (this.scale < 60) this.scale = 60;
        if (this.scale > 500) this.scale = 500;
    }
}

export default Camera;