// updateRK4All.js
import { SIM_UNITS } from "../constants.js";
import { Spacecraft } from "./bodies.js";
import { Vector } from './vector.js';   

function computeAcceleration(body, ghostBodies, pos) {
    let acc = new Vector(0, 0);
    // accel gravity
    for (let ghost of ghostBodies) {
        if (ghost.id === body.id) continue;
 
        const dx = ghost.pos.x - pos.x;
        const dy = ghost.pos.y - pos.y;
        const distSq = Math.max(dx * dx + dy * dy, 1e-6);
        const dist = Math.sqrt(distSq);
 
        const a = (SIM_UNITS.G * ghost.mass) / distSq;
        acc.x += (a * dx) / dist;
        acc.y += (a * dy) / dist;
    }
    // accel thrust

    if (body.type === "spacecraft" && body instanceof Spacecraft) {
        const thrust = body.computeThrust();
        acc.add(thrust);
    }

    return acc;
}
 
function updateRK4All(bodies, dt) {
 
    // ── k1  (evaluated at current state) ───────────────────────────────────
    const ghostK1 = bodies.map(b => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x, y: b.pos.y },
    }));
 
    const k1 = bodies.map(body => {
        const a = computeAcceleration(body, ghostK1, { x: body.pos.x, y: body.pos.y });
        return {
            dx:  body.vel.x * dt,
            dy:  body.vel.y * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        };
    });
 
    // ── k2  (evaluated at t + dt/2, positions advanced by k1/2) ───────────
    const ghostK2 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k1[i].dx / 2, y: b.pos.y + k1[i].dy / 2 },
    }));
 
    const k2 = bodies.map((body, i) => {
        const midPos = ghostK2[i].pos;
        const midVx  = body.vel.x + k1[i].dvx / 2;
        const midVy  = body.vel.y + k1[i].dvy / 2;
        const a = computeAcceleration(body, ghostK2, midPos);
        return {
            dx:  midVx * dt,
            dy:  midVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        };
    });
 
    // ── k3  (evaluated at t + dt/2, positions advanced by k2/2) ───────────
    const ghostK3 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k2[i].dx / 2, y: b.pos.y + k2[i].dy / 2 },
    }));
 
    const k3 = bodies.map((body, i) => {
        const midPos = ghostK3[i].pos;
        const midVx  = body.vel.x + k2[i].dvx / 2;
        const midVy  = body.vel.y + k2[i].dvy / 2;
        const a = computeAcceleration(body, ghostK3, midPos);
        return {
            dx:  midVx * dt,
            dy:  midVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        };
    });
 
    // ── k4  (evaluated at t + dt, positions advanced by full k3) ──────────
    const ghostK4 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k3[i].dx, y: b.pos.y + k3[i].dy },
    }));
 
    const k4 = bodies.map((body, i) => {
        const endPos = ghostK4[i].pos;
        const endVx  = body.vel.x + k3[i].dvx;
        const endVy  = body.vel.y + k3[i].dvy;
        const a = computeAcceleration(body, ghostK4, endPos);
        return {
            dx:  endVx * dt,
            dy:  endVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        };
    });
 
    // ── Weighted average  (1/6, 1/3, 1/3, 1/6) ────────────────────────────
    return bodies.map((body, i) => ({
        id:   body.id,
        newX:  body.pos.x + (k1[i].dx  + 2*k2[i].dx  + 2*k3[i].dx  + k4[i].dx)  / 6,
        newY:  body.pos.y + (k1[i].dy  + 2*k2[i].dy  + 2*k3[i].dy  + k4[i].dy)  / 6,
        newVx: body.vel.x + (k1[i].dvx + 2*k2[i].dvx + 2*k3[i].dvx + k4[i].dvx) / 6,
        newVy: body.vel.y + (k1[i].dvy + 2*k2[i].dvy + 2*k3[i].dvy + k4[i].dvy) / 6,
    }));
}


export { updateRK4All };