
const _heavyside = (x) => x < 0 ? 0 : 1

const activation = (x) => Math.max(0, x)
const derivative = _heavyside
const inverseDerivative = _heavyside

module.exports = {
	activation,
	derivative,
	inverseDerivative,
}
