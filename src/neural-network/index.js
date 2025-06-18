const { Scaler } = require('../scaling/robust')
const { softmax } = require('../softmax')

const { Mapper } = require('@kmamal/domains/make-nominals-one-hot')

const { fillWith } = require('@kmamal/util/array/fill-with')
const { uniform } = require('@kmamal/util/random/uniform')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { maxIndex } = require('@kmamal/util/array/max')
const { zip: zipObject } = require('@kmamal/util/object/zip')

const fillWith$$$ = fillWith.$$$

const JS = require('@kmamal/numbers/js')


const makeLearner = ({
	domain: originalDomain,
	layout: _layout,
	activationFunction,
	learningRate,
	k,
}) => {
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
	const labelVariable = domain[labelIndex]
	const isRegression = labelVariable.type !== 'nominal'
	let labelEq
	let outputClasses
	if (!isRegression) {
		labelEq = (labelVariable.Algebra ?? JS).eq
		outputClasses = labelVariable.values
	}

	const variables = domain.map((originalVariable, index) => {
		if (originalVariable === null || originalVariable.isLabel) { return null }

		const { type, Algebra: M = JS, ...variable } = originalVariable
		if (type === 'nominal' && M === JS) { return null }

		variable.index = index
		variable.toNumber = M.toNumber
		return variable
	})

	const usedVariables = variables.filter(Boolean)

	const getActivations = (sample) => usedVariables.map((variable) => {
		const value = sample[variable.index]
		return variable.toNumber(value)
	})

	const train = (originalSamples) => {
		const scaler = new Scaler(originalDomain)
		scaler.fit(originalSamples)

		const samples = needsOneHotEncoding
			? originalSamples.map((sample) => mapper.map(scaler.map(sample)))
			: originalSamples.map((sample) => scaler.map(sample))

		const layout = [ ..._layout, outputClasses?.length ?? 1 ]
		const L = layout.length
		const layers = new Array(L)
		const activations = new Array(L)
		const deltas = new Array(L)

		{
			let lastNum = usedVariables.length
			let numTotal = 0
			for (let i = 0; i < L; i++) {
				const num = layout[i]
				const numWeights = num * (lastNum + 1)
				layers[i] = new Array(numWeights)
				numTotal += numWeights
				activations[i] = new Array(num)
				deltas[i] = new Array(num)
				lastNum = num
			}

			// Initialize
			for (const weights of layers) {
				fillWith$$$(weights, () => uniform() / numTotal)
			}
		}

		const model = { scaler, layers, activations }

		// Train
		const { inverseDerivative } = activationFunction

		for (let i = 0; i < k; i++) {
			shuffle.$$$(samples)
			const r = (k - i) / k * learningRate

			for (const sample of samples) {
				_predict(model, sample)
				const label = sample[labelIndex]

				// Backpropagation
				{
					let layerActivations = activations[L - 1]
					let layerDeltas = deltas[L - 1]
					if (isRegression) {
						const activation = layerActivations[0]
						const expectedActivation = label
						const error = activation - expectedActivation
						layerDeltas[0] = error * activation
					}
					else {
						for (let j = 0; j < layerActivations.length; j++) {
							const expectedActivation = labelEq(outputClasses[j], label) ? 1 : 0
							const activation = layerActivations[j]
							const error = activation - expectedActivation
							layerDeltas[j] = error * inverseDerivative(activation)
						}
					}

					let lastLayerDeltas = layerDeltas
					let lastNum = lastLayerDeltas.length
					for (let l = L - 2; l >= 0; l--) {
						layerActivations = activations[l]
						layerDeltas = deltas[l]
						const num = layerDeltas.length
						const lastLayerWeights = layers[l + 1]
						const M = lastNum
						const N = num + 1

						for (let n = 0; n < N - 1; n++) {
							layerDeltas[n] = 0
							for (let m = 0; m < M; m++) {
								layerDeltas[n] += lastLayerWeights[m * N + n] * lastLayerDeltas[m]
							}
							layerDeltas[n] *= inverseDerivative(layerActivations[n])
						}

						lastLayerDeltas = layerDeltas
						lastNum = num
					}
				}

				// Update weights
				let lastLayerActivations = getActivations(sample)
				for (let l = 0; l < L; l++) {
					const layerDeltas = deltas[l]
					const weights = layers[l]
					const M = layerDeltas.length
					const N = weights.length / M
					for (let m = 0; m < M; m++) {
						const delta = layerDeltas[m]
						let n = 0
						for (; n < N - 1; n++) {
							weights[m * N + n] -= r * delta * lastLayerActivations[n]
						}
						weights[m * N + n] -= r * delta
					}

					lastLayerActivations = activations[l]
				}
			}
		}

		return model
	}

	const _predict = (model, sample) => {
		const { layers, activations } = model
		const L = layers.length
		const { activation } = activationFunction

		let lastLayerActivations = getActivations(sample)
		for (let i = 0; i < L; i++) {
			const weights = layers[i]
			const layerActivations = activations[i]
			const M = layerActivations.length
			const N = lastLayerActivations.length + 1

			for (let m = 0; m < M; m++) {
				let dot = weights[m * N]
				for (let n = 1; n < N - 1; n++) {
					dot += weights[m * N + n] * lastLayerActivations[n]
				}
				layerActivations[m] = isRegression && i === L - 1 ? dot : activation(dot)
			}

			lastLayerActivations = layerActivations
		}

		if (isRegression) {
			return { value: activations.at(-1)[0] }
		}

		const normalizedOutputs = softmax(activations.at(-1))
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

		const result = _predict(model, sample)
		result.value = model.scaler.restoreLabel(result.value)
		return result
	}


	return { train, predict }
}


module.exports = { makeLearner }
