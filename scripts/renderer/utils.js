// renderer/utils.js

function getVisualRadius(body, camera) {
  const realPixels = body.radius * camera.scale;

  const minimums = {
    star:   15,
    planet: 7,
    moon:   5,
    asteroid:  5,
    spacecraft: 5,
  };

  return Math.max(realPixels, minimums[body.type]);
}

export { getVisualRadius };