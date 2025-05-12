const { minNBy } = require('@kmamal/util/array/min-n')

const JS = require('@kmamal/numbers/js')


const makeLearner = ({ domain, k, fnAggregate }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

	const variables = domain.map((originalVariable) => {
		if (originalVariable === null || originalVariable.isLabel) { return null }

		const { type, Algebra: M = JS, ...variable } = originalVariable
		if (type === 'nominal' && M === JS) { return null }

		variable.diff = (a, b) => {
			const d = M.sub(a, b)
			return d * d
		}
		return variable
	})


	const fnDist = (a, b) => {
		let sum = 0
		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i]
			if (variable === null) { continue }
			sum += variable.diff(a[i], b[i])
		}
		return sum
	}


	const train = (samples) => ({ samples })

	const predict = (model, sample) => {
		const { samples } = model
		const nearest = minNBy(samples, k, (x) => fnDist(sample, x))
		return fnAggregate(nearest.map((neighbor) => ({
			point: neighbor,
			label: neighbor[labelIndex],
			dist: fnDist(sample, neighbor),
		})))
	}

	return { train, predict }
}


module.exports = { makeLearner }
