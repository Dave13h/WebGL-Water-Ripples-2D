// ----------------------------------------------------------------------------
// Rain Simulation Class
// ----------------------------------------------------------------------------
var cRain = function() {
	this.cFactor		= 0.499;
	this.dampingFactor	= 0.988;
	this.lastRain 		= 0.0;
	this.maxStrength 	= 450.0;
	this.paused 		= false;
	this.randomDrops 	= false;
	this.rate 			= 10;
	this.rateTimer 		= 0.0;
	this.simTime 		= 0.0;
	this.size 			= 1024;

	this.nSize 			= (1.0 / this.size);
	this.dropSize 		= this.nSize * (this.size / 80.0);

	// Buffer for drawing simulation into the textures
	this.simQuad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.simQuad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1.0, -1.0,
		 1.0, -1.0,
		-1.0,  1.0,

		-1.0,  1.0,
		 1.0, -1.0,
		 1.0,  1.0
	]), gl.STATIC_DRAW);

	// Textures
	var tmpTextureData = new Float32Array(this.size * this.size * 3);
	this.textures	= {};
	this.textures.a	= [];
	this.textures.a.push(new cTexture(tmpTextureData, this.size, this.size, gl.RGB, gl.FLOAT));
	this.textures.a.push(new cTexture(tmpTextureData, this.size, this.size, gl.RGB, gl.FLOAT));
	this.textures.prev = new cTexture(tmpTextureData, this.size, this.size, gl.RGB, gl.FLOAT);
	this.textures.new  = new cTexture(tmpTextureData, this.size, this.size, gl.RGB, gl.FLOAT);
};

// ----------------------------------------------------------------------------
// Setters
// ----------------------------------------------------------------------------
cRain.prototype.setDamping 	= function(val) { this.dampingFactor = val; };
cRain.prototype.setDropSize	= function(val) { this.dropSize = val; 		};
cRain.prototype.setMaxStr 	= function(val) { this.maxStrength = val; 	};
cRain.prototype.setRate 	= function(val) { this.rate = val; 			};

// ----------------------------------------------------------------------------
// Simulation
// ----------------------------------------------------------------------------
cRain.prototype.run = function(dt) {
	if (this.paused)
		return;

	this.propagate();

	if (this.rate > 0) {
		this.rateTimer += dt;

		while (this.rateTimer > 1.0 / this.rate) {
			this.rateTimer -= 1.0 / this.rate;
			this.simulate(
				Math.floor(Math.random() * this.size),
				Math.floor(Math.random() * this.size),
				this.maxStrength * Math.random()
			);
		}
	}

	frameBufferCopyTexture(scene.offscreen.fbo, this.textures.a[0], this.textures.prev);
	this.damping();
};

cRain.prototype.damping = function() {
	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, this.textures.a[0]);

	var shader = changeProgram("damping");

	textureBind(this.textures.new, shader.fUniforms.tTexture, 0);

	gl.uniform1f(shader.fUniforms.uDamping, this.dampingFactor);

	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};

cRain.prototype.propagate = function() {
	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, this.textures.new);

	var shader = changeProgram("propagate");

	textureBind(this.textures.prev, shader.fUniforms.tPrev, 0);
	textureBind(this.textures.a[0], shader.fUniforms.tCurrent, 1);

	gl.uniform1f(shader.fUniforms.uSize, this.nSize);
	gl.uniform1f(shader.fUniforms.uC, this.cFactor);

	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};

cRain.prototype.simulate = function(x, y, strength) {
	frameBufferCopyTexture(scene.offscreen.fbo,
		this.textures.a[0], this.textures.a[1]);

	frameBufferBind(scene.offscreen.fbo);
	frameBufferAttach(scene.offscreen.fbo, this.textures.a[0]);

	var shader = changeProgram("simulate");

	gl.uniform1f(shader.vUniforms.uDropSize, this.dropSize);
	gl.uniform2f(shader.vUniforms.uOffset,
		(x - (this.size / 2)) * (this.nSize * 2),
		(y - (this.size / 2)) * (this.nSize * 2));

	textureBind(this.textures.a[1], shader.fUniforms.tCurrent, 0);
	gl.uniform1f(shader.fUniforms.uStrength, strength);
	gl.uniform1f(shader.fUniforms.uSize, this.size);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.simQuad);
		gl.vertexAttribPointer(shader.attribs.aPos, 2, gl.FLOAT, false, 8, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};
