const { Scaler } = require('../scaling/linear')

const { minNBy } = require('@kmamal/util/array/min-n')

const JS = require('@kmamal/numbers/js')


const makeLearner = ({ domain, k, fnAggregate }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const variables = domain.map((variable) => variable === null || variable.isLabel ? null : variable)

	const calcDot = (a, b) => {
		let dot = 0
		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i]
			if (variable === null) { continue }
			const { mul } = variable.Algebra ?? JS
			dot += mul(a[i], b[i])
		}
		return dot
	}

	const calcNorm = (sample) => Math.sqrt(calcDot(sample, sample))

	const calcCosineDistance = (a, aNorm, b, bNorm) => 1 - calcDot(a, b) / (aNorm * bNorm)

	const train = (unscaledSamples) => {
		const scaler = new Scaler(domain)
		scaler.fit(unscaledSamples)
		const samples = unscaledSamples.map((sample) => scaler.map(sample))

		const indexedNorms = samples.map((x, i) => ({ index: i, norm: calcNorm(x) }))

		return { scaler, samples, indexedNorms }
	}

	const predict = (model, unscaledSample) => {
		const { scaler, samples, indexedNorms } = model
		const sample = scaler.map(unscaledSample)
		const sampleNorm = calcNorm(sample)
		const nearest = minNBy(indexedNorms, k, ({ index, norm }) => calcCosineDistance(sample, sampleNorm, samples[index], norm))
		return fnAggregate(nearest.map(({ index, norm }) => {
			const neighbor = samples[index]
			const unscaledNeighbor = scaler.restore(neighbor)
			return {
				point: unscaledNeighbor,
				label: unscaledNeighbor[labelIndex],
				dist: calcCosineDistance(sample, sampleNorm, neighbor, norm),
			}
		}))
	}

	return { train, predict }
}


module.exports = { makeLearner }
