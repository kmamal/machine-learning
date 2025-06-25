const Num = require('@kmamal/numbers/js')
const Mat = require('@kmamal/linear-algebra/matrix').defineFor(Num)
const { weightedLeastSquares } = require('@kmamal/linear-algebra/matrix/weighted-least-squares').defineFor(Mat)

const { median } = require('@kmamal/statistics/summary')

const { clone } = require('@kmamal/util/object/clone')

const _calcCubeWeight = (x) => (1 - Math.abs(x) ** 3) ** 3
const _calcSquareWeight = (x) => (1 - x ** 2) ** 2

const fit = (unsortedPoints, options = {}) => {
	const points = clone(unsortedPoints).sort((a, b) => a[0] - b[0])
	const N = points.length

	const {
		degree = 2,
		windowSize: _windowSize = Math.ceil(N / 3),
		robustnessIterations = 3,
	} = options

	const numCoefficients = degree + 1
	const windowSize = Math.max(numCoefficients * 3, _windowSize)
	if (windowSize > N) { return null }

	let robustnessWeights = null

	const _tmp = {
		matrix: new Array(windowSize * numCoefficients),
		vector: new Array(windowSize),
		weights: new Array(windowSize),
	}

	const model = {
		points,
		windowSize,
		numCoefficients,
		robustnessWeights,
		_tmp,
	}

	if (robustnessIterations > 0) {
		model.robustnessWeights = robustnessWeights = new Array(N).fill(1)

		const absoluteDeviations = new Array(N)

		for (let r = 0; r < robustnessIterations; r++) {
			for (let i = 0; i < N; i++) {
				const [ x, y ] = points[i]
				const smoothedValue = predict(model, x)
				absoluteDeviations[i] = Math.abs(y - smoothedValue)
			}

			const mad = median(absoluteDeviations)
			if (mad === 0) { break }

			const threshold = 6 * mad
			let areAllZero = true
			let areAllSame = true
			for (let i = 0; i < N; i++) {
				const deviation = absoluteDeviations[i]
				if (deviation < threshold) {
					const newWeight = _calcSquareWeight(deviation / threshold)
					if (newWeight !== robustnessWeights[i]) {
						robustnessWeights[i] = newWeight
						areAllSame = false
					}
					if (newWeight !== 0) { areAllZero = false }
				}
				else {
					robustnessWeights[i] = 0
				}
			}

			if (areAllZero) {
				robustnessWeights.fill(1)
				break
			}

			if (areAllSame) { break }
		}
	}

	return model
}

