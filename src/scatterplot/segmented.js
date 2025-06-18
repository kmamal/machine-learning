const OrdinaryLeastSquares = require('./ordinary-least-squares')

const fit = (points) => {
	const N = points.length

	if (N < 6) { return null }

	let bestModel
	let bestMse = Infinity

	for (let i = 2; i < N - 3; i++) {
		const a = points[i]
		const b = points[i + 1]
		const breakpoint = (a[0] + b[0]) / 2

		const line1 = OrdinaryLeastSquares.fit(points.slice(0, i))
		const line2 = OrdinaryLeastSquares.fit(points.slice(i))

		const model = {
			breakpoint,
			line1,
			line2,
		}

		let mse = 0
		for (const [ x, y ] of points) {
			const predicted = predict(model, x)
			const error = y - predicted
			mse += error ** 2
		}

		if (mse < bestMse) {
			bestMse = mse
			bestModel = model
		}
	}

	return bestModel
}

const predict = (model, x) => {
	const { breakpoint, line1, line2 } = model
	return x < breakpoint
		? OrdinaryLeastSquares.predict(line1, x)
		: OrdinaryLeastSquares.predict(line2, x)
}

module.exports = { fit, predict }
