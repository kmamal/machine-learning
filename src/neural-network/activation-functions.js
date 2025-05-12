
const linear = (x) => x

const heavyside = (x) => x < 0 ? 0 : 1


const rectifier = (x) => Math.max(0, x)
const rectifierDerivative = heavyside
const rectifierInverseDerivative = heavyside

rectifier.derivative = rectifierDerivative
rectifier.inverseDerivative = rectifierInverseDerivative


const logistic = (x) => 1 / (1 + Math.exp(-x))

const logisticDerivative = (x) => {
	const fx = logistic(x)
	return fx * (1 - fx)
}

const logisticInverseDerivative = (fx) => fx * (1 - fx)

logistic.derivative = logisticDerivative
logistic.inverseDerivative = logisticInverseDerivative


const hyperbolicTangent = (x) => {
	const e = Math.exp(2 * x)
	return (e - 1) / (e + 1)
}

const hyperbolicTangentDerivative = (x) => {
	const tanhx = hyperbolicTangent(x)
	return 1 - tanhx * tanhx
}

const hyperbolicTangentInverseDerivative = (tanhx) => 1 - tanhx * tanhx

hyperbolicTangent.derivative = hyperbolicTangentDerivative
hyperbolicTangent.inverseDerivative = hyperbolicTangentInverseDerivative


module.exports = {
	linear,
	heavyside,
	rectifier,
	logistic,
	hyperbolicTangent,
}
