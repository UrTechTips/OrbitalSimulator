import { SIM_UNITS } from "../constants.js";
import { Vector } from "./vector.js";
import { soi } from "./orbitalElements.js";
class Body {
    constructor(name, mass, radius, position, velocity, acceleration, type, color, primary = null) {
        this.id = Math.random().toString(36).substr(2, 9);

        this.name = name;
        this.mass = mass;
        this.radius = radius;
        this.pos = position; // pos is an vector object with x and y properties
        this.prevPos = new Vector(position.x, position.y);
        this.vel = velocity;
        this.acc = acceleration;
        this.color = color;
        this.primary = primary;
        this.type = type; // Planet, Star, Probe, Asteroid, etc.

        if (primary) {
            this.mu = SIM_UNITS.G * primary.mass;
            this.rel_vel = new Vector(this.vel.x - primary.vel.x, this.vel.y - primary.vel.y);
            this.rel_pos = new Vector(this.pos.x - primary.pos.x, this.pos.y - primary.pos.y);
        }

        this.trail = [];
    }

    initPlanet(semiMajorAxis, eccentricity) {
        if (this.type !== "planet" || !this.primary) return;
        const r_p = semiMajorAxis * (1 - eccentricity);
        const v_p = Math.sqrt((SIM_UNITS.G * this.primary.mass * (1 + eccentricity)) / (semiMajorAxis * (1 - eccentricity)));
        this.pos = new Vector(r_p, 0);
        this.vel = new Vector(0, v_p);

        return this;
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

class CelestialBody extends Body {
    constructor(name, mass, radius, position, velocity, acceleration, type, color, primary = null) {
        super(name, mass, radius, position, velocity, acceleration, type, color, primary);
    }
}

class Spacecraft extends Body {
    constructor(name, mass, radius, position, velocity, acceleration, color, primary = null, fuel = 0) {
        super(name, mass, radius, position, velocity, acceleration, "spacecraft", color, primary);
        this.fuel = fuel;

        this.maxThrust = 0;
        this.isp = 300;

        this.rotation = 0;
        this.angularVelocity = 0;

        this.orbit = {
            semiMajorAxis: null,
            eccentricity: null,
            inclination: null,
            periapsis: null,
            apoapsis: null,
            period: null,
            trueAnomaly: null,
            orbitType: null,
        }

        this.target = null;
        this.missionPhase = "idle";
        this.deltaVRemaining = 0;
        this.manuverQueue = [];

        this.predictedOrbitPoints = [];
        this.predictedEncounters = [];        
    }

    setPrimaryBody(bodies) {
        let influencer = null;
        for (let body of bodies) {
            if (body === this) continue;
            if (body.type === "star") continue;
            const dx = body.pos.x - this.pos.x;
            const dy = body.pos.y - this.pos.y;
            const distSq = dx * dx + dy * dy;
            let soiRadius = soi(body, body.primary);
            if (distSq < soiRadius) {
                influencer = body;
            }
        }
        if (influencer) {
            super.primary = influencer;
            super.mu = SIM_UNITS.G * influencer.mass;
        } else {
            super.primary = null;
            super.mu = 0;
        }
    }

    calculateThrust() {
        return new Vector(0, 0);
    }

    consumeFuel(deltaV, exhauseVelocity) {
        // From Tsiolkovsky rocket equation: deltaV = exhaustVelocity * ln(m0 / mf)
        const m0 = this.fuel + this.mass;
        const exp = Math.exp(-deltaV / exhauseVelocity);
        const mf = m0 * exp;
        this.fuel = mf - this.mass; // Mass = dry mass + fuel so fuel = mf - dry mass
    }

    instantBurn(dv, theta) {
        const burnVector = new Vector(dv * Math.cos(theta), dv * Math.sin(theta));
        this.vel.x += burnVector.x;
        this.vel.y += burnVector.y;
        this.consumeFuel(dv, this.isp * SIM_UNITS.g0);
    }

    progradeBurn(dv) {
        const burnVector = this.vel.normalize().scale(dv);
        this.vel.x += burnVector.x;
        this.vel.y += burnVector.y;
        this.consumeFuel(dv, this.isp * SIM_UNITS.g0);
        if (this.fuel <= 0) {
            alert("Fuel completed")
        }
    }

    retrogradeBurn(dv) {
        const burnVector = this.vel.normalize().scale(-dv);
        this.vel.x += burnVector.x;
        this.vel.y += burnVector.y;
        this.consumeFuel(dv, this.isp * SIM_UNITS.g0);
    }
}

export default Body;
export { CelestialBody, Spacecraft };