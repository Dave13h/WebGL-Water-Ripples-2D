// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------
const CPU = 0;
const GPU = 1;
var MODE = GPU;

var fsQuadBuf;
var scene = {
	entities: 	[],
	lights: 	[],
	offscreen: 	{}
};
var camera = new cCamera([0.0, -2.0, -1.25], [300.0, 0.0, 0.0]);
var rain = {
	a: 			null,
	a_new: 		null,
	a_prev:		null,
	c: 			0.499,
	damping: 	0.988,
	lastRain: 	0.0,
	randomDrops:false,
	sim: 		true,
	simTime: 	0.0,
	size: 		512,
	texture: 	null
};

function initScene() {
	shaders["copyTexture"] = shaderLoad("copyTexture");

	// Entities ---------------
	shaders["floor"] = shaderLoad("floor");
	scene.entities["floor"] = {
		buf: 		gl.createBuffer(),
		mat: 		mat4.create(),
		textures: 	[
			new cTexture('textures/brick_wall2-diff-1024.png'),
			new cTexture('textures/brick_wall2-nor-1024.png'),
			new cTexture('textures/brick_wall2-spec-1024.png')
		]
	};

	gl.bindBuffer(gl.ARRAY_BUFFER, scene.entities["floor"].buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	 //  x,   y,   z,		u,	 v, 	normal,			tangent, 		bitangent
		-1.0, 0.0, -1.0,	0.0, 0.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0,
		-1.0, 0.0,  1.0,	0.0, 1.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0,
		 1.0, 0.0,  1.0,	1.0, 1.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0,

		-1.0, 0.0, -1.0,	0.0, 0.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0,
		 1.0, 0.0,  1.0,	1.0, 1.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0,
		 1.0, 0.0, -1.0,	1.0, 0.0,	0.0, 1.0, 0.0,	1.0, 0.0, 0.0,	0.0, 0.0, 1.0
	]), gl.STATIC_DRAW);

	// Lights -----------------
	scene.lights["ambient"] = {
		colour: 	[0.10, 0.10, 0.25]
	};
	scene.lights["point"] = {
		attenuation: 0.1,
		colour:  	[1.0, 1.0, 0.15],
		position: 	[-0.25, 0.25, -0.25],
		intensity: 	0.50
	};

	// Rain -------------------
	var size = (rain.size + 2) * (rain.size + 2);
	rain.a 			= new Float32Array(size);
	rain.a_new 		= new Float32Array(size);
	rain.a_prev		= new Float32Array(size);
	rain.texture	= new cTexture(rain.a, rain.size + 2, rain.size + 2, gl.LUMINANCE, gl.FLOAT);
	rain.lastRain 	= 0.0;
	
	shaders["propagate"] = shaderLoad("propagate");
	shaders["damping"] 	 = shaderLoad("damping");
	shaders["rainSim"] 	 = shaderLoad("rainSim");

	rain.qScale = (1.0 / rain.size) * (rain.size / 80.0);
	rain.simQuad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, rain.simQuad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-rain.qScale, -rain.qScale,
		 rain.qScale, -rain.qScale,
		-rain.qScale,  rain.qScale,

		-rain.qScale,  rain.qScale,
		 rain.qScale, -rain.qScale,
		 rain.qScale,  rain.qScale
	]), gl.STATIC_DRAW);

	// Offscreen Buffers
	fsQuadBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1.0, -1.0,  0.0,	0.0, 0.0,
		 1.0, -1.0,  0.0,	1.0, 0.0,
		-1.0,  1.0,  0.0,	0.0, 1.0,

		-1.0,  1.0,  0.0,	0.0, 1.0,
		 1.0, -1.0,  0.0,	1.0, 0.0,
		 1.0,  1.0,  0.0,	1.0, 1.0
	]), gl.STATIC_DRAW);

	// Temp textures, these will be the rain textures later
	var tmpTextureData = new Float32Array(size * 3);
	scene.offscreen.a = [];
	scene.offscreen.a.push(new cTexture(tmpTextureData, rain.size + 2, 
		rain.size + 2, gl.RGB, gl.FLOAT));
	scene.offscreen.a.push(new cTexture(tmpTextureData, rain.size + 2, 
		rain.size + 2, gl.RGB, gl.FLOAT));

	scene.offscreen.prev = new cTexture(tmpTextureData, rain.size + 2, 
		rain.size + 2, gl.RGB, gl.FLOAT);
	scene.offscreen.new  = new cTexture(tmpTextureData, rain.size + 2, 
		rain.size + 2, gl.RGB, gl.FLOAT);

	// Render Target
	scene.offscreen.fbo = frameBufferCreate(scene.offscreen.a[0]);
};

