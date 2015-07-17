// ----------------------------------------------------------------------------
// Texture Manager
// ----------------------------------------------------------------------------
var textures = [];
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
			console.log("Texture: " + tex.img.src +
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

function initTextures() {
	// Default texture
	new cTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);
};
