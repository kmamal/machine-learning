const Counts = require('@kmamal/counts/map')


const makeLearner = (params) => {
	const { domain } = params
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		const counts = new Map()
		for (const sample of samples) {
			const label = sample[labelIndex]
			Counts.inc(counts, label)
		}
		const value = Counts.mostFrequent(counts)
		const p = counts.get(value) / samples.length
		return { value, p }
	}

	const predict = (model, _) => model

	return { train, predict, params }
}


module.exports = { makeLearner }
