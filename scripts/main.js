// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------
var canvas = document.querySelector('#canvas');
var gl = canvas.getContext('webgl');

gl.viewport(0,0, canvas.clientWidth, canvas.clientHeight);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.frontFace(gl.CCW);

var canHasFloats = gl.getExtension('OES_texture_float');
if (!canHasFloats) {
	console.error("Fatal, no support for Float textures");
	whoa_lets_just_stop_here; // Not valid, but thats the point ;)
}

// ----------------------------------------------------------------------------
// Setup Scene
// ----------------------------------------------------------------------------
var hud = new cHud();
initTextures();
initScene();

// ----------------------------------------------------------------------------
// Frame Stuff
// ----------------------------------------------------------------------------
var lastTick = 0.0;
function mainLoop(now) {
	// Timer
	now *= 0.001;
	var dt = now - lastTick;
	lastTick = now;

	// Scene
	updateScene(dt);
	drawScene(dt);

	// Queue up next frame
	window.requestAnimationFrame(mainLoop);
}

// requestAnimationFrame Shim
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
		|| function(callback, element) {
			window.setTimeout(callback, 1000 / 60);
		};
})();
window.requestAnimFrame(mainLoop);
