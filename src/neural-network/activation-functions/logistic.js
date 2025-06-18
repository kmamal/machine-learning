
const activation = (x) => 1 / (1 + Math.exp(-x))

const derivative = (x) => {
	const fx = activation(x)
	return fx * (1 - fx)
}

const inverseDerivative = (fx) => fx * (1 - fx)

module.exports = {
	activation,
	derivative,
	inverseDerivative,
}
