
const aggregate = (results) => {
	let sumValues = 0
	let sumWeights = 0
	for (let i = 0; i < results.length; i++) {
		const { value, p } = results[i]
		sumValues += value
		sumWeights += p
	}
	return { value: sumValues / sumWeights, p: null }
}

module.exports = { aggregate }
