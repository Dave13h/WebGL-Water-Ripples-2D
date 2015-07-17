// ----------------------------------------------------------------------------
// Hud
// ----------------------------------------------------------------------------
var cHud = function() {
	this.ctx 	= document.querySelector('#hud').getContext('2d');
	this.size	= [document.querySelector('#hud').width,
		document.querySelector('#hud').height];
};

cHud.prototype.update = function(dt) {
	// Reset eeevvveeerrrything
	this.ctx.setTransform(1, 0, 0, 1, 0, 0);
	this.ctx.clearRect(0, 0, this.size[0], this.size[1]);
	this.ctx.fillStyle = "rgba(255, 200, 55, 255)";
	this.ctx.textAlign = "left";
	this.ctx.textBaseline = "middle";
};

cHud.prototype.drawText = function(x, y, text, colour) {
	var textAlign = (x < 0) ? "right" : "left";
	x = (x < 0) ? this.size[0] + x : x;
	y = (y < 0) ? this.size[1] + y : y;

	this.ctx.save();
		this.ctx.fillStyle = colour || "rgba(255, 200, 55, 255)";
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.textAlign = textAlign;
		this.ctx.translate(x, y);
		this.ctx.fillText(text, 0, 0);
	this.ctx.restore();
};
