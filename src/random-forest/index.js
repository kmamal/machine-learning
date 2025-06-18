const { bootstrap } = require('../cross-validation/bootstrap')
const { create } = require('@kmamal/util/array/create')
const { chooseN } = require('@kmamal/util/random/choose-n')


const makeLearner = ({ domain, makeBaseLearner, k, fnAggregate }) => {
	const usedVariables = domain.map((variable, index) => {
		if (variable === null || variable.isLabel) { return null }
		return { ...variable, index }
	}).filter(Boolean)

	const train = async (samples) => {
		const N = samples.length
		const M = usedVariables.length
		const S = M - Math.max(1, Math.floor(Math.sqrt(M)))
		const trees = new Array(k)
		const indexes = create(M, (i) => usedVariables[i].index)
		const nulledIndexes = new Array(S)
		const bootstrapped = new Array(N)

		for (let j = 0; j < k; j++) {
			bootstrap.to(bootstrapped, samples)

			chooseN.to(nulledIndexes, indexes, S)
			const subDomain = Array.from(domain)
			for (const index of nulledIndexes) { subDomain[index] = null }

			const baseLearner = makeBaseLearner({ domain: subDomain })
			const baseModel = await baseLearner.train(samples)
			trees[j] = { baseLearner, baseModel }
		}

		return { trees }
	}

	const predict = (model, sample) => {
		const { trees } = model
		const predictions = new Array(k)
		for (let j = 0; j < k; j++) {
			const { baseLearner, baseModel } = trees[j]
			predictions[j] = baseLearner.predict(baseModel, sample)
		}
		return fnAggregate(predictions)
	}

	return { train, predict }
}

module.exports = { makeLearner }
