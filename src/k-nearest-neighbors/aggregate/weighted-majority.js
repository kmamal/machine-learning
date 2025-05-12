const Counts = require('@kmamal/counts/map')

const aggregate = (results) => {
	const counts = new Map()
	for (const { label, dist } of results) {
		Counts.add(counts, label, 1 / dist)
	}
	const value = Counts.mostFrequent(counts)
	const count = counts.get(value)
	return { value, p: count / results.length }
}

module.exports = { aggregate }
