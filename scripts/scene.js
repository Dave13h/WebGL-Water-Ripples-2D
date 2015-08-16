// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------
var camera = new cCamera([1.5, -1.0, -1.5], [338.0, 315.0, 0.0]);
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
	sliderController('dropsize', 'ds_val', scene.rain.setDropSize.bind(scene.rain), 100, 4);
	sliderController('maxStr', 'str_val', scene.rain.setMaxStr.bind(scene.rain));
	sliderController('rate', 'r_val', scene.rain.setRate.bind(scene.rain));

	// Shaders ----------------
	shaders["copyTexture"]	= shaderLoad("copyTexture");
	shaders["damping"]		= shaderLoad("damping");
	shaders["floor"]		= shaderLoad("floor");
	shaders["propagate"]	= shaderLoad("propagate");
	shaders["simulate"]		= shaderLoad("simulate");
	shaders["skybox"]		= shaderLoad("skybox");

	// Entities ---------------
	scene.entities["floor"] = {
		buf: 		gl.createBuffer(),
		mat: 		mat4.create(),
		textureSet: 0,
		textures: 	[
			[
				new cTexture('textures/brick_wall2-diff-1024.png'),
				new cTexture('textures/brick_wall2-nor-1024.png'),
				new cTexture('textures/brick_wall2-spec-1024.png')
			],
			[
				new cTexture('textures/pebbles_color_1024.jpg'),
				new cTexture('textures/pebbles_normal_1024.jpg'),
				new cTexture('textures/pebbles_bump_1024.jpg')				
			]
		]
	};
	scene.entities["floor"].setTextureSet = function(val) { this.textureSet = val; };
	selectController('tSet', 
		scene.entities["floor"].setTextureSet.bind(scene.entities["floor"]));

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

	scene.entities["skybox"] = new cSkybox();

	// Lights -----------------
	scene.lights["ambient"] = {
		colour: 	[0.13, 0.17, 0.22]
	};
	scene.lights["point"] = {
		attenuation: 0.1,
		colour:  	[1.00, 0.85, 0.40],
		position: 	[1.00, 0.25, 0.0],
		intensity: 	0.70,
	};
	scene.lights["point"].setIntensity = function(val) { this.intensity = val; };
	sliderController('sun',	's_val', 
		scene.lights["point"].setIntensity.bind(scene.lights["point"]), 10, 1);

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
	hud.drawText(-5, -30, "Light: [L] Set Pos");

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
	if (input.keys[input.e.keys.Z]) {
		debugView = !debugView;
		input.keys[input.e.keys.Z] = false;
	}

	// Actually doing stuff ---
	scene.rain.run(dt);
};

function drawScene(dt) {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	scene.entities["skybox"].draw(camera);
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
	textureBind(floor.textures[floor.textureSet][0], shader.fUniforms.tAlbedo, 	0);
	textureBind(floor.textures[floor.textureSet][1], shader.fUniforms.tNormal, 	1);
	textureBind(floor.textures[floor.textureSet][2], shader.fUniforms.tSpec,	2);
	textureBind(scene.rain.textures.a[0], shader.fUniforms.tRain, 3);
	textureBind(scene.entities["skybox"].texture, shader.fUniforms.tSky, 4);

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
