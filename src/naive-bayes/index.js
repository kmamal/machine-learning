const Counts = require('@kmamal/counts/map')
const { addDefault } = require('@kmamal/util/map/add-default')
const { create } = require('@kmamal/util/array/create')
const { optimalBinParams, getBinIndex } = require('@kmamal/statistics/quantization')
const { optimalKernelParams, makeTriangularKernel, evaluate } = require('@kmamal/statistics/density-estimation/density-estimation')


class CountingLikelihoodPredictor {
	constructor () {
		this._counts = new Map()
	}

	addObservation (x) {
		Counts.inc(this._counts, x)
	}

	getLikelihood (x) {
		return this._counts.get(x) / Counts.total(this._counts)
	}
}

class QuantizationLikelihoodPredictor {
	constructor ({ min, max, k }) {
		this._min = min
		this._max = max
		this._k = k
		this._counts = new CountingLikelihoodPredictor()
	}

	addObservation (x) {
		const index = getBinIndex(x, this._min, this._max, this._k)
		this._counts.addObservation(index)
	}

	getLikelihood (x) {
		const index = getBinIndex(x, this._min, this._max, this._k)
		return this._counts.getLikelihood(index)
	}
}

class DensityEstimationLikelihoodPredictor {
	constructor ({ width }) {
		this._observations = []
		this._width = width
		this._kernel = makeTriangularKernel(width)
	}

	addObservation (x) {
		this._observations.push(x)
	}

	getLikelihood (x) {
		return evaluate(this._observations, x, this._kernel, this._width)
	}
}


const makeLearner = ({ domain }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const variables = domain.map((originalVariable, index) => {
		if (originalVariable === null || originalVariable.isLabel) { return null }

		const { type, ...variable } = originalVariable

		const isBounded = type === 'ordinal' || type === 'nominal'
		if (isBounded) {
			variable.makeQuantizationParams = () => {}
			variable.makeLikelihoodPredictor = () => new CountingLikelihoodPredictor()
		}
		else if (type === 'integer') {
			variable.makeQuantizationParams = (samples) => optimalBinParams(samples.map((sample) => sample[index]))
			variable.makeLikelihoodPredictor = (params) => new QuantizationLikelihoodPredictor(params)
		}
		else {
			variable.makeQuantizationParams = (samples) => optimalKernelParams(samples.map((sample) => sample[index]))
			variable.makeLikelihoodPredictor = (params) => new DensityEstimationLikelihoodPredictor(params)
		}

		return variable
	})

	const train = (samples) => {
		const quantizationParams = variables
			.map((variable) => variable?.makeQuantizationParams(samples))

		const N = samples.length
		const D = samples[0].length

		const observations = new Map()
		addDefault(observations, () => ({
			prior: 0,
			likelihoods: create(D, (i) => variables[i]?.makeLikelihoodPredictor(quantizationParams[i])),
		}))

		for (const sample of samples) {
			const label = sample[labelIndex]

			const outputClass = observations.get(label)
			outputClass.prior++

			for (let i = 0; i < D; i++) {
				const variable = variables[i]
				if (variable === null) { continue }
				const value = sample[i]
				outputClass.likelihoods[i].addObservation(value)
			}
		}

		for (const outputClass of observations.values()) {
			outputClass.prior /= N
		}

		return { observations }
	}

	const predict = (model, sample) => {
		const { observations } = model
		let total = 0

		let bestLabel
		let bestLikelihood = 0
		for (const [ label, outputClass ] of observations.entries()) {
			const { prior, likelihoods } = outputClass

			let likelihood = prior
			for (let i = 0; i < variables.length; i++) {
				const variable = variables[i]
				if (variable === null) { continue }
				const value = sample[i]
				likelihood *= likelihoods[i].getLikelihood(value)
			}

			total += likelihood
			if (likelihood > bestLikelihood) {
				bestLikelihood = likelihood
				bestLabel = label
			}
		}

		if (bestLikelihood === 0) {
			total = 0
			for (const [ label, { prior } ] of observations.entries()) {
				total += prior
				if (prior > bestLikelihood) {
					bestLikelihood = prior
					bestLabel = label
				}
			}
		}

		return { value: bestLabel, p: bestLikelihood / total }
	}

	return { train, predict }
}

module.exports = { makeLearner }
