const { fillWith } = require('@kmamal/util/array/fill-with')
const { uniform } = require('@kmamal/util/random/uniform')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { softmax } = require('./softmax')

const JS = require('@kmamal/numbers/js')

const fillWith$$$ = fillWith.$$$


const makeLearner = ({
	domain,
	layout: _layout,
	activationFunction,
	learningRate,
	k,
}) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const labelVariable = domain[labelIndex]
	const labelEq = (labelVariable.Algebra ?? JS).eq
	const outputClasses = labelVariable.values

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

	const train = (samples) => {
		const layout = [ ..._layout, outputClasses.length ]
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

		const model = { layers, activations }

		// Train
		const { inverseDerivative } = activationFunction

		for (let i = 0; i < k; i++) {
			shuffle.$$$(samples)
			const r = (k - i) / k * learningRate

			for (const sample of samples) {
				predict(model, sample)
				const label = sample[labelIndex]

				// Backpropagation
				{
					let layerActivations = activations[L - 1]
					let layerDeltas = deltas[L - 1]
					for (let j = 0; j < layerActivations.length; j++) {
						const expectedActivation = labelEq(outputClasses[j], label) ? 1 : 0
						const activation = layerActivations[j]
						const error = activation - expectedActivation
						layerDeltas[j] = error * inverseDerivative(activation)
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

	const predict = (model, sample) => {
		const { layers, activations } = model

		let lastLayerActivations = getActivations(sample)
		for (let i = 0; i < layers.length; i++) {
			const weights = layers[i]
			const layerActivations = activations[i]
			const M = layerActivations.length
			const N = lastLayerActivations.length + 1

			for (let m = 0; m < M; m++) {
				let sum = 0
				let n = 0
				for (; n < N - 1; n++) {
					sum += weights[m * N + n] * lastLayerActivations[n]
				}
				layerActivations[m] = activationFunction(sum + weights[m * N + n])
			}

			lastLayerActivations = layerActivations
		}

		const { p, index } = softmax(activations.at(-1))
		const value = outputClasses[index]
		return { value, p }
	}

	return { train, predict }
}


module.exports = { makeLearner }