// ----------------------------------------------------------------------------
// Frame Functions
// ----------------------------------------------------------------------------
var frameTime = 0.0,
	frameStart,
	simStart;

function updateScene(dt) {
	frameStart = window.performance.now();

	// Update Camera ----------
	camera.update(dt);

	// Update Hud -------------
	hud.update(dt);
	hud.drawText(5, 10, "Camera: [" +
		-camera.position[0].toFixed(2) + ", " +
		-camera.position[1].toFixed(2) + ", " +
		-camera.position[2].toFixed(2) + "] [" +
		camera.angle[0].toFixed(2) + ", " +
		camera.angle[1].toFixed(2) + ", " +
		camera.angle[2].toFixed(2) + "]");
	hud.drawText(5, 20, "Light: [" +
		scene.lights["point"].position[0].toFixed(2) + ", " +
		scene.lights["point"].position[1].toFixed(2) + ", " +
		scene.lights["point"].position[2].toFixed(2) + "] Intensity [" +
		scene.lights["point"].intensity.toFixed(2) + "]");

	hud.drawText(-5, 10, "Frame: " + frameTime.toFixed(4) + "ms");
	hud.drawText(-5, 20, "CPU Sim: " + rain.simTime.toFixed(4) + "ms");
	hud.drawText(-5, 30, "SIM MODE: " + (MODE ? 'Gpu' : 'Cpu'));

	hud.drawText(-5, -10, "Controls: [M] Toggle GPU/CPU Impl [C]lear CPU Data / [R]andom Drops: " +
		(rain.randomDrops ? 'On' : 'Off') + " / [P]ause Sim");
	hud.drawText(-5, -20, "Camera: [WASDQE] Move / [↑↓← →] Turn");
	hud.drawText(-5, -30, "Light: [L] Set Pos / [+-] Intensity");

	// Input ------------------
	if (input.keys[input.e.keys.C]) {
		clearData();
		input.keys[input.e.keys.C] = false;
	}
	if (input.keys[input.e.keys.P]) {
		rain.sim = !rain.sim;
		input.keys[input.e.keys.P] = false;
	}
	if (input.keys[input.e.keys.R]) {
		rain.randomDrops = !rain.randomDrops;
		input.keys[input.e.keys.R] = false;
	}
	if (input.keys[input.e.keys.L]) {
		scene.lights["point"].position = [
			-camera.position[0],
			-camera.position[1],
			-camera.position[2]
		];
		input.keys[input.e.keys.L] = false;
	}
	if (input.keys[input.e.keys.ADD]) {
		if ((scene.lights["point"].intensity += 0.05) > 1.0)
			scene.lights["point"].intensity = 1.0;
		input.keys[input.e.keys.ADD] = false;
	}
	if (input.keys[input.e.keys.SUBTRACT]) {
		if ((scene.lights["point"].intensity -= 0.05) < 0.05)
			scene.lights["point"].intensity = 0.05;
		input.keys[input.e.keys.SUBTRACT] = false;
	}

	if (input.keys[input.e.keys.M]) {
		MODE = !MODE;
		input.keys[input.e.keys.M] = false;
	}

	// Sim --------------------/*
	if (MODE == CPU) {
		if (rain.sim) {
			simStart = window.performance.now();
			if (rain.randomDrops && (rain.lastRain += dt) > 0.5) {
				addAmplitude(
					Math.floor(Math.random() * rain.size),
					Math.floor(Math.random() * rain.size),
					Math.random() * 50
				);
				rain.lastRain = 0.0;
				rain.randomDrops = false;
			}

			propagate();
			for (var i = 0; i < 10; ++i) {
				rainSim(
					Math.floor(Math.random() * rain.size),
					Math.floor(Math.random() * rain.size),
					50 + 400.0 * Math.random()
				);
			}

			textureUpdate(rain.texture, rain.a_new);
			rain.simTime = window.performance.now() - simStart;
		}
	}
	

	// GPU Version
	if (MODE == GPU) {
		gpuPropagate();

		gpuRainSim(
			Math.floor(Math.random() * rain.size),
			Math.floor(Math.random() * rain.size),
			50 + 400.0 * Math.random()
		);

		frameBufferCopyTexture(scene.offscreen.fbo, 
			scene.offscreen.a[0], scene.offscreen.prev);
		gpuDamping();
	}

	frameTime = window.performance.now() - frameStart;
};

