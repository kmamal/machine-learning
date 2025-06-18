const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../cross-validation/holdout')
const { EvaluationForClassification } = require('../evaluation-for-classification')

const makeLearner = ({ domain, baseLearners, k }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = async (samples) => {
		let bestLearner
		let bestScore = -Infinity

		for (const baseLearner of baseLearners) {
			let score = 0

			for (let i = 0; i < k; i++) {
				shuffle.$$$(samples)
				const { trainingSamples, testingSamples } = holdout(samples, 7 / 10)

				const baseModel = await baseLearner.train(trainingSamples)

				const evaluation = new EvaluationForClassification()
				for (const sample of testingSamples) {
					const predicted = baseLearner.predict(baseModel, sample).value
					evaluation.addResult(sample[labelIndex], predicted)
				}

				score += evaluation.lift()
			}

			if (score > bestScore) {
				bestScore = score
				bestLearner = baseLearner
			}
		}

		return {
			baseLearner: bestLearner,
			baseModel: await bestLearner.train(samples),
		}
	}

	const predict = (model, sample) => {
		const { baseModel, baseLearner } = model
		return baseLearner.predict(baseModel, sample)
	}

	return { train, predict }
}


module.exports = { makeLearner }
