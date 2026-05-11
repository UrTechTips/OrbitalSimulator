import { SIM_UNITS, MAX_TRAIL_LENGTH } from "../constants.js";

function computeAccelration(body, bodies, pos) {
    let acc = {x: 0, y: 0};

    for (let other of bodies) {
        if (other === body) continue;

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

function updateRK4(body, bodies, dt) {
    const x = body.pos.x;
    const y = body.pos.y;

    const vx = body.vel.x;
    const vy = body.vel.y;

    // k1
    const a1 = computeAccelration(body, bodies, {x, y});

    const k1vx = a1.x * dt;
    const k1vy = a1.y * dt;

    const k1x = vx * dt;
    const k1y = vy * dt;

    // k2
    const a2 = computeAccelration(body, bodies, {x: x + k1x / 2, y: y + k1y / 2});

    const k2vx = a2.x * dt;
    const k2vy = a2.y * dt;

    const k2x = (vx + k1vx / 2) * dt;
    const k2y = (vy + k1vy / 2) * dt;

    // k3
    const a3 = computeAccelration(body, bodies, {x: x + k2x / 2, y: y + k2y / 2});

    const k3vx = a3.x * dt;
    const k3vy = a3.y * dt;

    const k3x = (vx + k2vx / 2) * dt;
    const k3y = (vy + k2vy / 2) * dt;

    // k4
    const a4 = computeAccelration(body, bodies, {x: x + k3x, y: y + k3y});

    const k4vx = a4.x * dt;
    const k4vy = a4.y * dt;

    const k4x = (vx + k3vx) * dt;
    const k4y = (vy + k3vy) * dt;

    // body.vel.x += (k1vx + 2 * k2vx + 2 * k3vx + k4vx) / 6;
    // body.vel.y += (k1vy + 2 * k2vy + 2 * k3vy + k4vy) / 6;

    // body.pos.x += (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
    // body.pos.y += (k1y + 2 * k2y + 2 * k3y + k4y) / 6;

    // body.trail.push({x: body.pos.x, y: body.pos.y});
    // if (body.trail.length > MAX_TRAIL_LENGTH) {
    //     body.trail.shift();
    // }

    return [
        {
            x: body.pos.x + (k1x + 2 * k2x + 2 * k3x + k4x) / 6,
            y: body.pos.y + (k1y + 2 * k2y + 2 * k3y + k4y) / 6,
        },
        {
            x: body.vel.x + (k1vx + 2 * k2vx + 2 * k3vx + k4vx) / 6,
            y: body.vel.y + (k1vy + 2 * k2vy + 2 * k3vy + k4vy) / 6,
        }
    ]
}

function update(body, bodies, dt) {
    body.acc = {x: 0, y: 0};
    for (let other of bodies) {
        if (other === body) continue;

        const dx = other.pos.x - body.pos.x;
        const dy = other.pos.y - body.pos.y;
        const distSq = Math.max(dx * dx + dy * dy, 1e-6);
        const dist = Math.sqrt(distSq);

        const forceMagnitude = (SIM_UNITS.G * other.mass) / distSq; // G * m / r^2 = acceleration
        body.acc.x += (forceMagnitude * dx) / dist;
        body.acc.y += (forceMagnitude * dy) / dist;
    }
    console.log(`${body.name} acceleration: (${body.acc.x.toFixed(5)}, ${body.acc.y.toFixed(5)})`);
    body.vel.x += body.acc.x * dt;
    body.vel.y += body.acc.y * dt;

    body.pos.x += body.vel.x * dt;
    body.pos.y += body.vel.y * dt;

    body.trail.push({x: body.pos.x, y: body.pos.y});
    if (body.trail.length > MAX_TRAIL_LENGTH) {
        body.trail.shift();
    }
}

export { update, updateRK4 };