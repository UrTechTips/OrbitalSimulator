import { SIM_UNITS } from "../constants.js";
import { semiMajorAxis, apoapsis, periapsis, eccentricityVector, orbitalPeriod, specificOrbitalEnergy, orbitClassification } from "../physics/orbitalElements.js";

function setSelectedBodyInfo(body) {
    const selectedInfo = document.getElementById("selected-body-info");
    let energy = specificOrbitalEnergy(body, body.vel, body.pos);
    let a = semiMajorAxis(body, energy);
    let e = eccentricityVector(body, body.vel, body.pos);
    let period = orbitalPeriod(body, a);
    let classification = orbitClassification(energy);
    selectedInfo.innerHTML = `
        <strong>${body.name}</strong><br>
        <div class="property">
            <h4>Energy: </h4>
            <p>${energy.toFixed(6)} ${SIM_UNITS.energy}</p>
        </div>
        <div class="property">
            <h4>SemiMajor Axis: </h4>
            <p>${a.toFixed(6)} ${SIM_UNITS.distance}</p>
        </div>
        <div class="property">
            <h4>Apoapsis: </h4>
            <p>${apoapsis(a, e.magnitude()).toFixed(2)} ${SIM_UNITS.distance}</p>
        </div>
        <div class="property">
            <h4>Periapsis: </h4>
            <p>${periapsis(a, e.magnitude()).toFixed(2)} ${SIM_UNITS.distance}</p>
        </div>
        <div class="property">
            <h4>Orbital Period: </h4>
            <p>${period.toFixed(2)} ${SIM_UNITS.time}</p>
        </div>
        <div class="property">
            <h4>Eccentricity: </h4>
            <p>${e.magnitude().toFixed(6)}</p>
        </div>
        <div class="property">
            <h4>Classification: </h4>
            <p>${classification}</p>
        </div>
        <div class="property">
            <h4>Type: </h4>
            <p>${body.type}</p>
        </div>`;
}

export { setSelectedBodyInfo };