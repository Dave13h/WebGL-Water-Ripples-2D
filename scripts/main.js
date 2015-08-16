// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------
var canvas = document.querySelector('#canvas');
var gl = canvas.getContext('webgl');

gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.frontFace(gl.CCW);

// list Caps ------------------
var unmaskedRenderer= '';
var unmaskedVendor 	= '';
var debugRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
if (debugRenderInfo) {
	unmaskedRenderer= " (" + gl.getParameter(debugRenderInfo.UNMASKED_RENDERER_WEBGL) + ")";
	unmaskedVendor 	= " (" + gl.getParameter(debugRenderInfo.UNMASKED_VENDOR_WEBGL) + ")";
}

var logStyle = "color: #448AF2";
console.log("GL Version:%c\t%s", logStyle,
	gl.getParameter(gl.VERSION));
console.log("GL Vendor:%c\t%s", logStyle,
	gl.getParameter(gl.VENDOR) + unmaskedVendor);
console.log("GL Renderer:%c%s", logStyle,
	gl.getParameter(gl.RENDERER) + unmaskedRenderer);
console.log("GL Shader Version:%c %s", logStyle,
	gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
console.log("GL Max Vertex Attributes:%c %s", logStyle,
	gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
console.log("GL Max Vertex Uniform Vectors:%c %s", logStyle,
	gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS));
console.log("GL Max Varying Vectors:%c %s", logStyle,
	gl.getParameter(gl.MAX_VARYING_VECTORS));
console.log("GL Max Fragment Uniform Vectors:%c %s", logStyle,
	gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS));
console.log("GL Max Combined Texture Image Units:%c %s", logStyle,
	gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
console.log("GL Max Vertex Texture Image Units:%c %s", logStyle,
	gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
console.log("GL Max Texture Image Units:%c %s", logStyle,
	gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
console.log("GL RGBA:%c %s", logStyle,
	gl.getParameter(gl.RED_BITS) + '/' +
	gl.getParameter(gl.GREEN_BITS) + '/' +
	gl.getParameter(gl.BLUE_BITS) + '/' +
	gl.getParameter(gl.ALPHA_BITS));

var glExts = gl.getSupportedExtensions();
if (glExts.length) {
	console.log("GL Extensions:", '');
	for (var gle = 0; gle < glExts.length; gle++)
		console.log("\t%c%s", logStyle, glExts[gle]);
}

console.log("GL Context:%c %s", logStyle, canvas.clientWidth + "x" + canvas.clientHeight);

var glAttribs = gl.getContextAttributes();
console.log("GL Context Attributes", "");
console.log("\t%cAlpha: %s", logStyle,
	(glAttribs.alpha ? "Enabled" : "Disabled"));
console.log("\t%cAntiAlias: %s", logStyle,
	(glAttribs.antialias ? "Enabled" : "Disabled"));
console.log("\t%cDepth: %s", logStyle,
	(glAttribs.depth ? "Enabled" : "Disabled"));
console.log("\t%cStencil: %s", logStyle,
	(glAttribs.stencil ? "Enabled" : "Disabled"));
console.log("\t%cPremultipled Alpha: %s", logStyle,
	(glAttribs.premultipliedAlpha ? "Enabled" : "Disabled"));
console.log("\t%cPreserve Drawing Buffer: %s", logStyle,
	(glAttribs.preserveDrawingBuffer ? "Enabled" : "Disabled"));

console.log("----------------------------------------------------------------------------\n");

var glEXT = [];
glEXT['OES_texture_float'] = gl.getExtension('OES_texture_float');
if (!glEXT['OES_texture_float']) {
	console.error("Fatal, no support for Float textures");
	diehorribly;
}
console.log("Extension:\t%cOES_texture_float Loaded", logStyle);

glEXT["EXT_texture_filter_anisotropic"] = gl.getExtension('EXT_texture_filter_anisotropic');
if (glEXT["EXT_texture_filter_anisotropic"]) {
	glEXT["EXT_texture_filter_anisotropic"].max = gl.getParameter(
		glEXT["EXT_texture_filter_anisotropic"].MAX_TEXTURE_MAX_ANISOTROPY_EXT);
	console.log("Extension:\t%cEXT_texture_filter_anisotropic [Max: " +
		glEXT["EXT_texture_filter_anisotropic"].max + "] Loaded", logStyle);
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
var dt 				= 0.0,
	lastTick 		= 0.0,
	fps 			= 0,
	frameCount		= 0,
	frameTime 		= 0.0,
	frameTimeLast 	= 0.0,
	frameStart;

function mainLoop(now) {
	frameTime = now - frameStart;
	frameStart = now;
	frameCount++;

	// Timer
	now *= 0.001;
	dt = now - lastTick;
	lastTick = now;

	// Scene
	updateScene(dt);
	drawScene(dt);

	// Frame Counter
	if (frameStart - frameTimeLast >= 1000) {
		fps = frameCount;
		frameCount = 0;
		frameTimeLast = frameStart;
	}

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

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------
function selectController(elem, target) {
	document.getElementById(elem).addEventListener("change", function(){
		if (target)
			target(Number(this.value));
	});
};

function sliderController(elem, val, target, div, ps) {
	ps = ps || 0;
	div = div || null;
	
	document.getElementById(elem).addEventListener("mousemove", function(){
		document.getElementById(val).value =
			Number((div ? this.value / div : this.value)).toFixed(ps);

		var evt = document.createEvent("HTMLEvents");
		evt.initEvent("change", false, true);
		document.getElementById(val).dispatchEvent(evt);
	});

	document.getElementById(val).addEventListener("change", function(){
		var max = Number(div ? document.getElementById(elem).max / div :
			document.getElementById(elem).max);
		var min = Number(div ? document.getElementById(elem).min / div :
			document.getElementById(elem).min);

		if (isNaN(this.value))
			this.value = Number(max).toFixed(ps);
		else if (this.value > max)
			this.value = Number(max).toFixed(ps);
		else if (this.value < min)
			this.value = Number(min).toFixed(ps);

		if (target)
			target(Number(this.value));
	});
};
