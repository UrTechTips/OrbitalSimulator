//main.js
import { CelestialBody, Spacecraft } from "./physics/bodies.js";
import Camera from "./renderer/camera.js";
import { updateRK4All } from "./physics/rk4All.js"
import cameraEventListeners from "./renderer/camera_canvas.js";
import { updateBodiesList } from "./ui/bodiesList.js";
import { SIM_UNITS, MAX_TRAIL_LENGTH } from "./constants.js";
import { drawBody, drawVelocityDisplay, drawVelocityArrow, drawHoverInfo, drawSOI, drawGrid, drawEstimatedOrbit, drawPredictedOrbits } from "./renderer/draw.js";
import { setSelectedBodyInfo } from "./ui/utils.js";
import { Vector } from "./physics/vector.js";
import { getVisualRadius } from "./renderer/utils.js";
import {scheduleCircularize, hofmannTransfer} from  "./physics/manuvers.js";
import { kgToSolarMass } from "./physics/conversion.js";

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
const systemEnergyDisplay = document.getElementById("system-energy");

const addBodyButton = document.getElementById("add-body-btn");

let years = 0;

const s = new CelestialBody("Sun", 1, 0.00465046726, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "star", "yellow");
const b = new CelestialBody("Earth", 3.00274e-6, 4.26349651e-5, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "blue", s).initPlanet(1, 0.0167);
const m = new CelestialBody("Mercury", 1.66012e-7, 1.659e-5, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "gray", s).initPlanet(0.387, 0.2056);
const v = new CelestialBody("Venus", 2.4478383e-6, 1.079e-5, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "orange", s).initPlanet(0.723, 0.0067);
const mar = new CelestialBody("Mars", 3.213e-7, 2.263e-5, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "red", s).initPlanet(1.524, 0.0934);
const j = new CelestialBody("Jupiter", 0.000954588, 0.000477, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "brown", s).initPlanet(5.2044, 0.0489);
const sat = new CelestialBody("Saturn", 0.00028572, 0.000402, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "goldenrod", s).initPlanet(9.537, 0.0541); 
const u = new CelestialBody("Uranus", 0.00004365, 0.000084, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "lightblue", s).initPlanet(19.2184, 0.0463);
const nep = new CelestialBody("Neptune", 0.00005149, 0.000079, new Vector(0, 0), new Vector(0, 0), new Vector(0, 0), "planet", "blue", s).initPlanet(30.11, 0.0097);
let bodies = [s, b, m, v, mar, j, sat, u, nep];
let spaceCrafts = [];
updateBodiesList(bodies);


let isAddingBody = false;
addBodyButton.addEventListener("click", () => {
    isAddingBody = !isAddingBody;
    addBodyButton.textContent = isAddingBody ? "Cancel Adding Body" : "Add Body";
    if (!isAddingBody) {
        newBody = null;
    }
});

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
let selectedBody = null;
let hoveredBody = null;

function getCanvasMousePos(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;

    return [
        (event.clientX - rect.left) * scaleX,
        (event.clientY - rect.top) * scaleY
    ];
}
let bodyCounter = 1;
canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; 
    if (!isAddingBody) return;
    isDragging = true;
    const [mouseX, mouseY] = getCanvasMousePos(event, canvas);
    const [worldX, worldY] = camera.screenToWorld(mouseX, mouseY, canvas);
    newBody = new Spacecraft(`P-${bodyCounter++}`, kgToSolarMass(1000), 1e-5,
        new Vector(worldX, worldY), new Vector(0, 0), new Vector(0, 0), "white", s, kgToSolarMass(400));
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
        newBody.vel.x = dx * VEL_SCALE;
        newBody.vel.y = dy * VEL_SCALE;
        if (speed > MAX_SPEED) {
            newBody.vel.x = (newBody.vel.x / speed) * MAX_SPEED;
            newBody.vel.y = (newBody.vel.y / speed) * MAX_SPEED;
        }
    }
});

canvas.addEventListener("mouseup", (event) => {
    isDragging = false;
    if (newBody) {
        bodies.push(newBody);
        // Add it to spaceCrafts list too 2 pointsers
        spaceCrafts.push(newBody);
        newBody = null;
        updateBodiesList(bodies);
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging || isAddingBody) return;
    e.preventDefault();

    const [mouseX, mouseY] = getCanvasMousePos(e, canvas);
    const [worldX, worldY] = camera.screenToWorld(mouseX, mouseY, canvas);
    const hovered = selectBodyAtPosition(bodies, worldX, worldY);

    if (hovered) {
        canvas.style.cursor = "pointer";
        hoveredBody = hovered;
    } else {
        canvas.style.cursor = isAddingBody ? "crosshair" : "default";
        hoveredBody = null;
    }
})

document.addEventListener("keydown", (e) => {
    if (e.key === 'Escape' && isDragging) {
        isDragging = false;
        newBody = null;
    }
})

// const bodyDisplays = document.getElementsByClassName("body-display");
// (Array.from(bodyDisplays)).map((display, index) => {
//     display.addEventListener("click", () => {
//         setSelectedBody(index);
//     });
// });

