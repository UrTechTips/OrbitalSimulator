function scheduleCircularize(body) {
    const EPSILON = 0.1;

    if (!body.primary) return;

    // console.log(`${body.name}: current velocity at apoapsis: ${vCurrent.toFixed(2)} m/s, circular velocity: ${vCircular.toFixed(2)} m/s, deltaV for circularization: ${deltaV.toFixed(2)} m/s`);
    // if (Math.abs(deltaV) < EPSILON) { return; }
    // if (deltaV < 0) {
    //     body.scheduleManeuver("retrograde", Math.abs(deltaV), null, "atApoapsis");
    // } else {
    //     body.scheduleManeuver("prograde", Math.abs(deltaV), null, "atApoapsis");
    // }
    body.scheduleManeuver("circularize", 0, null, "atApoapsis");
    console.log(`${body.name}: Maneuver Queue: `, body.manuverQueue);
}

function changeApoapsis(body, target_apoapsis) {
    const vCurrent = Math.sqrt(body.mu * (2 / body.orbit.apoapsis - 1 / body.orbit.semiMajorAxis));
    const a_new = (body.orbit.periapsis + target_apoapsis) / 2;
    const vNew = Math.sqrt(body.mu * (2 / body.orbit.apoapsis - 1 / a_new));
    const deltaV = vNew - vCurrent;

    if (deltaV < 0) {
        body.scheduleManeuver("retrograde", Math.abs(deltaV), null, "atPeriapsis");
    } else {
        body.scheduleManeuver("prograde", Math.abs(deltaV), null, "atPeriapsis");
    }
}

function changePeriapsis(body, target_periapsis) {
    const vCurrent = Math.sqrt(body.mu * (2 / body.orbit.periapsis - 1 / body.orbit.semiMajorAxis));
    const a_new = (target_periapsis + body.orbit.apoapsis) / 2;
    const vNew = Math.sqrt(body.mu * (2 / body.orbit.periapsis - 1 / a_new));
    const deltaV = vNew - vCurrent;

    if (deltaV < 0) {
        body.scheduleManeuver("retrograde", Math.abs(deltaV), null, "atApoapsis");
    } else {
        body.scheduleManeuver("prograde", Math.abs(deltaV), null, "atApoapsis");
    }
}

function hofmannTransfer(body, targetOrbit) {
    const r1 = body.orbit.periapsis;   // burn 1 happens AT periapsis
    const r2 = targetOrbit;

    if (Math.abs(r2 - r1) < 1e-6) return;   // already there

    const a_transfer = (r1 + r2) / 2;

    // Burn 1 — at periapsis, inject into transfer ellipse
    const v1_circular = Math.sqrt(body.mu / r1);
    const v1_transfer = Math.sqrt(body.mu * (2/r1 - 1/a_transfer));
    const deltaV1     = v1_transfer - v1_circular;
    body.scheduleManeuver(deltaV1 >= 0 ? "prograde" : "retrograde", Math.abs(deltaV1), null, "atPeriapsis");

    // Burn 2 — at apoapsis of transfer ellipse (= r2), circularize
    const v2_transfer = Math.sqrt(body.mu * (2/r2 - 1/a_transfer));
    const v2_circular = Math.sqrt(body.mu / r2);
    const deltaV2     = v2_circular - v2_transfer;
    body.scheduleManeuver(deltaV2 >= 0 ? "prograde" : "retrograde", Math.abs(deltaV2), null, "atApoapsis");

    console.log(`Hohmann: r1=${r1.toFixed(4)} r2=${r2.toFixed(4)} dV1=${deltaV1.toFixed(4)} dV2=${deltaV2.toFixed(4)}`);
}

export { scheduleCircularize, changeApoapsis, changePeriapsis, hofmannTransfer };