
const makeLearner = ({ domain }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const train = (samples) => {
		const M = samples.length
		const N = samples[0].length + 1

		const a = new Array(N * N).fill(0)
		const b = new Array(N).fill(0)

		for (let m = 0; m < M; m++) {
			const sample = samples[m]
			const label = sample[labelIndex]

			let i = 0
			for (; i < N - 1; i++) {
				const x = sample[i]
				a[i * N + i] += x * x

				for (let j = 0; j < i; j++) {
					a[i * N + j] += x * sample[j]
				}

				b[i] += label * x
			}

			a[i * N + i] += 1
			for (let j = 0; j < i; j++) {
				a[i * N + j] += sample[j]
			}
			b[i] += label
		}

		for (let i = 1; i < N; i++) {
			for (let j = 0; j < i; j++) {
				a[j * N + i] = a[i * N + j]
			}
		}

		const weights = Mat.solve(a, b)
		const bias = weights.pop()

		return { weights, bias }
	}

	const predict = (model, sample) => {
		const { weights, bias } = model

		let dot = bias
		for (let i = 0; i < sample.length; i++) {
			dot += sample[i] * weights[i]
		}

		return { value: dot, p: 1 }
	}

	return { train, predict }
}

const makeSample = (arr, label) => {
	arr.label = label
	return arr
}
const { train } = makeLearner({ domain: [
	{ type: 'real' },
	{ type: 'real' },
	{ type: 'real', isLabel: true },
] })
train([
	makeSample([ 0, 1, 0.4 ]),
	makeSample([ 1, 0, 0.5 ]),
	makeSample([ 1, 1, 0.6 ]),
])

module.exports = { makeLearner }
