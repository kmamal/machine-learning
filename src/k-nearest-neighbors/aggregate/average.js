const { sumBy } = require('@kmamal/util/array/sum')

const getLabel = (x) => x.label

const aggregate = (results) => {
	const sum = sumBy(results, getLabel)
	return { value: sum / results.length, p: null }
}

module.exports = { aggregate }
