const { kFold } = require('../cross-validation/k-fold')

const makeLearner = ({ domain, baseLearners, k, makeMetaLearner }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const labelVariable = domain[labelIndex]

	const train = (samples) => {
		const M = baseLearners.length
		const baseModels = new Array(M)

		const predictions = samples.map((sample) => {
			const metaSample = new Array(M + 1)
			metaSample[M] = sample[labelIndex]
			return metaSample
		})

		for (let i = 0; i < M; i++) {
			const baseLearner = baseLearners[i]
			let writeIndex = 0
			for (const { trainingSamples, testingSamples } of kFold(samples, k)) {
				const partialModel = baseLearner.train(trainingSamples)

				for (const sample of testingSamples) {
					const prediction = baseLearner.predict(partialModel, sample).value
					predictions[writeIndex++][i] = prediction
				}
			}

			baseModels[i] = baseLearner.train(samples)
		}

		const metaLearner = makeMetaLearner({ domain: [
			...new Array(M).fill({ ...labelVariable, isLabel: false }),
			labelVariable,
		] })
		const metaModel = metaLearner.train(predictions)

		return {
			baseModels,
			metaLearner,
			metaModel,
		}
	}

	const predict = (model, sample) => {
		const { baseModels, metaLearner, metaModel } = model
		const predictions = baseModels.map((baseModel, i) => {
			const baseLearner = baseLearners[i]
			return baseLearner.predict(baseModel, sample).value
		})
		return metaLearner.predict(metaModel, predictions)
	}

	return { train, predict }
}


module.exports = { makeLearner }
