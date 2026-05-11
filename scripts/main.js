//main.js

import Body from "./physics/bodies.js";
import Camera from "./renderer/camera.js";
import { update, updateRK4 } from "./physics/rk4.js";
import cameraEventListeners from "./renderer/camera_canvas.js";
import { updateBodiesList } from "./ui/bodiesList.js";
import { SIM_UNITS, MAX_TRAIL_LENGTH } from "./constants.js";

const camera = new Camera(0, 0);
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


// const dt = 1 / (365 * 24 * 60 * 60); 
let dt = 1 / 365; // 1 day per frame
cameraEventListeners(camera);
const pauseButton = document.getElementById("pause-btn");
const resetButton = document.getElementById("reset-btn");
const yearDisplay = document.getElementById("time");
const timeScaleInput = document.getElementById("time-scale");

timeScaleInput.addEventListener("input", () => {
    const scale = parseFloat(timeScaleInput.value);
    if (!isNaN(scale) && scale > 0) {
        dt = scale / 365; // Convert from days to years
    }
});

let paused = false;
pauseButton.addEventListener("click", () => {
    if (paused) {
        requestAnimationFrame(simulate);
    }
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
});
resetButton.addEventListener("click", () => {
    location.reload();
});

let isDragging = false;
let newBody = null;

function getCanvasMousePos(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;

    return [
        (event.clientX - rect.left) * scaleX,
        (event.clientY - rect.top) * scaleY
    ];
}

canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; 
    isDragging = true;
    const [mouseX, mouseY] = getCanvasMousePos(event, canvas);
    const [worldX, worldY] = camera.screenToWorld(mouseX, mouseY, canvas);
    newBody = new Body("New Body", 1e-6, 1e-5, 0, 0,
        {x: worldX, y: worldY}, {x:0, y:0}, {x:0, y:0}, "asteroid", "white");
});

canvas.addEventListener("mousemove", (event) => {
    if (isDragging && newBody) {
        const [mouseX, mouseY] = getCanvasMousePos(event, canvas);
        const [mouseWorldX, mouseWorldY] = camera.screenToWorld(mouseX, mouseY, canvas);

        const dx = mouseWorldX - newBody.pos.x;
        const dy = mouseWorldY - newBody.pos.y;

        const VEL_SCALE = 1.5;  // reduce from 3.0

        // Also clamp max speed so nothing launches at 500 AU/year
        const MAX_SPEED = 15;  // AU/year — above this nothing stays in the system
        const speed = Math.sqrt(newBody.vel.x**2 + newBody.vel.y**2);
        if (speed > MAX_SPEED) {
            newBody.vel.x = (newBody.vel.x / speed) * MAX_SPEED;
            newBody.vel.y = (newBody.vel.y / speed) * MAX_SPEED;
        }
        newBody.vel.x = dx * VEL_SCALE;
        newBody.vel.y = dy * VEL_SCALE;
    }
});

canvas.addEventListener("mouseup", (event) => {
    isDragging = false;
    if (newBody) {
        bodies.push(newBody);
        newBody = null;
        updateBodiesList(bodies);
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === 'Escape' && isDragging) {
        isDragging = false;
        newBody = null;
    }
})

let years = 0;

const s = new Body("Sun", 1, 0.00465046726, 0, 0, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "star", "yellow");
const b = new Body("Earth", 3.00274e-6, 4.26349651e-5, 1, 0.0167, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "planet", "blue", s);
const m = new Body("Mercury", 1.66012e-7, 1.659e-5, 0.387, 0.2056, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "planet", "gray", s);
const v = new Body("Venus", 2.4478383e-6, 1.079e-5, 0.723, 0.0067, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "planet", "orange", s);
const mar = new Body("Mars", 3.213e-7, 2.263e-5, 1.524, 0.0934, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "planet", "red", s);
const j = new Body("Jupiter", 0.000954588, 0.0004778945, 5.2044, 0.0489, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, "planet", "brown", s);

let bodies = [s, b, m, v, mar, j];
updateBodiesList(bodies);

function semiMajorAxisFromState(pos, vel, primaryMass) {
    const r = Math.sqrt(pos.x**2 + pos.y**2);
    const v2 = vel.x**2 + vel.y**2;

    const inverseA = (2 / r) - (v2 / (SIM_UNITS.G * primaryMass));
    if (inverseA <= 0) return Infinity; // Parabolic trajectory
    return 1 / inverseA;
}

function getVisualRadius(body, camera) {
  const realPixels = body.radius * camera.scale;

  const minimums = {
    star:   15,
    planet: 7,
    moon:   5,
    asteroid:  5,
  };

  return Math.max(realPixels, minimums[body.type]);
}

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

    if (body.type != "asteroid" && body.type != "planet") return;
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

function soi(body, primary) {
    return body.semiMajorAxis * Math.pow(body.mass / primary.mass, 2/5);
}

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

function drawSemiMajorAxisDisplay(ctx, body, camera, canvas) {
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

const bodiesList = document.getElementById("body-list");
function simulate() { 
    if (!paused) {
        requestAnimationFrame(simulate);
    }
    ctx.fillStyle = "#080616";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    years += dt;
    yearDisplay.textContent = `Time: ${years.toFixed(2)}yrs`;
    
    let changes = [];
    let removals = [];

    if (newBody) {
        drawBody(ctx, newBody, camera, canvas);
        drawSemiMajorAxisDisplay(ctx, newBody, camera, canvas);
        drawVelocityArrow(ctx, newBody, camera, canvas);
    }

    for (let body of bodies) {
        if (body.type === "star") continue; 
        body.prevPos = { ...body.pos };
        // update(body, bodies, dt);
        // updateRK4(body, bodies, dt);
        let [pos, vel] = body.updateRK4(bodies, dt);
        changes.push({body, pos, vel});
    }

    for (let change of changes) {
        change.body.pos = change.pos;
        change.body.vel = change.vel;
        
        change.body.trail.push({x: change.body.pos.x, y: change.body.pos.y});
        if (change.body.trail.length > MAX_TRAIL_LENGTH) {
            change.body.trail.shift();
        }
    }

    for (let body of bodies) {
        if (body.type === "star") continue;
        if (body.colided(bodies) || body.exceededBoundary()) {
            removals.push(body);
        }
    }
    removals.forEach(b => bodies.splice(bodies.indexOf(b), 1));

    if (removals.length > 0) {
        updateBodiesList(bodies);
    }
    
    for (let body of bodies) {
        drawBody(ctx, body, camera, canvas);
        if (body.type === "star") continue;

        if (body.primary != null) drawSOI(ctx, body, body.primary, camera, canvas);
    }
}

simulate();