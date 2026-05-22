import { SIM_UNITS } from "../constants.js";
import { Vector } from "./vector.js";
import { soi, semiMajorAxis, eccentricityVector, periapsis, apoapsis, orbitalPeriod, specificOrbitalEnergy } from "./orbitalElements.js";
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
    constructor(name, mass, radius, position, velocity, acceleration, color, primary = null, fuelMass = 0) {
        super(name, fuelMass + mass, radius, position, velocity, acceleration, "spacecraft", color, primary);
        this.fuelMass = fuelMass;
        this.dryMass  = mass;
        this.mass     = this.dryMass + this.fuelMass;
 
        this.maxThrust = 400 * SIM_UNITS.N_TO_SIMF;   // Newtons
        this.isp       = 310; // seconds  (bipropellant probe standard, e.g. Cassini main engine)
 
        this.throttle       = 0;
        this.engineOn       = false;
        this.thrustDirection = new Vector(0, 0); // unit vector set by maneuver executor BEFORE RK4
 
        this.rotation        = 0;
        this.angularVelocity = 0;
 
        this.orbit = {
            semiMajorAxis: null,
            eccentricity:  null,
            inclination:   null,
            periapsis:     null,
            apoapsis:      null,
            period:        null,
            trueAnomaly:   null,
            orbitType:     null,
        };
 
        this.target       = null;
        this.missionPhase = "idle";
        this.manuverQueue = [];
 
        this.predictedOrbitPoints = [];
        this.predictedEncounters  = [];
    }

    setPrimaryBody(bodies) {
        let influencer = null;
        let star       = null;
 
        for (let body of bodies) {
            if (body === this) continue;
            if (body.type === "star") {
                star = body;
                continue;
            }
            const dx     = body.pos.x - this.pos.x;
            const dy     = body.pos.y - this.pos.y;
            const distSq = dx * dx + dy * dy;
            const soiR   = soi(body, body.primary);
            if (distSq < soiR * soiR) {
                influencer = body;
            }
        }
 
        const primary = influencer ?? star;
        super.primary = primary;
        super.mu      = SIM_UNITS.G * primary.mass;
        this.rel_vel  = new Vector(this.vel.x - primary.vel.x, this.vel.y - primary.vel.y);
        this.rel_pos  = new Vector(this.pos.x - primary.pos.x, this.pos.y - primary.pos.y);
    }

    updateMass() {
        this.mass = this.dryMass + this.fuelMass;
    }

    computeThrust() {
        if (!this.engineOn || this.throttle <= 0 || this.fuelMass <= 0) {
            return new Vector(0, 0);
        }
        const thrust       = this.maxThrust * this.throttle;        
        const accMagnitude = thrust / this.mass;                     
        return this.thrustDirection.normalize().scale(accMagnitude); 
    }

    consumeFuelContinuous(dt) {
        if (!this.engineOn || this.throttle <= 0) return;
 
        const thrust        = this.maxThrust * this.throttle;
        const massFlowRate  = thrust / (this.isp * SIM_UNITS.g0);  // kg/s
        const fuelConsumed  = massFlowRate * dt;                    // kg
 
        this.fuelMass = Math.max(this.fuelMass - fuelConsumed, 0);
        this.updateMass();
 
        if (this.fuelMass <= 0) {
            this.engineOn = false;
            this.throttle  = 0;
            console.warn(`${this.name}: fuel depleted.`);
            // alert() avoided — it freezes the sim loop; handle UI notification externally
        }
    }

    consumeFuelImpulse(deltaV) {
        const exhaustVelocity = this.isp * SIM_UNITS.g0;           // m/s  (Ve = Isp * g0)
        const m0   = this.dryMass + this.fuelMass;                  // total mass before burn
        const mf   = m0 * Math.exp(-deltaV / exhaustVelocity);      // total mass after burn
        this.fuelMass = Math.max(mf - this.dryMass, 0);             // extract dry mass
        this.updateMass();
 
        if (this.fuelMass <= 0) {
            console.warn(`${this.name}: fuel depleted after impulsive burn.`);
        }
    }

    instantBurn(dv, theta) {
        const burnVector = new Vector(dv * Math.cos(theta), dv * Math.sin(theta));
        this.vel.add(burnVector);
        this.consumeFuelImpulse(dv);
    }

    progradeBurn(dv) {
        const burnVector = this.vel.normalize().scale(dv);
        this.vel.add(burnVector);
        this.consumeFuelImpulse(dv);
    }

    retrogradeBurn(dv) {
        const burnVector = this.vel.normalize().scale(-dv);
        this.vel.add(burnVector);
        this.consumeFuelImpulse(dv);
    }

    circularize() {
        if (!this.primary) {
            return;
        };
        const h = this.rel_pos.x * this.rel_vel.y - this.rel_pos.y * this.rel_vel.x;
        
        const radialDirection = this.rel_pos.normalize();
        let tangentialDirection;
        if (h >= 0) {
            tangentialDirection = new Vector(-radialDirection.y, radialDirection.x);
        } else {
            tangentialDirection = new Vector(radialDirection.y, -radialDirection.x);
        }
        
        const radialVelocity = this.rel_vel.dot(radialDirection);
        const tangentialVelocity = this.rel_vel.dot(tangentialDirection);
        
        const r = this.rel_pos.magnitude();
        const circularVelocity = Math.sqrt(this.mu / r);
        const tangentialDeltaV = circularVelocity - tangentialVelocity;

        const radialCorrection = radialDirection.scale(-radialVelocity);
        const tangentialCorrection = tangentialDirection.scale(tangentialDeltaV);

        const burnVector = radialCorrection.add(tangentialCorrection);
        const deltaV = burnVector.magnitude();

        this.vel.add(burnVector);
        this.consumeFuelImpulse(deltaV);
    }

    updateOrbit() {
        // Updates this.orbit based on current rel_pos and rel_vel using standard orbital mechanics formulas.
        if (!this.primary) return;

        let specificEnergy = specificOrbitalEnergy(this, this.rel_pos, this.rel_vel);
        let semiMajor = semiMajorAxis(this, specificEnergy);
        let eccentricityVec = eccentricityVector(this, this.rel_vel, this.rel_pos);
        let eccentricity = eccentricityVec.magnitude();
        let peri = periapsis(semiMajor, eccentricity);
        let apoa = apoapsis(semiMajor, eccentricity);
        let period = orbitalPeriod(this, semiMajor);
        
        let h = this.rel_pos.x * this.rel_vel.y - this.rel_pos.y * this.rel_vel.x;
        let nu = Math.atan2(this.rel_pos.y, this.rel_pos.x) - Math.atan2(eccentricityVec.y, eccentricityVec.x);
        if (h < 0) { nu = -nu; }
        nu = ((nu + 2 * Math.PI) % (2 * Math.PI)); // Normalize to [0, 2π]
        this.orbit.trueAnomaly = nu;
        this.orbit.orbitType = (this.orbit.eccentricity < 1) ? "elliptical" : (this.orbit.eccentricity === 1) ? "parabolic" : "hyperbolic";
        this.orbit.semiMajorAxis = semiMajor;
        this.orbit.eccentricity = eccentricity;
        this.orbit.periapsis = peri;
        this.orbit.apoapsis = apoa;
        this.orbit.period = period;
    }

    /**
     * Schedules a slow (finite-thrust) maneuver.
     *
     * @param {object}  options
     * @param {string}  options.burnMode       - "prograde" | "retrograde" | "radial" | "fixed"
     * @param {number}  options.deltaV         - total deltaV to deliver (m/s)
     * @param {Vector}  [options.fixedDirection] - required if burnMode = "fixed"
     * @param {string}  [options.trigger]      - "now" | "atApoapsis" | "atPeriapsis" | "atTime"
     * @param {number}  [options.triggerTime]  - sim time (s), required if trigger = "atTime"
     */
    scheduleManeuver(burnMode, deltaV, fixedDirection = null, trigger = "now", triggerTime = null ) {
        console.log(`${this.name}: scheduling maneuver - burnMode: ${burnMode}, deltaV: ${deltaV.toFixed(2)} m/s, trigger: ${trigger}${trigger === "atTime" ? ` at t=${triggerTime}s` : ""}`);
        this.manuverQueue.push({
            burnMode,
            deltaV,
            fixedDirection,
            trigger,
            triggerTime,
            deltaVDelivered: 0,   // accumulates each timestep — initialized to 0 (not undefined)
            executed: false,
        });
    }
    
    scheduleCircularize() {
        const EPSILON = 0.1;

        if (!this.primary) return;
 
        const r = this.orbit.apoapsis;
        const vCurrent = Math.sqrt(this.mu * (2 / r - 1 / this.orbit.semiMajorAxis));
        const vCircular = Math.sqrt(this.mu / r);
        const deltaV = vCircular - vCurrent;
        console.log(`${this.name}: current velocity at apoapsis: ${vCurrent.toFixed(2)} m/s, circular velocity: ${vCircular.toFixed(2)} m/s, deltaV for circularization: ${deltaV.toFixed(2)} m/s`);
        if (Math.abs(deltaV) < EPSILON) { return; }
        if (deltaV < 0) {
            this.scheduleManeuver("retrograde", Math.abs(deltaV), null, "atApoapsis");
        } else {
            this.scheduleManeuver("prograde", Math.abs(deltaV), null, "atApoapsis");
        }
        console.log(`${this.name}: Maneuver Queue: `, this.manuverQueue);
    }

    /**
     * Maneuver executor — call this BEFORE RK4 each timestep.
     * Sets thrustDirection, throttle, engineOn so that computeThrust() (called
     * inside RK4) reads the correct values for this frame.
     *
     * @param {number} dt         - timestep in seconds
     * @param {number} simTime    - current simulation time in seconds
     */
    manuver(dt, simTime) {
        if (this.manuverQueue.length === 0) {
            this.engineOn = false;
            return;
        }
        
        const maneuver = this.manuverQueue[0];
        // Check cutoff
        if (maneuver.deltaVDelivered >= maneuver.deltaV) {
            this.engineOn        = false;
            this.throttle        = 0;
            this.thrustDirection = new Vector(0, 0);
            this.manuverQueue.shift();
            this.manuver(dt, simTime);
            return;
        }
        
        if (this._triggerMet(maneuver, simTime)) {
            console.log(`${this.name}: Trigger condition met for maneuver: `, maneuver);
            // Resolve burn direction from current orbital state
            const dir = this._resolveDirection(maneuver);
            console.log(`${this.name}: Resolved burn direction: ${dir.toString()}`);
 
            // Resolve throttle — tapers near cutoff to avoid overshoot
            const throttle = this._resolveThrottle(maneuver, dt);
            console.log(`${this.name}: Resolved throttle: ${(throttle * 100).toFixed(1)}%`);
 
            this.thrustDirection = dir;
            this.throttle        = throttle;
            this.engineOn        = true;
 
            // Accumulate delivered deltaV using CURRENT mass (mass decreases each frame
            // as fuel burns, which is correct — F/m increases as mass drops)
            const accMagnitude = (this.maxThrust * throttle) / this.mass;
            maneuver.deltaVDelivered += accMagnitude * dt;
        } else {
            // Waiting for trigger condition — engine off
            this.engineOn = false;
            this.throttle  = 0;
        }
    }

    /**
     * Checks whether a maneuver's trigger condition is satisfied.
     * @private
     */
    _triggerMet(maneuver, simTime) {
        switch (maneuver.trigger) {
            case "now":
                return true;
            case "atTime":
                return simTime >= maneuver.triggerTime;
            case "atApoapsis":
                return Math.abs(Math.abs(this.orbit.trueAnomaly) - Math.PI) < 0.035;
            case "atPeriapsis":
                return Math.abs(this.orbit.trueAnomaly) < 0.035;
            default:
                return false;
        }
    }
 
    /**
     * Resolves the burn direction vector from the maneuver's burnMode.
     * Uses CURRENT velocity and position — called fresh each timestep.
     * @private
     */
    _resolveDirection(maneuver) {
        switch (maneuver.burnMode) {
            case "prograde":
                console.log(`${this.name}: Resolving prograde burn direction from current velocity: ${this.rel_vel.toString()}`);
                // Along current velocity — raises apoapsis (or periapsis if at apoapsis)
                return this.rel_vel.normalize();
 
            case "retrograde":
                // Against current velocity — lowers orbit
                return this.rel_vel.normalize().scale(-1);
 
            case "radial":
                // Away from primary — changes orbit shape without deltaV efficiency
                return this.rel_pos.normalize();
 
            case "antiradial":
                return this.rel_pos.normalize().scale(-1);
 
            case "fixed":
                // Pre-computed direction stored at scheduling time (e.g. circularize)
                return maneuver.fixedDirection.normalize();
 
            default:
                console.warn(`Unknown burnMode: ${maneuver.burnMode}`);
                return new Vector(0, 0);
        }
    }
 
    /**
     * Resolves throttle for this timestep.
     * Assumes full throttle (1.0) until the remaining deltaV is small enough
     * that a full-throttle burn over one dt would overshoot.
     * In that case, fractional throttle is used for precision cutoff.
     *
     * timeToCutoff = (remainingDV * mass) / (maxThrust * 1.0)
     * if timeToCutoff < dt → fractional throttle
     *
     * NOTE: Does NOT read this.throttle — avoids the stale-read / div-by-zero bug.
     * @private
     */
    _resolveThrottle(maneuver, dt) {
        const remaining     = maneuver.deltaV - maneuver.deltaVDelivered;
        const accelAtFull   = this.maxThrust / this.mass;         // m/s² at 100% throttle
        const timeToCutoff  = remaining / accelAtFull;            // seconds until done at full thrust
 
        if (timeToCutoff < dt) {
            // Final fractional pulse — clamp to [0,1]
            return Math.min(Math.max(remaining / (accelAtFull * dt), 0), 1);
        }
        return 1.0;
    }
}

export default Body;
export { CelestialBody, Spacecraft };