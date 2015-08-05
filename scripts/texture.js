// ----------------------------------------------------------------------------
// Texture Manager
// ----------------------------------------------------------------------------
var textures = [];
var textureViewerBuf;

var cTexture = function(image, width, height, channels, storage) {
	this.buf = this._buf = gl.createTexture();
	this.channels = channels || gl.RGBA;
	this.height = height || 1;
	this.id = textures.length;
	this.storage = storage || gl.UNSIGNED_BYTE;
	this.width = width || 1;

	// Load image from file
	if (typeof(image) == "string") {
		this.buf = textures[0].buf; // Use default texture until loaded

		this.img = new Image();
		this.img.onload = (function(tex) { return function() {
			gl.bindTexture(gl.TEXTURE_2D, tex._buf);
			gl.texImage2D(gl.TEXTURE_2D, 0, tex.channels, tex.channels, tex.storage, tex.img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			tex.buf = tex._buf;
			tex.width = tex.img.width;
			tex.height = tex.img.height;
			console.log("Texture:\t" + tex.img.src +
				" [" + tex.width + "x" + tex.height + "] Loaded");
		}})(this);
		this.img.src = image;

	// Image is array
	} else {
		gl.bindTexture(gl.TEXTURE_2D, this.buf);
		gl.texImage2D(gl.TEXTURE_2D, 0, this.channels,
			this.width, this.height, 0,
			this.channels, this.storage, image);

		if (this.storage == gl.FLOAT) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
		console.log("Texture:\tBlank" + " [" + this.width + "x" + this.height + "] Created");
	}

	textures.push(this);
};

function textureUpdate(texture, data) {
	gl.bindTexture(gl.TEXTURE_2D, texture.buf);
	gl.texImage2D(gl.TEXTURE_2D, 0, texture.channels,
		texture.width, texture.height, 0,
		texture.channels, texture.storage, data);
	gl.bindTexture(gl.TEXTURE_2D, null);
};

function textureViewer(texture, x, y, size_x, size_y) {
	var shader = changeProgram("textureViewer"),

	x = x || 0;
	y = y || 0;
	size_x = size_x || texture.width;
	size_y = size_y || texture.height;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture.buf);
	gl.uniform1i(shader.fUniforms.tTexture, 0);

	gl.uniform2f(shader.vUniforms.uOffset, x, y);
	gl.uniform2f(shader.vUniforms.uSize, size_x, size_y);
	gl.uniform1f(shader.vUniforms.uWinHeight, canvas.clientHeight);
	gl.uniform1f(shader.vUniforms.uWinWidth, canvas.clientWidth);

	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.bindBuffer(gl.ARRAY_BUFFER, textureViewerBuf);
		gl.vertexAttribPointer(shader.attribs.aPos, 3, gl.FLOAT, false, 20, 0);
		gl.vertexAttribPointer(shader.attribs.aUV,  2, gl.FLOAT, false, 20, 12);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
};

function initTextures() {
	// Default texture
	new cTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);

	// Texture Viewer Shader
	shaders["textureViewer"] = shaderLoad("textureViewer");
	textureViewerBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureViewerBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0.0, 0.0, 0.0,	0.0, 0.0,
		1.0, 0.0, 0.0,	1.0, 0.0,
		0.0, 1.0, 0.0,	0.0, 1.0,

		0.0, 1.0, 0.0,	0.0, 1.0,
		1.0, 0.0, 0.0,	1.0, 0.0,
		1.0, 1.0, 0.0,	1.0, 1.0
	]), gl.STATIC_DRAW);
};
