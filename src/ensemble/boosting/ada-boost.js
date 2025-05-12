const { prefixSums } = require('@kmamal/util/array/prefix-sums')
const { chooseFromPrefixSums } = require('@kmamal/util/random/weighted')

const prefixSumsTo = prefixSums.to


const makeLearner = ({ domain, baseLearner, k, fnAggregate }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		const N = samples.length

		const baseModels = new Array(k)
		const modelWeights = new Array(k)

		const sampleWeights = new Array(N).fill(1 / N)
		const sampleSigns = new Array(N)
		const pSums = new Array(N)
		const resampled = Array.from(samples)

		let j = 0
		for (;;) {
			const baseModel = baseLearner.train(resampled)

			let error = 0
			for (let i = 0; i < N; i++) {
				const sample = samples[i]
				const prediction = baseLearner.predict(baseModel, sample).value
				if (prediction === sample[labelIndex]) {
					sampleSigns[i] = -1
				} else {
					error += sampleWeights[i]
					sampleSigns[i] = 1
				}
			}
			// TODO: handle error === 0 || error === 1
			const alpha = Math.log((1 - error) / error) / 2

			baseModels[j] = baseModel
			modelWeights[j] = alpha

			j++
			if (j === k) { break }

			let sumWeights = 0
			for (let i = 0; i < N; i++) {
				sampleWeights[i] *= Math.exp(sampleSigns[i] * alpha)
				sumWeights += sampleWeights[i]
			}
			for (let i = 0; i < N; i++) {
				sampleWeights[i] /= sumWeights
			}
			prefixSumsTo(pSums, sampleWeights)
			for (let i = 0; i < N; i++) {
				const index = chooseFromPrefixSums(pSums)
				resampled[i] = samples[index]
			}
		}
		return { baseModels, modelWeights }
	}

	const predict = (model, sample) => {
		const { baseModels, modelWeights } = model
		const predictions = new Array(k)
		for (let j = 0; j < k; j++) {
			const { value } = baseLearner.predict(baseModels[j], sample)
			predictions[j] = { value, p: modelWeights[j] }
		}
		return fnAggregate(predictions)
	}

	return { train, predict }
}


module.exports = { makeLearner }
