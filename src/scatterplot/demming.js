
const fit = (points, options = {}) => {
	const N = points.length

	const {
		delta = 1,
	} = options

	let avgX = 0
	let avgY = 0
	for (const [ x, y ] of points) {
		avgX += x
		avgY += y
	}
	avgX /= N
	avgY /= N

	let sxx = 0
	let syy = 0
	let sxy = 0
	for (const [ x, y ] of points) {
		const dx = x - avgX
		const dy = y - avgY
		sxx += dx * dx
		syy += dy * dy
		sxy += dx * dy
	}
	const t = syy - delta * sxx
	const discriminant = t * t + 4 * delta * sxy * sxy

	const slope = (t + Math.sqrt(discriminant)) / (2 * sxy)
	const intercept = avgY - slope * avgX
	return { slope, intercept }
}

const predict = (model, x) => {
	const { slope, intercept } = model
	return	slope * x + intercept
}

module.exports = { fit, predict }
