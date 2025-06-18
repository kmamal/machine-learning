const { addDefault } = require('@kmamal/util/map/add-default')
const Counts = require('@kmamal/counts/map')

class EvaluationForClassification {
	constructor () {
		this._labels = new Set()

		this._confusionMatrix = new Map()
		addDefault(this._confusionMatrix, () => new Map())

		this._size = 0
	}

	addResult (actual, predicted) {
		this._labels.add(actual)
		this._labels.add(predicted)

		Counts.inc(this._confusionMatrix.get(actual), predicted)

		this._size++
	}


	accuracy () {
		let sum = 0
		for (const x of this._labels) {
			sum += this.truePositivesForLabel(x)
		}
		return sum / this._size
	}

	lift () {
		let sum = 0
		for (const x of this._labels) {
			sum += this.truePositiveRateForLabel(x) - this.presenceForLabel(x)
		}
		return sum
	}


	countActualForLabel (x) {
		let sum = 0
		for (const y of this._labels) {
			sum += this._confusionMatrix.getRaw(x)?.get(y) ?? 0
		}
		return sum
	}

	countPredictedForLabel (x) {
		let sum = 0
		for (const y of this._labels) {
			sum += this._confusionMatrix.getRaw(y)?.get(x) ?? 0
		}
		return sum
	}

	presenceForLabel (x) {
		return this.countActualForLabel(x) / this._size
	}


	truePositivesForLabel (x) {
		return this._confusionMatrix.getRaw(x)?.get(x) ?? 0
	}

	falsePositivesForLabel (x) {
		return this.countPredictedForLabel(x) - this.truePositivesForLabel(x)
	}

	falseNegativesForLabel (x) {
		return this.countActualForLabel(x) - this.truePositivesForLabel(x)
	}

	trueNegativesForLabel (x) {
		return this._size
			- this.truePositivesForLabel(x)
			- this.falseNegativesForLabel(x)
			- this.falsePositivesForLabel(x)
	}


	truePositiveRateForLabel (x) {
		return this.truePositivesForLabel(x)
			/ this.countActualForLabel(x)
	}

	falsePositiveRateForLabel (x) {
		return this.falsePositivesForLabel(x)
			/ (this._size - this.countActualForLabel(x))
	}

	falseNegativeRateForLabel (x) {
		return this.falseNegativesForLabel(x)
			/ this.countActualForLabel(x)
	}

	trueNegativeRateForLabel (x) {
		return this.falsePositivesForLabel(x)
			/ (this._size - this.countActualForLabel(x))
	}


	positivePredictiveValueForLabel (x) {
		return this.truePositivesForLabel(x)
			/ this.countPredictedForLabel(x)
	}

	falseOmissionRateForLabel (x) {
		return this.falseNegativesForLabel(x)
			/ (this._size - this.countPredictedForLabel(x))
	}

	falseDiscoveryRateForLabel (x) {
		return this.falsePositivesForLabel(x)
			/ this.countPredictedForLabel(x)
	}

	negativePredictiveValueForLabel (x) {
		return this.trueNegativeForLabel(x)
			/ (this._size - this.countPredictedForLabel(x))
	}


	recallForLabel (x) { return this.truePositiveRateForLabel(x) }
	precisionForLabel (x) { return this.positivePredictiveValueForLabel(x) }

	sensitivityForLabel (x) { return this.truePositiveRateForLabel(x) }
	specificityForLabel (x) { return this.trueNegativeRateForLabel(x) }
}

module.exports = { EvaluationForClassification }