function drawScene(dt) {
	drawFloor();

	textureViewer(scene.offscreen.prev, 10, 400, 128, 128);
	textureViewer(scene.offscreen.a[0], 10, 272, 128, 128);
	textureViewer(scene.offscreen.a[1], 148, 272, 128, 128);
	textureViewer(scene.offscreen.new,  10, 148, 128, 128);
	textureViewer(rain.texture, 10, 10, 128, 128);
};

// ----------------------------------------------------------------------------
// Rain Functions
// ----------------------------------------------------------------------------
function IX(i, j) { return Math.floor(i + (rain.size + 2) * j); };

function clearData() {
	var size = (rain.size + 2) * (rain.size + 2);
	for (var i = 0; i < size; ++i) {
		rain.a[i] 		= 0.0;
		rain.a_prev[i] 	= 0.0;
		rain.a_new[i] 	= 0.0;
	}
};

function addAmplitude(i, j, strength) {
	rain.a[IX(i, j)]			+= 6.0 * strength;
	rain.a[IX(i, j + 1)]		+= 2.0 * strength;
	rain.a[IX(i + 1, j + 1)]	+= 1.0 * strength;
	rain.a[IX(i + 1, j)]		+= 2.0 * strength;
	rain.a[IX(i - 1, j + 1)]	+= 1.0 * strength;
	rain.a[IX(i, j - 1)]		+= 2.0 * strength;
	rain.a[IX(i - 1, j - 1)]	+= 1.0 * strength;
	rain.a[IX(i - 1, j)]		+= 2.0 * strength;
	rain.a[IX(i + 1, j - 1)]	+= 1.0 * strength;
};

function propagate() {
	var i, j, NEUMANN, offset;

	// Done: Propagate Shader
	for (i = 1; i <= rain.size; ++i) {
		for (j = 1; j <= rain.size; ++j) {
			NEUMANN =
				rain.a[IX(i + 1, j)] +
				rain.a[IX(i - 1, j)] +
				rain.a[IX(i, j - 1)] +
				rain.a[IX(i, j + 1)];

			offset = IX(i, j);
			rain.a_new[offset] = rain.c * ((NEUMANN) - 4.0 * rain.a[offset]) -
				rain.a_prev[offset] + 2.0 * rain.a[offset];
		}
	}

	for (i = 1; i <= rain.size; ++i) {
		for (j = 1; j <= rain.size; ++j) {
			offset = IX(i, j);
			rain.a_prev[offset] = rain.a[offset];
			rain.a[offset] = rain.a_new[offset] * rain.damping;
		}
	}
};

function rainSim(i, j, strength) {
	var x, y, r;
	for (x = i - rain.size / 80; x < i + rain.size / 80; ++x) {
		for (y = j - rain.size / 80; y < j + rain.size / 80; ++y) {
			if (i + x > 0 && i + x < rain.size && j + y > 0 && j + y < rain.size) {
				r = Math.sqrt(Math.pow(i - x, 2.0) + Math.pow(j - y, 2.0));
				rain.a[IX(i + x, j + y)] += -strength *
					Math.sin(Math.PI * r * 0.32) / (25 * r + 0.001);
			}
		}
	}
};

//
// GPU Version
//
function gpuDamping() {
	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, scene.offscreen.a[0]);

	var shader = changeProgram("damping");

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, scene.offscreen.new.buf);
	gl.uniform1i(shader.fUniforms.tTexture, 0);

	gl.uniform1f(shader.fUniforms.uDamping, rain.damping);

	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};

