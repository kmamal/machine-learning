
const makeLearner = ({ domain }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		const N = samples.length
		let value = 0
		for (const sample of samples) {
			const label = sample[labelIndex]
			value += label
		}
		value /= N
		return { value }
	}

	const predict = (model, _) => ({ value: model.value, p: null })

	return { train, predict }
}


module.exports = { makeLearner }
