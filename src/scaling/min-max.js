const { min: calcMin } = require('@kmamal/util/array/min')
const { max: calcMax } = require('@kmamal/util/array/max')

class Scaler {
	constructor (domain) {
		this._domain = domain
		this._labelIndex = domain.findIndex((x) => x.isLabel)
		const M = this._domain.length
		this._mins = new Array(M).fill(null)
		this._ranges = new Array(M).fill(null)
	}

	fit (samples) {
		const M = this._domain.length

		for (let m = 0; m < M; m++) {
			const variable = this._domain[m]
			if (variable === null || variable.type === 'nominal') { continue }

			const values = samples.map((sample) => sample[m])
			const min = calcMin(values)
			const max = calcMax(values)
			this._mins[m] = min
			this._ranges[m] = (max - min) || 1
		}
	}

	map (sample) {
		const M = this._domain.length
		const scaled = new Array(M)
		for (let m = 0; m < M; m++) {
			const variable = this._domain[m]
			if (variable === null || variable.type === 'nominal') {
				scaled[m] = sample[m]
				continue
			}
			scaled[m] = (sample[m] - this._mins[m]) / this._ranges[m]
		}
		return scaled
	}

	restore (scaled) {
		const M = this._domain.length
		const sample = new Array(M)
		for (let m = 0; m < M; m++) {
			const variable = this._domain[m]
			if (variable === null || variable.type === 'nominal') {
				sample[m] = scaled[m]
				continue
			}
			sample[m] = scaled[m] * this._ranges[m] + this._mins[m]
		}
		return sample
	}

	restoreLabel (scaled) {
		return scaled * this._ranges[this._labelIndex] + this._mins[this._labelIndex]
	}
}

module.exports = { Scaler }