const predict = (model, x) => {
	const { points, windowSize, numCoefficients, robustnessWeights, _tmp } = model
	const { matrix, vector, weights } = _tmp
	const N = points.length

	const _initialIndex = points.findIndex(([ pointX, _ ]) => pointX > x)
	const initialIndex = _initialIndex !== -1 ? _initialIndex : N

	let actualWindowSize = 0
	let numDuplicateX = 0
	let windowStart = initialIndex - 1
	let windowEnd = initialIndex
	let startDx = null
	let endDx = null

	if (windowStart > -1 && windowEnd < N) {
		let prevDx = x - points[windowStart][0]
		let nextDx = points[windowEnd][0] - x

		for (;;) {
			if (prevDx < nextDx) {
				prevDx = x - points[windowStart][0]
				if (robustnessWeights?.[windowStart] !== 0) {
					if (prevDx === startDx) { numDuplicateX++ }
					else { startDx = prevDx }
					if (++actualWindowSize === windowSize) {
						--windowStart
						break
					}
				}
				if (--windowStart === -1) { break }
			}
			else {
				nextDx = points[windowEnd][0] - x
				if (robustnessWeights?.[windowEnd] !== 0) {
					if (nextDx === endDx) { numDuplicateX++ }
					else { endDx = nextDx }
					if (++actualWindowSize === windowSize) {
						++windowEnd
						break
					}
				}
				if (++windowEnd === N) { break }
			}
		}
	}

	if (actualWindowSize < windowSize) {
		if (windowStart > -1) {
			do {
				const prevDx = x - points[windowStart][0]
				if (robustnessWeights?.[windowStart] !== 0) {
					if (prevDx === startDx) { numDuplicateX++ }
					else { startDx = prevDx }
					if (++actualWindowSize === windowSize) {
						--windowStart
						break
					}
				}
			} while (--windowStart > -1)
		}
		else if (windowEnd < N) {
			do {
				const nextDx = points[windowEnd][0] - x
				if (robustnessWeights?.[windowEnd] !== 0) {
					if (nextDx === endDx) { numDuplicateX++ }
					else { endDx = nextDx }
					if (++actualWindowSize === windowSize) {
						++windowEnd
						break
					}
				}
			} while (++windowEnd < N)
		}
	}

	if (windowStart > -1) {
		const startX = points[windowStart + 1][0]
		do {
			const prevX = points[windowStart][0]
			if (prevX !== startX) { break }
			if (robustnessWeights?.[windowStart] !== 0) {
				numDuplicateX++
				actualWindowSize++
			}
		} while (--windowStart > -1)
	}

	if (windowEnd < N) {
		const endX = points[windowEnd - 1][0]
		do {
			const nextX = points[windowEnd][0]
			if (nextX !== endX) { break }
			if (robustnessWeights?.[windowEnd] !== 0) {
				numDuplicateX++
				actualWindowSize++
			}
		} while (++windowEnd < N)
	}

	windowStart++

	const windowWidth = Math.max(startDx, endDx) * 1.05

	if (windowWidth === 0) {
		let weightedSum = 0
		let totalWeight = 0
		for (let i = windowStart; i < windowEnd; i++) {
			let robustnessWeight
			if (robustnessWeights !== null) {
				robustnessWeight = robustnessWeights[i]
				if (robustnessWeight === 0) { continue }
			}
			else { robustnessWeight = 1 }

			weightedSum += points[i][1] * robustnessWeight
			totalWeight += robustnessWeight
		}
		return weightedSum / totalWeight
	}

	if (actualWindowSize - numDuplicateX < numCoefficients) {
		let weightedSum = 0
		let totalWeight = 0
		for (let i = windowStart; i < windowEnd; i++) {
			let robustnessWeight
			if (robustnessWeights !== null) {
				robustnessWeight = robustnessWeights[i]
				if (robustnessWeight === 0) { continue }
			}
			else { robustnessWeight = 1 }

			const point = points[i]
			const dx = point[0] - x
			const weight = _calcCubeWeight(dx / windowWidth) * robustnessWeight
			weightedSum += point[1] * weight
			totalWeight += weight
		}
		return weightedSum / totalWeight
	}

	matrix.length = actualWindowSize * numCoefficients
	vector.length = actualWindowSize
	weights.length = actualWindowSize

	let matrixIndex = 0
	for (let i = windowStart; i < windowEnd; i++) {
		let robustnessWeight
		if (robustnessWeights !== null) {
			robustnessWeight = robustnessWeights[i]
			if (robustnessWeight === 0) { continue }
		}
		else { robustnessWeight = 1 }

		const point = points[i]
		const dx = point[0] - x
		const y = point[1]

		const m = matrixIndex++

		weights[m] = _calcCubeWeight(dx / windowWidth) * robustnessWeight

		let xPow = dx
		matrix[m * numCoefficients] = 1
		matrix[m * numCoefficients + 1] = xPow
		for (let n = 2; n < numCoefficients; n++) {
			xPow *= dx
			matrix[m * numCoefficients + n] = xPow
		}

		vector[m] = y
	}

	const [ intercept ] = weightedLeastSquares(matrix, actualWindowSize, numCoefficients, vector, weights)
	return intercept
}

module.exports = { fit, predict }
