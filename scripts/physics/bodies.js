import { SIM_UNITS } from "../constants.js";
class Body {
    constructor(name, mass, radius, semiMajorAxis, ecentricity, position, velocity, acceleration, type, color, primary = null) {
        this.id = Math.random().toString(36).substr(2, 9);

        this.name = name;
        this.mass = mass;
        this.radius = radius;
        this.semiMajorAxis = semiMajorAxis;
        this.eccentricity = ecentricity;
        this.pos = position;
        this.prevPos = { ...position };
        this.vel = velocity;
        this.acc = acceleration;
        this.color = color;
        this.primary = primary;
        this.type = type; // Planet, Star, Probe, Asteroid, etc.

        if (this.type === "planet"){ 
            const r_p = this.semiMajorAxis * (1 - this.eccentricity);
            const v_p = Math.sqrt((SIM_UNITS.G * this.primary.mass * (1 + this.eccentricity)) / (this.semiMajorAxis * (1 - this.eccentricity)));
            this.pos = { x: r_p, y: 0 };
            this.vel = { x: 0, y: v_p };
        }

        this.trail = [];
    }

    computeAccelration(bodies, pos) {
        let acc = {x: 0, y: 0};

        for (let other of bodies) {
            if (other === this) continue;

            const dx = other.pos.x - pos.x;
            const dy = other.pos.y - pos.y;
            const distSq = Math.max(dx * dx + dy * dy, 1e-6);
            const dist = Math.sqrt(distSq);

            const a = (SIM_UNITS.G * other.mass) / distSq; // G * m / r^2 = acceleration
            acc.x += (a * dx) / dist;
            acc.y += (a * dy) / dist;
        }
        return acc;
    }

    updateRK4(bodies, dt) {
        const x = this.pos.x;
        const y = this.pos.y;
    
        const vx = this.vel.x;
        const vy = this.vel.y;
    
        // k1
        const a1 = this.computeAccelration(bodies, {x, y});
    
        const k1vx = a1.x * dt;
        const k1vy = a1.y * dt;
    
        const k1x = vx * dt;
        const k1y = vy * dt;
    
        // k2
        const a2 = this.computeAccelration(bodies, {x: x + k1x / 2, y: y + k1y / 2});
    
        const k2vx = a2.x * dt;
        const k2vy = a2.y * dt;
    
        const k2x = (vx + k1vx / 2) * dt;
        const k2y = (vy + k1vy / 2) * dt;
    
        // k3
        const a3 = this.computeAccelration(bodies, {x: x + k2x / 2, y: y + k2y / 2});
    
        const k3vx = a3.x * dt;
        const k3vy = a3.y * dt;
    
        const k3x = (vx + k2vx / 2) * dt;
        const k3y = (vy + k2vy / 2) * dt;
    
        // k4
        const a4 = this.computeAccelration(bodies, {x: x + k3x, y: y + k3y});
    
        const k4vx = a4.x * dt;
        const k4vy = a4.y * dt;
    
        const k4x = (vx + k3vx) * dt;
        const k4y = (vy + k3vy) * dt;

        return [
            {
                x: this.pos.x + (k1x + 2 * k2x + 2 * k3x + k4x) / 6,
                y: this.pos.y + (k1y + 2 * k2y + 2 * k3y + k4y) / 6
            },
            {
                x: this.vel.x + (k1vx + 2 * k2vx + 2 * k3vx + k4vx) / 6,
                y: this.vel.y + (k1vy + 2 * k2vy + 2 * k3vy + k4vy) / 6
            }
        ]
    }

    colided(bodies) {
        for (let other of bodies) {
            if (other === this) continue;
            if (this.detectCollision(other)) {
                return true;
            }
        };
        return false;
    }

    detectCollision(other) {
        const combinedRadius = this.radius + other.radius;
        const combinedRadiusSq = combinedRadius * combinedRadius;

        // Direct overlap at the end of the step.
        const dx = other.pos.x - this.pos.x;
        const dy = other.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= combinedRadiusSq) return true;

        // Swept collision check to avoid tunneling on large dt / high velocity.
        // Treat `other` as static during this step (good approximation for Sun/planets).
        const p0 = this.prevPos ?? this.pos;
        const p1 = this.pos;

        const sx = p1.x - p0.x;
        const sy = p1.y - p0.y;
        const segLenSq = sx * sx + sy * sy;
        if (segLenSq === 0) return false;

        const tRaw = ((other.pos.x - p0.x) * sx + (other.pos.y - p0.y) * sy) / segLenSq;
        const t = Math.max(0, Math.min(1, tRaw));

        const closestX = p0.x + sx * t;
        const closestY = p0.y + sy * t;
        const cdx = other.pos.x - closestX;
        const cdy = other.pos.y - closestY;

        return (cdx * cdx + cdy * cdy) <= combinedRadiusSq;
    }

    exceededBoundary(boundary = 1000) {
        return Math.abs(this.pos.x) > boundary || Math.abs(this.pos.y) > boundary;
    }
}

export default Body;