// ----------------------------------------------------------------------------
// Camera Class
// ----------------------------------------------------------------------------
var cCamera = function(pos, ang) {
	this.camMat		= mat4.create();
	this.pMat 		= mat4.create();
	this.rotMat		= mat4.create();
	this.qRot 		= quat.create();
	this.qRotU 		= quat.create();
	this.qRotR 		= quat.create();

	this.position	= pos || [ 0.0,  0.0,  0.0];
	this.delta 		= [ 0.0,  0.0,  0.0];
	this.angle 		= ang || [ 0.0,  0.0,  0.0];
	this.right 		= [ 1.0,  0.0,  0.0];
	this.up			= [ 0.0,  1.0,  0.0];
	this.mSpeed		= 5.0;	// Move Speed
	this.tSpeed		= 90.0;	// Turn Speed

	mat4.perspective(this.pMat,
		glMatrix.toRadian(60.0),
		Number(canvas.clientWidth) / Number(canvas.clientHeight),
		0.1, 1000.0);

	this.update();
};
cCamera.prototype.update = function(dt) {
	// Controls
	if (input.keys[input.e.keys.A]) this.delta[0] += this.mSpeed * dt;
	if (input.keys[input.e.keys.D]) this.delta[0] -= this.mSpeed * dt;
	if (input.keys[input.e.keys.Q]) this.delta[1] += this.mSpeed * dt;
	if (input.keys[input.e.keys.E]) this.delta[1] -= this.mSpeed * dt;
	if (input.keys[input.e.keys.W]) this.delta[2] += this.mSpeed * dt;
	if (input.keys[input.e.keys.S]) this.delta[2] -= this.mSpeed * dt;

	if (input.keys[input.e.keys.DOWN_ARROW]) this.angle[0] += this.tSpeed * dt;
	if (input.keys[input.e.keys.UP_ARROW]) 	 this.angle[0] -= this.tSpeed * dt;
	if (input.keys[input.e.keys.LEFT_ARROW]) this.angle[1] += this.tSpeed * dt;
	if (input.keys[input.e.keys.RIGHT_ARROW])this.angle[1] -= this.tSpeed * dt;

	// Rotation
	if (this.angle[0] > 360) this.angle[0] -= 360;
	else if (this.angle[0] < 0) this.angle[0] += 360;
	if (this.angle[1] > 360) this.angle[1] -= 360;
	else if (this.angle[1] < 0) this.angle[1] += 360;

	var radiansX = glMatrix.toRadian(this.angle[0]) * 0.5,
		radiansY = glMatrix.toRadian(this.angle[1]) * 0.5,
		radiansZ = glMatrix.toRadian(this.angle[2]) * 0.5,
		cX = Math.cos(radiansX), cY = Math.cos(radiansY), cZ = Math.cos(radiansZ),
		sX = Math.sin(radiansX), sY = Math.sin(radiansY), sZ = Math.sin(radiansZ);
	this.qRot[3] = cX * cY * cZ + sX * sY * sZ;
	this.qRot[0] = sX * cY * cZ - cX * sY * sZ;
	this.qRot[1] = cX * sY * cZ + sX * cY * sZ;
	this.qRot[2] = cX * cY * sZ - sX * sY * cZ;

	vec3.transformQuat(this.delta, this.delta, this.qRot);

	// Movement
	this.position[0] += this.delta[0];
	this.position[1] += this.delta[1];
	this.position[2] += this.delta[2];

	this.delta[0] = 0.0;
	this.delta[1] = 0.0;
	this.delta[2] = 0.0;

	// Setup View Matrix
	var x = this.qRot[0], y = this.qRot[1], z = this.qRot[2], w = this.qRot[3],
		x2 = x + x,		y2 = y + y,		z2 = z + z,
		xx = x * x2,	xy = x * y2,	xz = x * z2,
		yy = y * y2,	yz = y * z2,	zz = z * z2,
		wx = w * x2,	wy = w * y2,	wz = w * z2;
	this.rotMat[0] = 1 - (yy + zz);
	this.rotMat[1] = xy - wz;
	this.rotMat[2] = xz + wy;
	this.rotMat[3] = 0;
	this.rotMat[4] = xy + wz;
	this.rotMat[5] = 1 - (xx + zz);
	this.rotMat[6] = yz - wx;
	this.rotMat[7] = 0;
	this.rotMat[8] = xz - wy;
	this.rotMat[9] = yz + wx;
	this.rotMat[10] = 1 - (xx + yy);
	this.rotMat[11] = 0;
	this.rotMat[12] = 0;
	this.rotMat[13] = 0;
	this.rotMat[14] = 0;
	this.rotMat[15] = 1;

	mat4.identity(this.camMat);
	mat4.multiply(this.camMat, this.camMat, this.rotMat);
	mat4.translate(this.camMat, this.camMat, this.position);
};
