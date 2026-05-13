// orbitalElements.js
import { magnitude, crossProduct } from './math.js';
import { SIM_UNITS } from "../constants.js";

function specificOrbitalEnergy(body, velocity, position) {
    const v = magnitude(velocity);
    const kineticEnergy = 0.5 * v ** 2;
    const potentialEnergy = -body.mu / magnitude(position);
    return kineticEnergy + potentialEnergy;
}

function semiMajorAxis(body, specificOrbitalEnergy) {
  return -body.mu / (2 * specificOrbitalEnergy);
}

function eccentricityVector(body, velocity, position) {
    const h = crossProduct(position, velocity);
    const r = magnitude(position);

    const ex = (velocity.y * h) / body.mu - position.x / r;
    const ey = (-velocity.x * h) / body.mu - position.y / r;

    return { x: ex, y: ey };
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

export {
    specificOrbitalEnergy,
    semiMajorAxis,
    eccentricityVector,
    apoapsis,
    periapsis,
    orbitalPeriod,
    orbitClassification,
    semiMajorAxisFromState
}