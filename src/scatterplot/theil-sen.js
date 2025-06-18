const OrdinaryLeastSquares = require('./ordinary-least-squares')

const { select } = require('@kmamal/util/array/select')

const _getSlope = (x) => x.slope

const fit = (points) => {
	const N = points.length
	const S = N * (N - 1) / 2

	const candidates = new Array(S)
	let writeIndex = 0

	for (let i = 0; i < N; i++) {
		const [ ax, ay ] = points[i]
		for (let j = 0; j < N; j++) {
			const [ bx, by ] = points[j]
			const slope = (by - ay) / (bx - ax)

			candidates[writeIndex++] = slope
		}
	}

	const slope = select(candidates, Math.floor(S / 2))

	candidates.length = N
	for (let i = 0; i < N; i++) {
		const [ x, y ] = points[i]
		const intercept = y - x * slope
		candidates[i] = intercept
	}

	const intercept = select(candidates, Math.floor(N / 2))

	return { slope, intercept }
}

const predict = OrdinaryLeastSquares.predict

module.exports = { fit, predict }
