// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------
var scene = {
	entities: 	[],
	lights: 	[]
};
var camera = new cCamera([0.0, -2.0, -1.25], [300.0, 0.0, 0.0]);
var rain = {
	a: 			null,
	a_new: 		null,
	a_prev:		null,
	lastRain: 	0.0,
	randomDrops:true,
	sim: 		true,
	simTime: 	0.0,
	size: 		512,
	texture: 	null
};

function initScene() {
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
		colour:  	[0.25, 0.25, 0.05],
		position: 	[0.00, 2.00, 0.00]
	};

	// Rain -------------------
	var size = (rain.size + 2) * (rain.size + 2);
	rain.a 			= new Float32Array(size);
	rain.a_new 		= new Float32Array(size);
	rain.a_prev		= new Float32Array(size);
	rain.texture	= new cTexture(rain.a, rain.size + 2, rain.size + 2, gl.LUMINANCE, gl.FLOAT);
	rain.lastRain 	= 0.0;
};

// ----------------------------------------------------------------------------
// Frame Functions
// ----------------------------------------------------------------------------
var frameTime = 0.0;
function updateScene(dt) {
	var frameStart = window.performance.now();

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

	hud.drawText(-5, 10, "Frame: " + frameTime.toFixed(4) + "ms");
	hud.drawText(-5, 20, "Sim: " + rain.simTime.toFixed(4) + "ms");

	hud.drawText(-5, -20, "Controls: [C]lear Data / [R]andom Drops: " +
		(rain.randomDrops ? 'On' : 'Off') + " / [P]ause Sim");
	hud.drawText(-5, -10, "Camera: [WASDQE] Move / [↑↓← →] Turn");

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

	// Sim --------------------
	if (rain.sim) {
		var simStart = window.performance.now();
		if (rain.randomDrops && (rain.lastRain += dt) > 0.5) {
			addAmplitude(
				Math.floor(Math.random() * rain.size),
				Math.floor(Math.random() * rain.size),
				Math.random() * 50
			);
			rain.lastRain = 0.0;
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

	frameTime = window.performance.now() - frameStart;
};

function drawScene(dt) {
	drawFloor();
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
	var x0 = i;
	var y0 = j;

	rain.a[IX(x0, y0)]			+= 6.0 * strength;
	rain.a[IX(x0, y0 + 1)]		+= 2.0 * strength;
	rain.a[IX(x0 + 1, y0 + 1)]	+= 1.0 * strength;
	rain.a[IX(x0 + 1, y0)]		+= 2.0 * strength;
	rain.a[IX(x0 - 1, y0 + 1)]	+= 1.0 * strength;
	rain.a[IX(x0, y0 - 1)]		+= 2.0 * strength;
	rain.a[IX(x0 - 1, y0 - 1)]	+= 1.0 * strength;
	rain.a[IX(x0 - 1, y0)]		+= 2.0 * strength;
	rain.a[IX(x0 + 1, y0 - 1)]	+= 1.0 * strength;
};

function propagate() {
	var i, j, NEUMANN, offset;
	var c = 0.499;
	var damping = 0.988;

	for (i = 1; i <= rain.size; ++i) {
		for (j = 1; j <= rain.size; ++j) {
			NEUMANN =
				rain.a[IX(i + 1, j)] +
				rain.a[IX(i - 1, j)] +
				rain.a[IX(i, j - 1)] +
				rain.a[IX(i, j + 1)];

			offset = IX(i, j);
			rain.a_new[offset] = c * ((NEUMANN) - 4.0 * rain.a[offset]) -
				rain.a_prev[offset] + 2.0 * rain.a[offset];
		}
	}

	for (i = 1; i <= rain.size; ++i) {
		for (j = 1; j <= rain.size; ++j) {
			offset = IX(i, j);
			rain.a_prev[offset] = rain.a[offset];
			rain.a[offset] = rain.a_new[offset] * damping;
		}
	}
}

function rainSim(i, j, strength) {
	var x, y, r;
	for (x = i - rain.size / 80; x < i + rain.size / 80; ++x) {
		for(y = j - rain.size / 80; y < j + rain.size / 80; ++y) {
			r = Math.sqrt(Math.pow(i - x, 2.0) + Math.pow(j - y, 2.0));
			if (i + x > 0 && i + x < rain.size && j + y > 0 && j + y < rain.size) {
				rain.a[IX(i + x, j + y)] += -strength *
					Math.sin(Math.PI * r * 0.32) / (25 * r + 0.001);
			}
		}
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
	gl.bindTexture(gl.TEXTURE_2D, rain.texture.buf);
	gl.uniform1i(shader.fUniforms.tRain, 3);

	// Draw Quad
	gl.uniformMatrix4fv(shader.vUniforms.uMat, false, floor.mat);
	gl.bindBuffer(gl.ARRAY_BUFFER, floor.buf);
		gl.vertexAttribPointer(shader.attribs.aPos, 		3, gl.FLOAT, false, 56, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  		2, gl.FLOAT, false, 56, 12);
		gl.vertexAttribPointer(shader.attribs.aNormal,  	3, gl.FLOAT, false, 56, 20);
		gl.vertexAttribPointer(shader.attribs.aTangent,  	3, gl.FLOAT, false, 56, 32);
		gl.vertexAttribPointer(shader.attribs.aBiTangent,  	3, gl.FLOAT, false, 56, 44);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}
