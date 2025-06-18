const { maxIndex } = require('@kmamal/util/array/max')

const softmax$$$ = (values) => {
	const N = values.length
	let sum = 0
	for (let i = 0; i < N; i++) {
		values[i] = Math.exp(values[i])
		sum += values[i]
	}

	const index = maxIndex(values)

	greenPath: {
		if (sum === 0 || !Number.isFinite(sum)) { break greenPath }

		for (let i = 0; i < N; i++) {
			values[i] /= sum
			if (values[i] === 1) { break greenPath }
		}

		return values
	}

	values.fill(Number.EPSILON)
	values[index] = 1 - (N - 1) * Number.EPSILON
	return values
}

const softmax = (values) => softmax$$$(Array.from(values))

softmax.$$$ = softmax$$$

module.exports = { softmax }
