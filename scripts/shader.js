// ----------------------------------------------------------------------------
// Shader Loader
// ----------------------------------------------------------------------------
var shaders = [];
var lastShader = null;

//
// Shader Swapper
//
function changeProgram(shader) {
	// Do nothing if changing to active program
	if (shader == lastShader)
		return shaders[shader];

	// Quick sanity check
	if (!shaders[shader]) {
		console.error("Shader " + shader + " doesn't exist!");
		return;
	}

	// Unbind old and bing new
	if (lastShader)
		shaders[lastShader].unbind();
	shaders[shader].bind();

	lastShader = shader;
	return shaders[shader];
};

//
// Loader Functions
//
function shaderGetVars(program, type, src) {
	var vars = [];
	if (!type || !src)
		return vars;

	switch(type) {
		case 'attribute':
			gl.useProgram(program);
			
			var matches = src.match(/attribute (.*?) (.*?);/gi);
			for (var m in matches) {
				var v = matches[m].split(" "),
					cut = v[2].indexOf("["),
					vName;
				if (cut > 0)
					vName = v[2].substring(0, cut);
				else
					vName = v[2].substring(0, v[2].length - 1);
				vars[vName] = gl.getAttribLocation(program, vName);

				if (vars[vName] != -1) {
					gl.enableVertexAttribArray(vars[vName]);
				}
			}

			gl.useProgram(null);
			return vars;
			break;

		case 'uniform':
			var matches = src.match(/uniform (.*?) (.*?);/gi);
			for (var m in matches) {
				var v = matches[m].split(" "),
					cut = v[2].indexOf("[");

				// Array
				if (cut > 0) {
					var u = v[2].substring(0, cut);
					var size = v[2].substring(cut + 1, v[2].indexOf("]"));
					if (isNaN(size)) {
						for (var d in defines) {
							if (size == d) {
								size = defines[d];
								break;
							}
						}
					}

					for (var s = 0; s < size; s++) {
						var uName = v[2].substr(0, cut) + "[" + s + "]";
						vars[uName] = 
							gl.getUniformLocation(program, uName);
					}
					
					// Pass full name on to root entry in the single entry too
					v[2] = v[2].substr(0, cut + 1);
				}
				var uName = v[2].substring(0, v[2].length - 1);
				vars[uName] = 
					gl.getUniformLocation(program, uName);
			}
			return vars;
			break;

		default:
			console.warn("Warning: unknown shader variable type - " + type);
			return vars;
			break;
	}
}

function shaderLoad(name){
	var shader = {};

	// Vertex Shader
	var vSource = document.getElementById(name + "-vs").textContent;
	vShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vShader, vSource);
	gl.compileShader(vShader);	
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {	
		console.warn("Failed to compile Vertex Shader: " + 
			name + "\n" + gl.getShaderInfoLog(vShader));	
		return null;
	}

	// Fragment Shader
	var fSource = document.getElementById(name + "-fs").textContent;
	var fShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fShader, fSource);
	gl.compileShader(fShader);	
	if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {	
		console.warn("Failed to compile Fragment Shader: " + 
			name + "\n" +gl.getShaderInfoLog(fShader));	
		return null;
	}

	// Link Shader
	shader.program = gl.createProgram();
	gl.attachShader(shader.program, vShader);
	gl.attachShader(shader.program, fShader);
	gl.linkProgram(shader.program);

	if (!gl.getProgramParameter(shader.program, gl.LINK_STATUS)) {
		console.warn("Failed to link Shader: " + name);
		return null;
	}

	// Get Attribute/Uniform Locations
	shader.attribs = shaderGetVars(shader.program, 'attribute', vSource);
	shader.vUniforms = shaderGetVars(shader.program, 'uniform', vSource); 
	shader.fUniforms = shaderGetVars(shader.program, 'uniform', fSource); 

	// Bind/Unbind
	shader.bind = function() { 
		gl.useProgram(this.program);
		for (var a in this.attribs) {
			if (this.attribs[a] == -1)
				continue;
			gl.enableVertexAttribArray(this.attribs[a]);
		}
	};
	shader.unbind = function() { 
		for (var a in this.attribs) {
			if (this.attribs[a] == -1)
				continue;
			gl.disableVertexAttribArray(this.attribs[a]);
		}
		gl.useProgram(null);
	};

	// Quick test and unbind current
	shader.bind();
	shader.unbind();

	console.log("Shader:\t\t%c" + name + " Compiled", logStyle);
	return shader;	
}