function gpuPropagate() {
	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, scene.offscreen.new);
	
	var shader = changeProgram("propagate");

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, scene.offscreen.prev.buf);
	gl.uniform1i(shader.fUniforms.tPrev, 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, scene.offscreen.a[0].buf);
	gl.uniform1i(shader.fUniforms.tCurrent, 1);

	gl.uniform1f(shader.fUniforms.uSize, (1.0 / 514.0));
	gl.uniform1f(shader.fUniforms.uC, 	 rain.c);

	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};

function gpuRainSim(x, y, strength) {
	frameBufferCopyTexture(scene.offscreen.fbo, 
		scene.offscreen.a[0], scene.offscreen.a[1]);

	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, scene.offscreen.a[0]);

	var shader = changeProgram("rainSim");

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, scene.offscreen.a[1].buf);
	gl.uniform1i(shader.fUniforms.tCurrent, 0);

	gl.uniform1f(shader.fUniforms.uStrength, strength);

	gl.uniform2f(shader.vUniforms.uOffset, 
		(x - (rain.size / 2)) * (1.0 / rain.size),
		(y - (rain.size / 2)) * (1.0 / rain.size));
	gl.uniform2f(shader.vUniforms.uPOffset, 
		x * (1.0 / rain.size),
		y * (1.0 / rain.size));

	gl.uniform2f(shader.fUniforms.uMid, x, y);

	gl.bindBuffer(gl.ARRAY_BUFFER, rain.simQuad);
		gl.vertexAttribPointer(shader.attribs.aPos, 2, gl.FLOAT, false, 8, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};

// ----------------------------------------------------------------------------
// Draw Functions
// ----------------------------------------------------------------------------
function drawFloor() {
	var shader = changeProgram("floor"),
		floor = scene.entities["floor"];

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Camera
	gl.uniformMatrix4fv(shader.vUniforms.uCamMat, false, camera.camMat);
	gl.uniformMatrix4fv(shader.vUniforms.uPMat, false, camera.pMat);
	gl.uniform3fv(shader.fUniforms.uCamPos, camera.position);

	// Lighting
	gl.uniform3fv(shader.fUniforms.lAmbientColour, 	scene.lights["ambient"].colour);
	gl.uniform1f (shader.fUniforms.lPointAttn, 		scene.lights["point"].attenuation);
	gl.uniform3fv(shader.fUniforms.lPointColour, 	scene.lights["point"].colour);
	gl.uniform1f (shader.fUniforms.lPointIntensity, scene.lights["point"].intensity);
	gl.uniform3fv(shader.fUniforms.lPointPosition, 	scene.lights["point"].position);

	// Textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, floor.textures[0].buf);
	gl.uniform1i(shader.fUniforms.tAlbedo, 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, floor.textures[1].buf);
	gl.uniform1i(shader.fUniforms.tNormal, 1);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, floor.textures[2].buf);
	gl.uniform1i(shader.fUniforms.tSpec, 2);

	gl.activeTexture(gl.TEXTURE3);
	if (MODE == GPU)
		gl.bindTexture(gl.TEXTURE_2D, scene.offscreen.a[0].buf);
	else
		gl.bindTexture(gl.TEXTURE_2D, rain.texture.buf);
	gl.uniform1i(shader.fUniforms.tRain, 3);
	gl.uniform1f(shader.fUniforms.tRainSize, (1.0 / rain.size));

	// Draw Quad
	gl.uniformMatrix4fv(shader.vUniforms.uMat, false, floor.mat);
	gl.bindBuffer(gl.ARRAY_BUFFER, floor.buf);
		gl.vertexAttribPointer(shader.attribs.aPos, 		3, gl.FLOAT, false, 56, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  		2, gl.FLOAT, false, 56, 12);
		gl.vertexAttribPointer(shader.attribs.aNormal,  	3, gl.FLOAT, false, 56, 20);
		gl.vertexAttribPointer(shader.attribs.aTangent,  	3, gl.FLOAT, false, 56, 32);
		gl.vertexAttribPointer(shader.attribs.aBiTangent,  	3, gl.FLOAT, false, 56, 44);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};
