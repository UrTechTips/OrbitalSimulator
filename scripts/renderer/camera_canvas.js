import Camera from "./camera.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let isRightDragging = false;
let startRightDragX = 0;
let startRightDragY = 0;

function main(camera = null) {    
    canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    
    canvas.addEventListener("mousedown", (event) => {
        if (event.button === 2) { 
            isRightDragging = true;
            startRightDragX = event.clientX - canvas.getBoundingClientRect().left;
            startRightDragY = event.clientY - canvas.getBoundingClientRect().top;
            // alert(startRightDragX + ", " + startRightDragY);
        }
    });

    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomAmount = -e.deltaY * 0.001;
        camera.zoom(1 + zoomAmount);
    })
}

export default main;