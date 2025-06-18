
const activation = (x) => {
	const e = Math.exp(2 * x)
	return (e - 1) / (e + 1)
}

const derivative = (x) => {
	const tanhx = activation(x)
	return 1 - tanhx * tanhx
}

const inverseDerivative = (tanhx) => 1 - tanhx * tanhx

module.exports = {
	activation,
	derivative,
	inverseDerivative,
}
