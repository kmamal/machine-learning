const { sumBy } = require('@kmamal/util/array/sum')

const getValue = (x) => x.value

const aggregate = (results) => {
	const sum = sumBy(results, getValue)
	return { value: sum / results.length, p: null }
}

module.exports = { aggregate }
