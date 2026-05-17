// orbitalElements.js
import { Vector } from './vector.js';
import { SIM_UNITS } from "../constants.js";

function specificOrbitalEnergy(body, velocity, position) {
    if (body.mu === undefined) {
        throw new Error("Body must have mu property defined");
    }
    const v = velocity.magnitude();
    const kineticEnergy = 0.5 * v ** 2;
    const potentialEnergy = -body.mu / position.magnitude();
    return kineticEnergy + potentialEnergy;
}

function semiMajorAxis(body, specificOrbitalEnergy) {
    if (body.mu === undefined) {
        throw new Error("Body must have mu property defined");
    }
    return -body.mu / (2 * specificOrbitalEnergy);
}

function eccentricityVector(body, velocity, position) {
    if (body.mu === undefined) {
        throw new Error("Body must have mu property defined");
    }
    const h = position.crossProduct(velocity);
    const r = position.magnitude();

    const ex = (velocity.y * h) / body.mu - position.x / r;
    const ey = (-velocity.x * h) / body.mu - position.y / r;

    return new Vector(ex, ey);
}

function apoapsis(semiMajorAxis, eccentricity) {
    return semiMajorAxis * (1 + eccentricity);
}

function periapsis(semiMajorAxis, eccentricity) {
    return semiMajorAxis * (1 - eccentricity);
}

function orbitalPeriod(body, semiMajorAxis) {
    return 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / body.mu);
}

function orbitClassification(energy) {
    if (energy < 0) {
        return "Bound Elipse";
    } else if (energy === 0) {
        return "Parabolic Escape";
    } else {
        return "Hyperbolic Escape";
    }
}

function semiMajorAxisFromState(pos, vel, primaryMass) {
    const r = Math.sqrt(pos.x**2 + pos.y**2);
    const v2 = vel.x**2 + vel.y**2;

    const inverseA = (2 / r) - (v2 / (SIM_UNITS.G * primaryMass));
    if (inverseA <= 0) return Infinity; // Parabolic trajectory
    return 1 / inverseA;
}

function semiLatusRectum(body, velocity, position) {
    const h = position.crossProduct(velocity);
    if (body.mu === undefined) {
        throw new Error("Body must have mu property defined");
    }
    return (h ** 2) / body.mu;
}

function soi(body, primary) {
    let semiMajorAxis = semiMajorAxisFromState(body.pos, body.vel, primary.mass);
    return semiMajorAxis * Math.pow(body.mass / primary.mass, 2/5);
}

export {
    specificOrbitalEnergy,
    semiMajorAxis,
    eccentricityVector,
    apoapsis,
    periapsis,
    orbitalPeriod,
    orbitClassification,
    semiMajorAxisFromState, 
    semiLatusRectum,
    soi
}