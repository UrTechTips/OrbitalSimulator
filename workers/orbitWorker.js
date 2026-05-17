import { SIM_UNITS } from "/scripts/constants.js";
import { updateRK4All } from '/scripts/physics/rk4All.js';

self.onmessage = function(e) {
    const { bodies, dt, numSteps, spaceCraftIds } = e.data;

    // virtualBodies is already a plain object clone — no need to re-clone
    let virtualBodies = bodies;

    // bodiesPositions[i] = array of {x, y} for spacecraft i
    let bodiesPositions = spaceCraftIds.map(() => []);

    for (let i = 0; i < numSteps; i++) {
        let rk4Results = updateRK4All(virtualBodies, dt);

        for (let res of rk4Results) {
            let vBody = virtualBodies.find(b => b.id === res.id);
            if (vBody) {
                vBody.pos.x = res.newX;
                vBody.pos.y = res.newY;
                vBody.vel.x = res.newVx;
                vBody.vel.y = res.newVy;
            }
        }

        for (let res of rk4Results) {
            let idx = spaceCraftIds.indexOf(res.id);
            if (idx !== -1) {
                bodiesPositions[idx].push({ x: res.newX, y: res.newY });
            }
        }
    }

    self.postMessage({ bodiesPositions });
};

