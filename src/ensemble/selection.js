const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../cross-validation/holdout')
const { Evaluation } = require('../evaluation')

const makeLearner = ({ domain, baseLearners, k }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		let bestLearner
		let bestScore = -Infinity

		for (const baseLearner of baseLearners) {
			let score = 0

			for (let i = 0; i < k; i++) {
				shuffle.$$$(samples)
				const { trainingSamples, testingSamples } = holdout(samples, 7 / 10)

				const baseModel = baseLearner.train(trainingSamples)

				const evaluation = new Evaluation()
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
			baseModel: bestLearner.train(samples),
		}
	}

	const predict = (model, sample) => {
		const { baseModel, baseLearner } = model
		return baseLearner.predict(baseModel, sample)
	}

	return { train, predict }
}


module.exports = { makeLearner }
