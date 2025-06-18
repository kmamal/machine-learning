
const aggregate = (results) => {
	let sum = 0
	let totalWeight = 0
	for (const { label, dist } of results) {
		const weight = 1 / (dist + 1)
		sum += label * weight
		totalWeight += weight
	}
	return { value: sum / totalWeight, p: null }
}

module.exports = { aggregate }
