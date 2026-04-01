const { HyperplaneTree } = require('@kmamal/hyperplane-tree/for-points')


const makeLearner = (params) => {
	const { domain, k, maxBinSize, fnAggregate } = params
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		throw new Error("needs to take into account the domain")

		const tree = HyperplaneTree.fromPoints(samples, maxBinSize)
		return { tree }
	}

	const predict = (model, sample) => {
		const { tree } = model
		const results = tree.kNearestNeighbors(sample, k)
		return fnAggregate(results)
	}

	return { train, predict, params }
}


module.exports = { makeLearner }
