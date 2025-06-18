const { bootstrap } = require('../cross-validation/bootstrap')


const makeLearner = ({ baseLearner, k, fnAggregate }) => {
	const train = async (samples) => {
		const baseModels = new Array(k)
		const bootstrapped = new Array(samples.length)
		for (let j = 0; j < k; j++) {
			bootstrap.to(bootstrapped, samples)
			baseModels[j] = await baseLearner.train(bootstrapped)
		}

		return { baseModels }
	}

	const predict = (model, sample) => {
		const { baseModels } = model
		const predictions = baseModels
			.map((m) => baseLearner.predict(m, sample))
		return fnAggregate(predictions)
	}

	return { train, predict }
}


module.exports = { makeLearner }
