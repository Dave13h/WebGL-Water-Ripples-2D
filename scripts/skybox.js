// ----------------------------------------------------------------------------
// Skybox Class
// ----------------------------------------------------------------------------
var cSkybox = function() {
	this.buf = gl.createBuffer();
	this.mat = mat4.create();

	this.texture = new cTexture([
		'textures/SunSetLeft.jpg',
		'textures/SunSetRight.jpg',
		'textures/SunSetUp.jpg',
		'textures/SunSetDown.jpg',
		'textures/SunSetFront.jpg',
		'textures/SunSetBack.jpg'
	]);


	gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	 	// top
		 1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,
 
		 1.0,  1.0, -1.0,
		 1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,

		// Bottom
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		 1.0, -1.0,  1.0,

		-1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		 1.0, -1.0, -1.0,

		// Front
		 1.0,  1.0, -1.0,
		-1.0,  1.0, -1.0,
		-1.0, -1.0, -1.0,
 
		 1.0, -1.0, -1.0,
		 1.0,  1.0, -1.0,
		-1.0, -1.0, -1.0,

		// Back
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
 
		-1.0, -1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0, -1.0,  1.0,

		// Left
		-1.0,  1.0,  1.0,
		-1.0, -1.0,  1.0,
		-1.0, -1.0, -1.0,
 
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		-1.0, -1.0, -1.0,

		// Right
		 1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		 1.0,  1.0,  1.0,
 
		 1.0, -1.0, -1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0, -1.0
	]), gl.STATIC_DRAW);

};

cSkybox.prototype.draw = function(cam) {
	var shader = changeProgram("skybox");

	textureBind(this.texture, shader.fUniforms.tTexture, 0);

	// Inverse camera rotation
	mat4.identity(this.mat);
	mat4.rotateX(this.mat, this.mat, glMatrix.toRadian(-cam.angle[0]));
	mat4.rotateY(this.mat, this.mat, glMatrix.toRadian(-cam.angle[1]));
	
	gl.uniformMatrix4fv(shader.vUniforms.uCamMat, false, this.mat);
	gl.uniformMatrix4fv(shader.vUniforms.uPMat,	  false, cam.pMat);

	gl.depthMask(false);
	gl.disable(gl.DEPTH_TEST);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 12, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 36);

	gl.enable(gl.DEPTH_TEST);
	gl.depthMask(true);
};