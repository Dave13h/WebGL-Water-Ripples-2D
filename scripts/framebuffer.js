// ----------------------------------------------------------------------------
// Framebuffer Functions
// ----------------------------------------------------------------------------
function frameBufferCreate(texture) {
	var fbo = {
		buf: gl.createFramebuffer(),
		height: texture.height,
		width: texture.width
	};
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.buf);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
		gl.TEXTURE_2D, texture.buf, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	return fbo;
};

function frameBufferBind(fbo) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.buf);
	gl.viewport(0, 0, fbo.width, fbo.height);
};


function frameBufferAttach(fbo, texture) {
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
		gl.TEXTURE_2D, texture.buf, 0);
	fbo.height = texture.height;
	fbo.width = texture.width;
	gl.viewport(0, 0, fbo.width, fbo.height);
};

function frameBufferClearColor(r, g, b, a) {
	if (r == undefined)
		r = g = b = a = 1.0;
	a = (a != undefined ? a : 1.0);
	gl.clearColor(r, g, b, a);
	gl.clear(gl.COLOR_BUFFER_BIT);
};

function frameBufferCopyTexture(fbo, textureFrom, textureTo) {
	frameBufferBind(fbo);
	frameBufferAttach(fbo, textureTo);
	
	var shader = changeProgram("copyTexture");

	textureBind(textureFrom, shader.fUniforms.tTexture, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
};