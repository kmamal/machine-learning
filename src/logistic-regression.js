
const logisticFunction = (x, m, s) => 1 / (1 + Math.exp(-(x - m) / s))

const makeLearner = () => {
	const train = (samples) => {
		const [ m, s ] = optimize({
			func: (m, s) => {
				let prod = 1
				for (let i = 0; i < samples.length; i++) {
					const sample = samples[i]
					prod *= logisticFunction(sample[j], m, s)
				}
			},
		})
		return { m, s }
	}

	const predict = (model, sample) => {
		const { m, s } = model
		const p = logisticFunction(sample[j], m, s)
		return { value, p }
	}

	return { train, predict }
}

module.exports = { makeLearner }
