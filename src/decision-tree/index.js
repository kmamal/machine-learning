const { __sort } = require('@kmamal/util/array/sort')
const { __partition } = require('@kmamal/util/array/partition')
const { __count, countBy } = require('@kmamal/util/map/count')
const Counts = require('@kmamal/counts/map')
const { compareBy } = require('@kmamal/util/function/compare')
const { mean, varianceHavingMean } = require('@kmamal/statistics/summary')
const { entropyFromCounts } = require('@kmamal/statistics/entropy')
const { addBy, popBy } = require('@kmamal/heap')

const JS = require('@kmamal/numbers/js')


const makeLearner = ({ domain, limit, filter }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)
	const labelVariable = domain[labelIndex]
	const isLabelReal = labelVariable.type === 'real'
	const getLabel = (x) => x[labelIndex]


	const variables = domain.map((originalVariable, index) => {
		if (originalVariable === null || originalVariable.isLabel) { return null }

		const { Algebra: M = JS, type, ...variable } = originalVariable
		variable.isNominal = type === 'nominal'
		variable.fnCmp = variable.isNominal
			? compareBy((x) => x[index])
			: (a, b) => M.sub(a[index], b[index])
		variable.lte = (a, b) => M.lte(a, b)
		variable.eq = (a, b) => M.eq(a, b)
		return variable
	})

	const getInformationGain = (x) => -x.informationGain


	const getBestSplitUsingVariance = (samples, start, end) => {
		const num = end - start

		const bestSplit = {
			variableIndex: null,
			op: null,
			value: null,
			start,
			mid: null,
			end,
			childLeft: null,
			childRight: null,
			impurityLeft: null,
			impurityRight: null,
			impurityAverage: Infinity,
		}

		let sumLeft = 0
		let sumSquaresLeft = 0
		let numLeft = 0
		let sumRight = 0
		let sumSquaresRight = 0
		let numRight = num
		for (let i = start; i < end; i++) {
			const label = samples[i][labelIndex]
			sumRight += label
			sumSquaresRight += label * label
		}

		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i]
			if (variable === null) { continue }

			const { isNominal, fnCmp, eq } = variable

			__sort(samples, start, end, fnCmp)

			if (eq(samples[start][i], samples[end - 1][i])) { continue }

			let sample
			let nextSample = samples[start]
			for (let j = start + 1; j <= end; j++) {
				sample = nextSample
				nextSample = samples[j]
				const value = sample[i]
				const label = sample[labelIndex]
				const label2 = label ** 2

				sumRight -= label
				sumSquaresRight -= label2
				numRight--
				sumLeft += label
				sumSquaresLeft += label2
				numLeft++

				if (j === end) {
					if (!isNominal) { break }
				}
				else if (eq(value, nextSample[i])) { continue }

				if (numLeft === 0) { continue }
				if (numRight === 0) { continue }

				const avgLeft = sumLeft / numLeft
				const avgRight = sumRight / numRight
				const varianceLeft = sumSquaresLeft / numLeft - avgLeft ** 2
				const varianceRight = sumSquaresRight / numRight - avgRight ** 2
				const varianceAverage = (varianceLeft * numLeft + varianceRight * numRight) / num
				if (varianceAverage < bestSplit.impurityAverage) {
					bestSplit.variableIndex = i
					bestSplit.op = isNominal ? 'eq' : 'lte'
					bestSplit.value = value
					bestSplit.mid = start + numLeft
					bestSplit.childLeft = { value: avgLeft, p: null }
					bestSplit.childRight = { value: avgRight, p: null }
					bestSplit.impurityLeft = varianceLeft
					bestSplit.impurityRight = varianceRight
					bestSplit.impurityAverage = varianceAverage
				}

				if (!isNominal) { continue }

				sumRight += sumLeft
				sumSquaresRight += sumSquaresLeft
				numRight += numLeft
				sumLeft = 0
				sumSquaresLeft = 0
				numLeft = 0
			}

			if (isNominal) { continue }

			let tmp
			tmp = sumRight
			sumRight = sumLeft
			sumLeft = tmp
			tmp = sumSquaresRight
			sumSquaresRight = sumSquaresLeft
			sumSquaresLeft = tmp
			numLeft = 0
			numRight = num
		}

		const { variableIndex } = bestSplit
		if (variableIndex === null) { return null }
		const splitVariable = variables[variableIndex]

		bestSplit.splitSamples = bestSplit.op === 'lte'
			? () => {
				const { fnCmp } = splitVariable
				__sort(samples, start, end, fnCmp)
			}
			: () => {
				const { eq } = splitVariable
				const fnPred = (x) => eq(x[variableIndex], bestSplit.value)
				__partition(samples, start, end, fnPred)
			}

		return bestSplit
	}

	const getBestSplitUsingEntropy = (samples, start, end) => {
		const num = end - start

		const bestSplit = {
			variableIndex: null,
			op: null,
			value: null,
			start,
			mid: null,
			end,
			childLeft: null,
			childRight: null,
			impurityLeft: null,
			impurityRight: null,
			impurityAverage: Infinity,
		}

		let countsLeft = new Map()
		let countsRight = new Map()
		__count(countsRight, samples, start, end, getLabel)

		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i]
			if (variable === null) { continue }

			const { isNominal, fnCmp, eq } = variable

			__sort(samples, start, end, fnCmp)

			if (eq(samples[start][i], samples[end - 1][i])) { continue }

			let sample
			let nextSample = samples[start]
			for (let j = start + 1; j <= end; j++) {
				sample = nextSample
				nextSample = samples[j]
				const value = sample[i]
				const label = sample[labelIndex]

				Counts.dec(countsRight, label)
				Counts.inc(countsLeft, label)

				if (j === end) {
					if (!isNominal) { break }
				}
				else if (eq(value, nextSample[i])) { continue }


				const numLeft = Counts.total(countsLeft)
				if (numLeft === 0) { continue }

				const numRight = Counts.total(countsRight)
				if (numRight === 0) { continue }

				const entropyLeft = entropyFromCounts(countsLeft, numLeft)
				const entropyRight = entropyFromCounts(countsRight, numRight)
				const entropyAverage = (entropyLeft * numLeft + entropyRight * numRight) / num
				if (entropyAverage < bestSplit.impurityAverage) {
					const labelLeft = Counts.mostFrequent(countsLeft)
					const labelRight = Counts.mostFrequent(countsRight)

					bestSplit.variableIndex = i
					bestSplit.op = isNominal ? 'eq' : 'lte'
					bestSplit.value = value
					bestSplit.mid = start + numLeft
					bestSplit.childLeft = { value: labelLeft, p: countsLeft.get(labelLeft) / numLeft }
					bestSplit.childRight = { value: labelRight, p: countsRight.get(labelRight) / numRight }
					bestSplit.impurityLeft = entropyLeft
					bestSplit.impurityRight = entropyRight
					bestSplit.impurityAverage = entropyAverage
				}

				if (!isNominal) { continue }

				for (const [ key, count ] of countsLeft.entries()) {
					Counts.add(countsRight, key, count)
				}
				Counts.reset(countsLeft)
			}

			if (isNominal) { continue }

			const tmp = countsRight
			countsRight = countsLeft
			countsLeft = tmp
		}

		const { variableIndex } = bestSplit
		if (variableIndex === null) { return null }
		const splitVariable = variables[variableIndex]

		bestSplit.splitSamples = bestSplit.op === 'lte'
			? () => {
				const { fnCmp } = splitVariable
				__sort(samples, start, end, fnCmp)
			}
			: () => {
				const { eq } = splitVariable
				const fnPred = (x) => eq(x[variableIndex], bestSplit.value)
				__partition(samples, start, end, fnPred)
			}

		return bestSplit
	}

	const getBestSplit = isLabelReal
		? getBestSplitUsingVariance
		: getBestSplitUsingEntropy


	const train = (samples) => {
		const N = samples.length

		let rootCounts
		let rootLabels
		let rootMean
		let initialImpurity
		if (isLabelReal) {
			rootLabels = samples.map(getLabel)
			rootMean = mean(rootLabels)
			initialImpurity = varianceHavingMean(rootLabels, rootMean)
		}
		else {
			rootCounts = countBy(samples, getLabel)
			initialImpurity = entropyFromCounts(rootCounts, N)
		}

		let tree = null
		let size = 0
		let depth = 0
		let splits = 0

		const bestSplitForRoot = getBestSplit(samples, 0, N)
		if (bestSplitForRoot === null) {
			if (isLabelReal) { return { tree: { value: rootMean, p: null } } }

			const value = Counts.mostFrequent(rootCounts)
			const p = rootCounts.get(value) / N
			return { tree: { value, p } }
		}

		bestSplitForRoot.parent = null
		bestSplitForRoot.parentSide = null
		bestSplitForRoot.parentDepth = 0
		bestSplitForRoot.informationGain = initialImpurity - bestSplitForRoot.impurityAverage
		const potentialSplits = [ bestSplitForRoot ]
		bestSplitForRoot.splitSamples()

		while (!limit?.({ tree, size, depth, splits, potentialSplits })) {
			if (potentialSplits.length === 0) { break }

			const {
				variableIndex,
				op,
				value,
				start,
				mid,
				end,
				childLeft,
				childRight,
				impurityLeft,
				impurityRight,
				parent,
				parentSide,
				parentDepth,
				splitSamples,
			} = popBy(potentialSplits, getInformationGain)

			const node = {
				variableIndex,
				op,
				value,
				left: childLeft,
				right: childRight,
			}

			if (parent === null) {
				tree = node
			}
			else {
				parent[parentSide] = node
			}

			size++
			depth = Math.max(depth, parentDepth + 1)
			if (node.left.value !== node.right.value) { splits++ }

			splitSamples()

			leftChild: {
				if (impurityLeft === 0) { break leftChild }

				const bestSplitForLeft = getBestSplit(samples, start, mid)
				if (bestSplitForLeft === null) { break leftChild }

				bestSplitForLeft.parent = node
				bestSplitForLeft.parentSide = 'left'
				bestSplitForLeft.parentDepth = parentDepth + 1
				bestSplitForLeft.informationGain = impurityLeft - bestSplitForLeft.impurityAverage

				if (bestSplitForLeft.informationGain === 0 || (filter && !filter(bestSplitForLeft))) { break leftChild }
				addBy(potentialSplits, bestSplitForLeft, getInformationGain)
			}

			rightChild: {
				if (impurityRight === 0) { break rightChild }

				const bestSplitForRight = getBestSplit(samples, mid, end)
				if (bestSplitForRight === null) { break rightChild }

				bestSplitForRight.parent = node
				bestSplitForRight.parentSide = 'right'
				bestSplitForRight.parentDepth = parentDepth + 1
				bestSplitForRight.informationGain = impurityRight - bestSplitForRight.impurityAverage

				if (bestSplitForRight.informationGain === 0 || (filter && !filter(bestSplitForRight))) { break rightChild }
				addBy(potentialSplits, bestSplitForRight, getInformationGain)
			}
		}

		return { tree }
	}

	const predict = (model, sample) => {
		const { tree } = model

		let node = tree
		while (node.p === undefined) {
			const { variableIndex, op, value } = node
			const variable = variables[variableIndex]

			const x = sample[variableIndex]
			node = variable[op](x, value) ? node.left : node.right
		}

		return node
	}

	return { train, predict }
}


module.exports = { makeLearner }
