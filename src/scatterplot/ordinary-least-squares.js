
const fit = (points) => {
	const N = points.length

	let avgX = 0
	let avgY = 0
	for (const [ x, y ] of points) {
		avgX += x
		avgY += y
	}
	avgX /= N
	avgY /= N

	let sxy = 0
	let sxx = 0
	for (const [ x, y ] of points) {
		const dx = x - avgX
		const dy = y - avgY
		sxy += dx * dy
		sxx += dx * dx
	}
	const slope = sxy / sxx
	const intercept = avgY - slope * avgX
	return { slope, intercept }
}

const predict = (model, x) => {
	const { slope, intercept } = model
	return	slope * x + intercept
}

module.exports = { fit, predict }
