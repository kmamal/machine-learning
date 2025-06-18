const { Scaler } = require('../scaling/robust')

const { Mapper } = require('@kmamal/domains/make-nominals-one-hot')

const AutoOptimization = require('@kmamal/optimization/auto')
const { multipleStarts } = require('@kmamal/optimization/multiple-starts')

const { maxIndex } = require('@kmamal/util/array/max')
const { zip: zipObject } = require('@kmamal/util/object/zip')
const { softmax } = require('../softmax')


const makeLearner = ({ domain: originalDomain, ridgeNormalizationStrength = 0 }) => {
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
	const outputClasses = domain[labelIndex]?.values
	const K = outputClasses.length - 1

	const variableIndexes = domain
		.map((variable, index) => variable && !variable.isLabel ? index : null)
		.filter((x) => x !== null)
	const M = variableIndexes.length


	const train = async (originalSamples) => {
		const scaler = new Scaler(originalDomain)
		scaler.fit(originalSamples)

		const samples = needsOneHotEncoding
			? originalSamples.map((sample) => mapper.map(scaler.map(sample)))
			: originalSamples.map((sample) => scaler.map(sample))

		const N = samples.length

		const problem = {
			func: (allWeights) => {
				const model = {
					weights: allWeights.slice(-K),
					intercepts: allWeights.slice(0, -K),
				}

				let logLoss = 0
				for (let i = 0; i < N; i++) {
					const sample = samples[i]
					const { allP } = _predict(model, sample)
					const label = sample[labelIndex]
					const p = allP[label]
					logLoss -= Math.log(p)
				}

				if (ridgeNormalizationStrength !== 0) {
					const ridge = N * allWeights.reduce((sum, weight) => sum + weight * weight, 0)
					logLoss += ridgeNormalizationStrength * ridge
				}

				return logLoss
			},
			domain: new Array(K * (M + 1)).fill({ type: 'real', from: -100, to: 100 }),
		}

		const result = await AutoOptimization.search({
			problem,
			limitReals: AutoOptimization.stopWhenRealsConvergeTo(0.01),
		})

		const allWeights = result.solution
		return {
			scaler,
			weights: allWeights.slice(-K),
			intercepts: allWeights.slice(0, -K),
		}
	}

	const _predict = (model, sample) => {
		const { weights, intercepts } = model
		const dots = [ ...intercepts, 0 ]
		for (let i = 0; i < K; i++) {
			for (let j = 0; j < M; j++) {
				const index = variableIndexes[j]
				const value = sample[index]
				dots[i] += weights[i * M + j] * value
			}
		}
		const normalizedOutputs = softmax(dots)
		const index = maxIndex(normalizedOutputs)
		const value = outputClasses[index]
		const p = normalizedOutputs[index]
		const allP = zipObject(outputClasses, normalizedOutputs)
		return { value, p, allP }
	}

	const predict = (model, originalSample) => {
		const { scaler } = model
		const sample = needsOneHotEncoding
			? mapper.map(scaler.map(originalSample))
			: scaler.map(originalSample)

		return _predict(model, sample)
	}

	return { train, predict }
}

module.exports = { makeLearner }