// function setSelectedBody(index) {
//     selectedBody = bodies[index];
//     setSelectedBodyInfo(selectedBody);
// }

canvas.addEventListener("click", (e) => {
    const [mouseX, mouseY] = getCanvasMousePos(e, canvas);
    const [worldX, worldY] = camera.screenToWorld(mouseX, mouseY, canvas);
    const selected = selectBodyAtPosition(bodies, worldX, worldY);
    if (selected) {
        selectedBody = selected;
        setSelectedBodyInfo(selected);
    }
})

function calculateSystemEnergy(bodies) {
    let kinetic = 0;
    let potential = 0;
    const G = SIM_UNITS.G;

    for (let i = 0; i < bodies.length; i++) {
        const bi = bodies[i];
        // Kinetic: 1/2 * m * v^2
        const vSq = bi.vel.x**2 + bi.vel.y**2;
        kinetic += 0.5 * bi.mass * vSq;

        for (let j = i + 1; j < bodies.length; j++) {
            const bj = bodies[j];
            // Potential: -G * m1 * m2 / r
            const dx = bj.pos.x - bi.pos.x;
            const dy = bj.pos.y - bi.pos.y;
            const r = Math.sqrt(dx*dx + dy*dy);
            potential -= (G * bi.mass * bj.mass) / r;
        }
    }
    return kinetic + potential;
}

function selectBodyAtPosition(bodies, x, y) {
    for (let body of bodies) {
        const dx = body.pos.x - x;
        const dy = body.pos.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const radius = getVisualRadius(body, camera) / camera.scale;
        if (dist < radius + 0.1) {
            return body;
        }
    }
    return null;
}
let sysEnergyArr = new Array();
function simulate() { 
    if (!paused) {
        requestAnimationFrame(simulate);
    }
    ctx.fillStyle = "#080616";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas, camera);

    years += dt;
    yearDisplay.textContent = `Time: ${years.toFixed(2)}yrs`;

    const hofmannButton = document.getElementById("hofmann-transfer");
    const retrogradeButton = document.getElementById("retrograde-burn");
    const circularizeButton = document.getElementById("circularize");
    const reloadButton = document.getElementById("reload");

    for (let body of spaceCrafts) {   
        body.setPrimaryBody?.(bodies);
        body.updateOrbit?.();
    }
    
    hofmannButton && (hofmannButton.onclick = () => {
        const id = hofmannButton.dataset.id;
        const body = bodies.find(b => b.id === id);
        if (body) {
            hofmannTransfer(body, body.orbit.apoapsis * 1.5);
        }
        setSelectedBodyInfo(selectedBody);
    });
    retrogradeButton && (retrogradeButton.onclick = () => {
        const id = retrogradeButton.dataset.id;
        const body = bodies.find(b => b.id === id);
        if (body) {
            body.scheduleCircularize();
        }
        setSelectedBodyInfo(selectedBody);
    });
    circularizeButton && (circularizeButton.onclick = () => {
        const id = circularizeButton.dataset.id;
        const body = bodies.find(b => b.id === id);
        if (body) {
            scheduleCircularize(body);
        }
        setSelectedBodyInfo(selectedBody);
    });
    reloadButton && (reloadButton.onclick = () => {
        setSelectedBodyInfo(selectedBody);
    });
    
    let removals = [];

    const systemEnergy = calculateSystemEnergy(bodies);
    // sysEnergyArr.push(systemEnergy);
    systemEnergyDisplay.textContent = `System Energy: ${systemEnergy.toFixed(2)}`;

    if (newBody) {
        drawBody(ctx, newBody, camera, canvas);
        drawVelocityDisplay(ctx, newBody, camera, canvas, bodies);
        drawEstimatedOrbit(ctx, newBody, camera, canvas);
        drawVelocityArrow(ctx, newBody, camera, canvas);
    }

    drawPredictedOrbits(spaceCrafts, bodies, dt, ctx, canvas, camera);

    for (let body of spaceCrafts) {
        body.manuver(dt, years);
    }

    let changes = updateRK4All(bodies, dt);

    for (let change of changes) {
        let body = bodies.find(b => b.id === change.id);
        body.prevPos = { ...body.pos };
        body.pos = new Vector(change.newX, change.newY);
        body.vel = new Vector(change.newVx, change.newVy);

        body.trail.push({x: body.pos.x, y: body.pos.y});
        if (body.trail.length > MAX_TRAIL_LENGTH) {
            body.trail.shift();
        }
    }

    for (let body of spaceCrafts) {
        if (body.engineOn && body.throttle > 0) {
            const thrust = body.maxThrust * body.throttle;
            body.consumeFuelContinuous(thrust, dt);
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

    if (hoveredBody) {
        drawHoverInfo(ctx, hoveredBody, camera, canvas);
    }
}

simulate();

// resetButton.addEventListener("click", () => {
//     const blob = new Blob([JSON.stringify(sysEnergyArr)], {type: "application/json"});
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "system_energy.json";
//     a.click();
//     URL.revokeObjectURL(url);
// })