const { bootstrap } = require('../cross-validation/bootstrap')


const makeLearner = (params) => {
	const { baseLearner, k, fnAggregate } = params
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

	return { train, predict, params }
}


module.exports = { makeLearner }
