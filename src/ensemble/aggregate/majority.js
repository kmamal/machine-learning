const Counts = require('@kmamal/counts/map')

const aggregate = (predictions) => {
	const counts = new Map()
	for (const { value } of predictions) {
		Counts.inc(counts, value)
	}
	const value = Counts.mostFrequent(counts)
	return { value, p: null }
}

module.exports = { aggregate }
