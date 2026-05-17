import { semiMajorAxisFromState, semiLatusRectum, eccentricityVector, soi } from "../physics/orbitalElements.js"
import { Vector } from "../physics/vector.js";
import { getVisualRadius } from "./utils.js";
import { updateRK4All } from '../physics/rk4All.js';

let orbitWorker;
try {
    orbitWorker = new Worker('/workers/orbitWorker.js', { type: 'module' });
}catch (err) {
    console.error("Failed to load worker:", err);
}
let cachedOrbitPaths = [];
let workerBusy = false;

orbitWorker.onmessage = function(e) {
    cachedOrbitPaths = e.data.bodiesPositions;
    workerBusy = false;
};
orbitWorker.onerror = function(err) {
    console.error("Worker failed to load or threw:", err);
    console.error("Message:", err.message);
    console.error("Filename:", err.filename);
    console.error("Line:", err.lineno);
};

function drawBody(ctx, body, camera, canvas) {
    const [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    const r = getVisualRadius(body, camera);

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 2 * Math.PI);
    if (body.type === "star") {
        ctx.shadowColor = body.color;
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowColor = body.color;
        ctx.shadowBlur = 5;
    }
    ctx.strokeStyle = body.color;
    ctx.fillStyle = body.color;
    ctx.fillText(body.name, sx + r + 2, sy - r - 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // if (body.type != "asteroid" && body.type != "planet") return;
    ctx.beginPath();
    ctx.strokeStyle = body.color;
    ctx.lineWidth = 2;
    if (body.trail.length > 0) {
        const [sx, sy] = camera.worldToScreen(body.trail[0].x, body.trail[0].y, canvas);
        ctx.moveTo(sx, sy);

        for (let j = 1; j < body.trail.length; j++) {
            const [x, y] = camera.worldToScreen(body.trail[j].x, body.trail[j].y, canvas);
            ctx.lineTo(x, y); 
        }

    }
    ctx.stroke();
    ctx.closePath();
};


function drawSOI(ctx, body, primary, camera, canvas) {
    const realSOI_AU  = soi(body, primary);
    const realSOI_px  = realSOI_AU * camera.scale;
    const visualSOI_px = Math.max(realSOI_px, getVisualRadius(body, camera) + 8);

    const [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    ctx.beginPath();
    ctx.arc(sx, sy, visualSOI_px, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();
}

function drawVelocityArrow(ctx, body, camera, canvas) {
    const [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    
    // Convert velocity endpoint to screen space
    const tipWorld = { x: body.pos.x + body.vel.x / 3, y: body.pos.y + body.vel.y / 3 };
    const [tx, ty] = camera.worldToScreen(tipWorld.x, tipWorld.y, canvas);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = "rgba(255, 255, 100, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(ty - sy, tx - sx);
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - headLen * Math.cos(angle - 0.4), ty - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(tx - headLen * Math.cos(angle + 0.4), ty - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 100, 0.8)";
    ctx.fill();
}

function drawSemiMajorAxisDisplay(ctx, body, camera, canvas, bodies) {
    let [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    let smAxis = semiMajorAxisFromState(body.pos, body.vel, bodies[0].mass);
    ctx.fillStyle = "white";
    ctx.font = "11px monospace";
    if (isFinite(smAxis)) {
        ctx.fillText(`Semi-major Axis: ${smAxis.toFixed(2)} AU`, sx, sy + 10 + getVisualRadius(body, camera));
    } else {
        ctx.fillText(`Semi-major Axis: Escaping Orbit`, sx, sy + 10 + getVisualRadius(body, camera));
    }
}
function drawVelocityDisplay(ctx, body, camera, canvas, bodies) {
    let [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    let velocity = Math.sqrt(body.vel.x**2 + body.vel.y**2);
    ctx.fillStyle = "white";
    ctx.font = "11px monospace";
    ctx.fillText(`Velocity: ${velocity.toFixed(2)} AU/yr`, sx, sy + 10 + getVisualRadius(body, camera));
}

function drawHoverInfo(ctx, body, camera, canvas) {
    // TODO: Implement an info box
    const [sx, sy] = camera.worldToScreen(body.pos.x, body.pos.y, canvas);
    ctx.beginPath();
    ctx.arc(sx, sy, getVisualRadius(body, camera) + 10, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();
}

function drawEstimatedOrbit(ctx, body, camera, canvas) {
    if (body.primary ===  null) return;

    let relVelocity = new Vector(body.vel.x - body.primary.vel.x, body.vel.y - body.primary.vel.y);
    let relPosition = new Vector(body.pos.x - body.primary.pos.x, body.pos.y - body.primary.pos.y);

    let p = semiLatusRectum(body, relVelocity, relPosition);
    let ev = eccentricityVector(body, relVelocity, relPosition);
    let e = ev.magnitude();
    let omega = Math.atan2(ev.y, ev.x);

    function r(theta) {
        return p / (1 + e * Math.cos(theta));
    }
    const [sx, sy] = camera.worldToScreen(body.primary.pos.x, body.primary.pos.y, canvas);
    if (e < 1) {
        ctx.beginPath();
        for (let theta = 0; theta < 2 * Math.PI + 0.01; theta += 0.01) {
            const radius = r(theta);
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);
            const xr = x * Math.cos(omega) - y * Math.sin(omega);
            const yr = x * Math.sin(omega) + y * Math.cos(omega);
            const [px, py] = camera.worldToScreen(body.primary.pos.x + xr, body.primary.pos.y + yr, canvas);
            if (theta === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
    } else if (e >= 1) {
        ctx.beginPath();
        let thetaMax = Math.acos(-1 / e);
        thetaMax = thetaMax * 0.95;
        for (let theta = -thetaMax; theta < thetaMax; theta += 0.01) {
            const radius = r(theta);
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);
            const xr = x * Math.cos(omega) - y * Math.sin(omega);
            const yr = x * Math.sin(omega) + y * Math.cos(omega);
            const [px, py] = camera.worldToScreen(body.primary.pos.x + xr, body.primary.pos.y + yr, canvas);
            if (theta === -thetaMax) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGrid(ctx, canvas, camera) {
    const GRID_INTERVAL = 1; // 1 AU

    const W = canvas.width;
    const H = canvas.height;

    const left   = -camera.x / camera.scale;
    const top    = -camera.y / camera.scale;
    const right  =  left + W / camera.scale;
    const bottom =  top  + H / camera.scale;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= right; x += GRID_INTERVAL) {
        const sx = camera.worldToScreen(x, 0, canvas)[0];
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
        ctx.stroke();
    }

    for (let x = 0; x >= left - W / 2; x -= GRID_INTERVAL) {
        const sx = camera.worldToScreen(x, 0, canvas)[0];
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
        ctx.stroke();
    }

    for (let y = 0; y <= bottom; y += GRID_INTERVAL) {
        const sy = camera.worldToScreen(0, y, canvas)[1];
        ctx.beginPath();
        ctx.moveTo(0,  sy);
        ctx.lineTo(W, sy);
        ctx.stroke();
    }

    for (let y = 0; y >= top - H / 2; y -= GRID_INTERVAL) {
        const sy = camera.worldToScreen(0, y, canvas)[1];
        ctx.beginPath();
        ctx.moveTo(0,  sy);
        ctx.lineTo(W, sy);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    const originX = camera.worldToScreen(0, 0, canvas)[0];
    const originY = camera.worldToScreen(0, 0, canvas)[1];

    // Draw an indication that grid Interval is 1 AU
    ctx.beginPath();
    ctx.moveTo(camera.worldToScreen(0.05, 0, canvas)[0], camera.worldToScreen(0, -0.05, canvas)[1]);
    ctx.lineTo(camera.worldToScreen(0 + GRID_INTERVAL - 0.05, 0, canvas)[0], camera.worldToScreen(0, -0.05, canvas)[1]);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = `${11 * camera.scale / 100}px monospace`;
    ctx.fillText("1 AU", camera.worldToScreen(0 + GRID_INTERVAL / 2, 0, canvas)[0] - 15 * camera.scale / 100, camera.worldToScreen(0, -0.05, canvas)[1] + 15 * camera.scale / 100);
    ctx.stroke();

    ctx.restore();
}

function drawPredictedOrbits(spaceCrafts, bodies, dt, ctx, canvas, camera) {
    // --- Kick off a new prediction if worker is free ---
    if (!workerBusy) {
        workerBusy = true;

        // Deep clone bodies state to send to worker (structured clone handles this)
        const bodiesSnapshot = bodies.map(b => ({
            id: b.id,
            mass: b.mass,
            pos: { x: b.pos.x, y: b.pos.y },
            vel: { x: b.vel.x, y: b.vel.y }
        }));

        const spaceCraftIds = spaceCrafts.map(c => c.id);

        orbitWorker.postMessage({
            bodies: bodiesSnapshot,
            dt: dt,
            numSteps: 1000,
            spaceCraftIds: spaceCraftIds
        });
    }

    // --- Always draw whatever we have cached (1 frame stale max) ---
    if (cachedOrbitPaths.length === 0) return;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";

    for (let path of cachedOrbitPaths) {
        if (path.length === 0) continue;

        ctx.beginPath();
        let [startVx, startVy] = camera.worldToScreen(path[0].x, path[0].y, canvas);
        ctx.moveTo(startVx, startVy);

        for (let i = 1; i < path.length; i++) {
            let [sx, sy] = camera.worldToScreen(path[i].x, path[i].y, canvas);
            ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }
}

export { 
    drawBody, 
    drawSOI, 
    drawVelocityArrow, 
    drawSemiMajorAxisDisplay, 
    drawVelocityDisplay, 
    drawHoverInfo, 
    drawGrid,
    drawEstimatedOrbit, 
    drawPredictedOrbits
};