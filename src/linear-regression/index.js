const JS = require('@kmamal/numbers/js')
const Mat = require('@kmamal/linear-algebra/matrix').defineFor(JS)
const { leastSquares } = require('@kmamal/linear-algebra/matrix/least-squares').defineFor(Mat)
const { ridge } = require('@kmamal/linear-algebra/matrix/ridge').defineFor(Mat)

const { Mapper } = require('@kmamal/domains/make-nominals-one-hot')
const { Scaler } = require('../scaling/robust')

const makeLearner = (params) => {
	const { domain: originalDomain, degree = 1, ridgeNormalizationStrength = 0 } = params
	const needsOneHotEncoding = originalDomain.some((variable) => variable?.type === 'nominal')
	let domain
	let mapper
	if (needsOneHotEncoding) {
		mapper = new Mapper(originalDomain)
		domain = mapper.mappedDomain()
	}
	else {
		domain = originalDomain
	}

	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const variableIndexes = domain
		.map((variable, i) => {
			if (variable === null) { return null }
			if (variable.type === 'nominal') { return null }
			if (i === labelIndex) { return null }
			return i
		})
		.filter((x) => x !== null)
	const K = variableIndexes.length
	const M = K * degree + 1

	const train = (originalSamples) => {
		const scaler = new Scaler(originalDomain)
		scaler.fit(originalSamples)

		const samples = needsOneHotEncoding
			? originalSamples.map((sample) => mapper.map(scaler.map(sample)))
			: originalSamples.map((sample) => scaler.map(sample))
		const N = samples.length

		const a = new Array(N * M)
		const b = new Array(N)

		for (let i = 0; i < N; i++) {
			const sample = samples[i]
			const label = sample[labelIndex]

			for (let k = 0; k < K; k++) {
				const index = variableIndexes[k]
				const x = sample[index]
				let value = 1
				for (let d = 0; d < degree; d++) {
					value *= x
					a[i * M + k * degree + d] = value
				}
			}
			a[i * M + K * degree] = 1
			b[i] = label
		}

		const weights = ridgeNormalizationStrength !== 0
			? ridge(a, N, M, b, ridgeNormalizationStrength)
			: leastSquares(a, N, M, b)
		const intercept = weights.pop()

		return { scaler, weights, intercept }
	}

	const predict = (model, originalSample) => {
		const { scaler, weights, intercept } = model
		const sample = needsOneHotEncoding
			? mapper.map(scaler.map(originalSample))
			: scaler.map(originalSample)

		let dot = intercept
		for (let k = 0; k < K; k++) {
			const index = variableIndexes[k]
			const x = sample[index]
			let value = 1
			for (let d = 0; d < degree; d++) {
				value *= x
				dot += value * weights[k * degree + d]
			}
		}

		return { value: scaler.restoreLabel(dot), p: null }
	}

	return { train, predict, params }
}

module.exports = { makeLearner }
