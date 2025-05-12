
const aggregate = (results) => {
	let sum = 0
	let totalWeight = 0
	for (const { label, dist } of results) {
		sum += label
		totalWeight += 1 / dist
	}
	return { value: sum / totalWeight, p: null }
}

module.exports = { aggregate }
