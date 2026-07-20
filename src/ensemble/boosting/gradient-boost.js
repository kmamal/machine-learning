const { softmax } = require('../../softmax')
const { maxIndex } = require('@kmamal/util/array/max')
const { zip: zipObject } = require('@kmamal/util/object/zip')


const makeLearner = (params) => {
	const { domain, makeBaseLearner, k, learningRate = 0.1 } = params
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const labelVariable = domain[labelIndex]
	const isClassification = labelVariable.type === 'nominal'
	const classes = isClassification ? labelVariable.values : null
	const K = isClassification ? classes.length : null

	// Base learners always fit real-valued gradients.
	const regressionDomain = domain.map((variable, index) =>
		index === labelIndex ? { type: 'real', isLabel: true } : variable)


	const _trainRegression = async (samples) => {
		const N = samples.length

		let initial = 0
		for (let i = 0; i < N; i++) {
			initial += samples[i][labelIndex]
		}
		initial /= N

		const baseLearner = makeBaseLearner({ domain: regressionDomain })
		const baseModels = new Array(k)

		const residuals = samples.map((sample) => Array.from(sample))
		const predictions = new Array(N).fill(initial)

		for (let j = 0; j < k; j++) {
			for (let i = 0; i < N; i++) {
				residuals[i][labelIndex] = samples[i][labelIndex] - predictions[i]
			}

			// Decision trees reorder the inputs, so pass a copy of the residuals.
			const baseModel = await baseLearner.train(Array.from(residuals))
			baseModels[j] = baseModel

			for (let i = 0; i < N; i++) {
				const { value } = baseLearner.predict(baseModel, samples[i])
				predictions[i] += learningRate * value
			}
		}

		return { baseLearner, initial, baseModels }
	}

	const _trainClassification = async (samples) => {
		const N = samples.length

		const labelClassIndexes = new Array(N)
		const counts = new Array(K).fill(0)
		for (let i = 0; i < N; i++) {
			const classIndex = classes.indexOf(samples[i][labelIndex])
			labelClassIndexes[i] = classIndex
			counts[classIndex]++
		}

		const initial = counts.map((count) => Math.log((count || Number.EPSILON) / N))

		const baseLearners = new Array(K)
		const baseModels = new Array(K)
		const residuals = new Array(K)
		for (let c = 0; c < K; c++) {
			baseLearners[c] = makeBaseLearner({ domain: regressionDomain })
			baseModels[c] = new Array(k)
			residuals[c] = samples.map((sample) => Array.from(sample))
		}

		const scores = samples.map(() => Array.from(initial))

		for (let j = 0; j < k; j++) {
			for (let i = 0; i < N; i++) {
				const p = softmax(scores[i])
				const labelClassIndex = labelClassIndexes[i]
				for (let c = 0; c < K; c++) {
					const y = c === labelClassIndex ? 1 : 0
					residuals[c][i][labelIndex] = y - p[c]
				}
			}

			for (let c = 0; c < K; c++) {
				const baseLearner = baseLearners[c]

				// Decision trees reorder the inputs, so pass a copy of the residuals.
				const baseModel = await baseLearner.train(Array.from(residuals[c]))
				baseModels[c][j] = baseModel

				for (let i = 0; i < N; i++) {
					const { value } = baseLearner.predict(baseModel, samples[i])
					scores[i][c] += learningRate * value
				}
			}
		}

		return { baseLearners, initial, baseModels }
	}


	const _predictRegression = (model, sample) => {
		const { baseLearner, initial, baseModels } = model
		let value = initial
		for (let j = 0; j < k; j++) {
			value += learningRate * baseLearner.predict(baseModels[j], sample).value
		}
		return { value, p: null }
	}

	const _predictClassification = (model, sample) => {
		const { baseLearners, initial, baseModels } = model
		const scores = Array.from(initial)
		for (let c = 0; c < K; c++) {
			const baseLearner = baseLearners[c]
			for (let j = 0; j < k; j++) {
				scores[c] += learningRate * baseLearner.predict(baseModels[c][j], sample).value
			}
		}
		const p = softmax.$$$(scores)
		const index = maxIndex(p)
		const value = classes[index]
		const allP = zipObject(classes, p)
		return { value, p: p[index], allP }
	}


	const train = isClassification ? _trainClassification : _trainRegression
	const predict = isClassification ? _predictClassification : _predictRegression

	return { train, predict, params }
}


module.exports = { makeLearner }
