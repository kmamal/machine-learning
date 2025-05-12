const Counts = require('@kmamal/counts/map')
const { prefixSums } = require('@kmamal/util/array/prefix-sums')
const { chooseFromPrefixSums } = require('@kmamal/util/random/weighted')


const makeLearner = ({ domain }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		const N = samples.length
		const counts = new Map()
		for (const sample of samples) {
			const label = sample[labelIndex]
			Counts.inc(counts, label)
		}
		const labels = [ ...counts.entries() ].map((x) => ({
			value: x[0],
			p: x[1] / N,
		}))
		const pSums = prefixSums([ ...counts.values() ])
		return { labels, pSums }
	}

	const predict = (model, _) => {
		const { labels, pSums } = model
		const index = chooseFromPrefixSums(pSums)
		return labels[index]
	}

	return { train, predict }
}


module.exports = { makeLearner }
