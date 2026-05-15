// updateRK4All.js
import { SIM_UNITS } from "../constants.js";

function computeAccelration(body, ghostBodies, pos) {
    let acc = {x: 0, y: 0};
 
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
    return acc;
}
 
function updateRK4All(bodies, dt) {
 
    // k1 — use real positions as ghost
    const ghostK1 = bodies.map(b => ({ id: b.id, mass: b.mass, pos: { x: b.pos.x, y: b.pos.y } }));
    const k1 = [];
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const a = computeAccelration(body, ghostK1, { x: body.pos.x, y: body.pos.y });
        k1.push({
            dx:  body.vel.x * dt,
            dy:  body.vel.y * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        });
    }
 
    // k2 — ghost positions are each body advanced by half of k1
    const ghostK2 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k1[i].dx / 2, y: b.pos.y + k1[i].dy / 2 },
    }));
    const k2 = [];
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const midPos = ghostK2[i].pos;
        const midVx  = body.vel.x + k1[i].dvx / 2;
        const midVy  = body.vel.y + k1[i].dvy / 2;
        const a = computeAccelration(body, ghostK2, midPos);
        k2.push({
            dx:  midVx * dt,
            dy:  midVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        });
    }
 
    // k3 — ghost positions are each body advanced by half of k2
    const ghostK3 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k2[i].dx / 2, y: b.pos.y + k2[i].dy / 2 },
    }));
    const k3 = [];
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const midPos = ghostK3[i].pos;
        const midVx  = body.vel.x + k2[i].dvx / 2;
        const midVy  = body.vel.y + k2[i].dvy / 2;
        const a = computeAccelration(body, ghostK3, midPos);
        k3.push({
            dx:  midVx * dt,
            dy:  midVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        });
    }
 
    // k4 — ghost positions are each body advanced by full k3
    const ghostK4 = bodies.map((b, i) => ({
        id:   b.id,
        mass: b.mass,
        pos:  { x: b.pos.x + k3[i].dx, y: b.pos.y + k3[i].dy },
    }));
    const k4 = [];
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const endPos = ghostK4[i].pos;
        const endVx  = body.vel.x + k3[i].dvx;
        const endVy  = body.vel.y + k3[i].dvy;
        const a = computeAccelration(body, ghostK4, endPos);
        k4.push({
            dx:  endVx * dt,
            dy:  endVy * dt,
            dvx: a.x * dt,
            dvy: a.y * dt,
        });
    }
 
    // Combine — weighted average, index aligned, no .find()
    const results = [];
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        results.push({
            id:   body.id,
            newX: body.pos.x + (k1[i].dx  + 2*k2[i].dx  + 2*k3[i].dx  + k4[i].dx)  / 6,
            newY: body.pos.y + (k1[i].dy  + 2*k2[i].dy  + 2*k3[i].dy  + k4[i].dy)  / 6,
            newVx: body.vel.x + (k1[i].dvx + 2*k2[i].dvx + 2*k3[i].dvx + k4[i].dvx) / 6,
            newVy: body.vel.y + (k1[i].dvy + 2*k2[i].dvy + 2*k3[i].dvy + k4[i].dvy) / 6,
        });
    }
    return results;
}

export { updateRK4All };