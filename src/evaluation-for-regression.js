const { variance } = require('@kmamal/statistics/summary')

class EvaluationForRegression {
	constructor () {
		this._data = []
		this._residuals = []
	}

	addResult (actual, predicted) {
		this._data.push(actual)
		this._residuals.push(actual - predicted)
	}


	mae () {
		const N = this._data.length
		let sum = 0
		for (let i = 0; i < N; i++) {
			sum += Math.abs(this._residuals[i])
		}
		return sum / N
	}

	mse () {
		const N = this._data.length
		let sum = 0
		for (let i = 0; i < N; i++) {
			sum += this._residuals[i] ** 2
		}
		return sum / N
	}

	mape () {
		const N = this._data.length
		let sum = 0
		for (let i = 0; i < N; i++) {
			sum += Math.abs(this._residuals[i] / this._data[i])
		}
		return sum / N
	}

	smape () {
		const N = this._data.length
		let sum = 0
		for (let i = 0; i < N; i++) {
			const actual = this._data[i]
			const residual = this._residuals[i]
			if (actual === 0 && residual === 0) { continue }
			const predicted = actual - residual
			sum += Math.abs(residual) / (Math.abs(actual) + Math.abs(predicted))
		}
		return sum / N
	}

	coefficientOfDetermination () {
		const varianceOfResiduals = variance(this._residuals)
		const varianceOfData = variance(this._data)
		return 1 - varianceOfResiduals / varianceOfData
	}

	rSquared () { return this.coefficientOfDetermination() }

	adjustedRSquared (numPredictors) {
		const N = this._data.length
		const P = numPredictors
		const rSquared = this.rSquared()
		return 1 - (1 - rSquared) * (N - 1) / (N - P - 1)
	}
}

module.exports = { EvaluationForRegression }
