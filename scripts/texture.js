// ----------------------------------------------------------------------------
// Texture Manager
// ----------------------------------------------------------------------------
var textures = [];
var textureViewerBuf;

var cTexture = function(image, width, height, channels, storage, mipmap, af) {
	
	this.af 	= (typeof(af) == "undefined" ? true : af);
	this.buf 	= this._buf = gl.createTexture();
	this.channels = channels || gl.RGBA;
	this.height	= height || 1;
	this.id 	= textures.length;
	this.mipmap	= (typeof(mipmap) == "undefined" ? true : mipmap);
	this.storage= storage || gl.UNSIGNED_BYTE;
	this.type 	= gl.TEXTURE_2D;
	this.width 	= width || 1;

	// Load image from file
	if (typeof(image) == "string") {
		this.buf = textures[0].buf; // Use default texture until loaded

		this.img = new Image();
		this.img.onload = (function(tex) { return function() {
			gl.bindTexture(gl.TEXTURE_2D, tex._buf);
			gl.texImage2D(gl.TEXTURE_2D, 0, tex.channels, tex.channels, tex.storage, tex.img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
			if (tex.mipmap)
				gl.generateMipmap(gl.TEXTURE_2D);

			if (tex.af && glEXT["EXT_texture_filter_anisotropic"] &&
				glEXT["EXT_texture_filter_anisotropic"].max > 0)
				gl.texParameterf(gl.TEXTURE_2D,
					glEXT["EXT_texture_filter_anisotropic"].TEXTURE_MAX_ANISOTROPY_EXT,
					glEXT["EXT_texture_filter_anisotropic"].max);

			tex.buf = tex._buf;
			tex.width = tex.img.width;
			tex.height = tex.img.height;

			console.log("Texture:\t%c" + tex.img.src +
				" [" + tex.width + "x" + tex.height + "] [MipMapped: " +
				(tex.mipmap ? "True" : "False") + "] [AF: " +
				glEXT["EXT_texture_filter_anisotropic"].max + "] Loaded", logStyle);

			gl.bindTexture(gl.TEXTURE_2D, null);

			delete tex.img;
		}})(this);
		this.img.src = image;

	// Image is Float32Array
	} else if (image.BYTES_PER_ELEMENT) {
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

		if (this.mipmap)
			gl.generateMipmap(gl.TEXTURE_2D);

		if (this.af && glEXT["EXT_texture_filter_anisotropic"] &&
			glEXT["EXT_texture_filter_anisotropic"].max > 0)
			gl.texParameterf(gl.TEXTURE_2D,
				glEXT["EXT_texture_filter_anisotropic"].TEXTURE_MAX_ANISOTROPY_EXT,
				glEXT["EXT_texture_filter_anisotropic"].max);

		gl.bindTexture(gl.TEXTURE_2D, null);
		console.log("Texture:\t%cImage From Data" + " [" + this.width + "x" + this.height + 
			"] [MipMapped: " + (this.mipmap ? "True" : "False") + "] [AF: " +
			glEXT["EXT_texture_filter_anisotropic"].max + "] Created", logStyle);
	} else {
		this.buf = textures[0].buf; // Use default texture until loaded
		
		this.imgs = [];
		this.loadCount = image.length;
		for (var i in image) {
			var img = new Image();
			img.onload = (function(tex, i) { return function() {

				// Wait until they are all loaded
				if (--tex.loadCount == 0) {
					tex.width = tex.imgs[0].width;
					tex.height = tex.imgs[0].height;
					
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex._buf);
					var names = [];
					for (var ic = 0; ic < 6; ++ic) {
						gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + ic, 0, 
							tex.channels, tex.channels, tex.storage, tex.imgs[ic]);
						names.push(tex.imgs[ic].src);
						delete tex.imgs[ic];	
					}

					console.log("Texture:\t%cCubemap " + "[" + tex.width + "x" + tex.height + 
						"] [MipMapped: " + (tex.mipmap ? "True" : "False") + "] [AF: " +
						glEXT["EXT_texture_filter_anisotropic"].max + "] Loaded\n\t\t\t" +
						names.join("\n\t\t\t"), logStyle);
					
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, 
						gl.LINEAR_MIPMAP_NEAREST);

					if (tex.mipmap)
						gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

					if (tex.af && glEXT["EXT_texture_filter_anisotropic"] &&
						glEXT["EXT_texture_filter_anisotropic"].max > 0)
						gl.texParameterf(gl.TEXTURE_CUBE_MAP,
							glEXT["EXT_texture_filter_anisotropic"].TEXTURE_MAX_ANISOTROPY_EXT,
							glEXT["EXT_texture_filter_anisotropic"].max);

					tex.type = gl.TEXTURE_CUBE_MAP;
					tex.buf = tex._buf;
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
				}
			}})(this, i);
			img.src = image[i];			
			this.imgs.push(img);
		}
	}

	textures.push(this);
};

// ----------------------------------------------------------------------------
// Helper Functions 
// ----------------------------------------------------------------------------
function textureBind(texture, loc, tid) {
	tid = tid || 0;
	gl.activeTexture(gl.TEXTURE0 + tid);
	gl.bindTexture(texture.type, texture.buf);
	gl.uniform1i(loc, tid);
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

	textureBind(texture, shader.fUniforms.tTexture, 0);

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

// ----------------------------------------------------------------------------
// Init Functions 
// ----------------------------------------------------------------------------
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
