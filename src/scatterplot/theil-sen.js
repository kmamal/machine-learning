const OrdinaryLeastSquares = require('./ordinary-least-squares')

const { median } = require('@kmamal/statistics/summary')

const fit = (points) => {
	const N = points.length
	const S = N * (N - 1) / 2

	const candidates = new Array(S)
	let writeIndex = 0

	for (let i = 0; i < N; i++) {
		const [ ax, ay ] = points[i]
		for (let j = 0; j < i; j++) {
			const [ bx, by ] = points[j]
			const slope = (by - ay) / (bx - ax)

			candidates[writeIndex++] = slope
		}
	}

	const slope = median(candidates)
	console.log({ candidates, slope })

	for (let i = 0; i < N; i++) {
		const [ x, y ] = points[i]
		const intercept = y - x * slope
		candidates[i] = intercept
	}
	candidates.length = N

	const intercept = median(candidates)
	console.log({ candidates, intercept })

	return { slope, intercept }
}

const predict = OrdinaryLeastSquares.predict

module.exports = { fit, predict }
