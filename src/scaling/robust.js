const {
	median: calcMedian,
	interQuartileRange: calcIrq,
} = require('@kmamal/statistics/summary')

class Scaler {
	constructor (domain) {
		this._domain = domain
		this._labelIndex = domain.findIndex((x) => x.isLabel)
		const M = this._domain.length
		this._medians = new Array(M).fill(null)
		this._irqs = new Array(M).fill(null)
	}

	fit (samples) {
		const M = this._domain.length

		for (let m = 0; m < M; m++) {
			const variable = this._domain[m]
			if (variable === null || variable.type === 'nominal') { continue }

			const values = samples.map((sample) => sample[m])
			const median = calcMedian(values)
			const irq = calcIrq(values)
			this._medians[m] = median
			this._irqs[m] = irq || 1
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
			scaled[m] = (sample[m] - this._medians[m]) / this._irqs[m]
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
			sample[m] = scaled[m] * this._irqs[m] + this._medians[m]
		}
		return sample
	}

	restoreLabel (scaled) {
		return scaled * this._irqs[this._labelIndex] + this._medians[this._labelIndex]
	}
}

module.exports = { Scaler }
