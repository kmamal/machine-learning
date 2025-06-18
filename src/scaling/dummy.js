
class Scaler {
	fit () {}
	map (sample) { return [ ...sample ] }
	restore (scaled) { return [ ...scaled ] }
	restoreLabel (scaled) { return scaled }
}

module.exports = { Scaler }
