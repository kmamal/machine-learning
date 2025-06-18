const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../cross-validation/holdout')

const makeLearner = ({ domain, baseLearners, makeMetaLearner }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const labelVariable = domain[labelIndex]

	const train = async (samples) => {
		const M = baseLearners.length

		shuffle.$$$(samples)
		const { trainingSamples, testingSamples } = holdout(samples, 7 / 10)

		const baseModels = await Promise.all(baseLearners
			.map(async (baseLearner) => await baseLearner.train(trainingSamples)))

		const metaTrainingSamples = testingSamples.map((sample) => {
			const metaSample = [
				...sample,
				...baseModels
					.map((model, i) => baseLearners[i].predict(model, sample).value),
			]
			return metaSample
		})

		const metaLearner = makeMetaLearner({ domain: [
			...domain,
			...new Array(M).fill({ ...labelVariable, isLabel: false }),
		] })
		const metaModel = await metaLearner.train(metaTrainingSamples)

		return {
			baseModels,
			metaLearner,
			metaModel,
		}
	}

	const predict = (model, sample) => {
		const { baseModels, metaLearner, metaModel } = model
		const metaSample = [
			...sample,
			...baseModels.map((baseModel, i) => {
				const baseLearner = baseLearners[i]
				return baseLearner.predict(baseModel, sample).value
			}),
		]
		return metaLearner.predict(metaModel, metaSample)
	}

	return { train, predict }
}


module.exports = { makeLearner }
