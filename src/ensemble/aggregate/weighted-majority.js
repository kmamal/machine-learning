const Counts = require('@kmamal/counts/map')

const aggregate = (predictions) => {
	const counts = new Map()
	for (const { value, p } of predictions) {
		Counts.add(counts, value, p)
	}
	const value = Counts.mostFrequent(counts)
	return { value, p: null }
}

module.exports = { aggregate }
