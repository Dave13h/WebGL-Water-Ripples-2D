// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------
var camera = new cCamera([0.0, -2.0, -1.25], [300.0, 0.0, 0.0]);
var debugView = false;
var fsQuadBuf;
var scene = {
	entities: 	[],
	lights: 	[],
	offscreen: 	{},
	rain: 		null
};

function initScene() {
	// Simulator --------------
	scene.rain = new cRain();
	sliderController('damping', 'd_val', scene.rain.setDamping.bind(scene.rain), 10, 3);
	sliderController('rate', 	'r_val', scene.rain.setRate.bind(scene.rain));

	// Shaders ----------------
	shaders["copyTexture"]	= shaderLoad("copyTexture");
	shaders["damping"]		= shaderLoad("damping");
	shaders["floor"]		= shaderLoad("floor");
	shaders["propagate"]	= shaderLoad("propagate");
	shaders["simulate"]		= shaderLoad("simulate");

	// Entities ---------------
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

	// Offscreen Buffers ------
	scene.offscreen.fbo = frameBufferCreate(scene.rain.textures.a[0]);
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
};

// ----------------------------------------------------------------------------
// Frame Functions
// ----------------------------------------------------------------------------
function updateScene(dt) {
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

	hud.drawText(-5, 10, frameTime.toFixed(2) + "ms / " + fps + "fps");

	hud.drawText(-5, -10, "Controls: [Z] Debug View / [P] Pause Simulation");
	hud.drawText(-5, -20, "Camera: [WASDQE] Move / [↑↓← →] Turn");
	hud.drawText(-5, -30, "Light: [L] Set Pos / [+-] Intensity");

	// Input ------------------
	if (input.keys[input.e.keys.P]) {
		scene.rain.paused = !scene.rain.paused;
		input.keys[input.e.keys.P] = false;
	}
	if (input.keys[input.e.keys.R]) {
		scene.rain.randomDrops = !scene.rain.randomDrops;
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
	if (input.keys[input.e.keys.Z]) {
		debugView = !debugView;
		input.keys[input.e.keys.Z] = false;
	}

	// Actually doing stuff ---
	scene.rain.run(dt);
};

function drawScene(dt) {
	drawFloor();

	if (debugView) {
		textureViewer(scene.rain.textures.prev, 10,  286, 128, 128);
		textureViewer(scene.rain.textures.a[0], 10,  148, 128, 128);
		textureViewer(scene.rain.textures.a[1], 148, 148, 128, 128);
		textureViewer(scene.rain.textures.new,  10,  10,  128, 128);
	}
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
	gl.bindTexture(gl.TEXTURE_2D, scene.rain.textures.a[0].buf);
	gl.uniform1i(shader.fUniforms.tRain, 3);
	gl.uniform1f(shader.fUniforms.tRainSize, (1.0 / scene.rain.size));

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
