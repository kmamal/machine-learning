const {
	mean: calcMean,
	standardDeviationHavingMean: calcStd,
} = require('@kmamal/statistics/summary')

class Scaler {
	constructor (domain) {
		this._domain = domain
		this._labelIndex = domain.findIndex((x) => x.isLabel)
		const M = this._domain.length
		this._means = new Array(M).fill(null)
		this._stds = new Array(M).fill(null)
	}

	fit (samples) {
		const M = this._domain.length

		for (let m = 0; m < M; m++) {
			const variable = this._domain[m]
			if (variable === null || variable.type === 'nominal') { continue }

			const values = samples.map((sample) => sample[m])
			const mean = calcMean(values)
			const std = calcStd(values, mean)
			this._means[m] = mean
			this._stds[m] = std || 1
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
			scaled[m] = (sample[m] - this._means[m]) / this._stds[m]
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
			sample[m] = scaled[m] * this._stds[m] + this._means[m]
		}
		return sample
	}

	restoreLabel (scaled) {
		return scaled * this._stds[this._labelIndex] + this._means[this._labelIndex]
	}
}

module.exports = { Scaler }
