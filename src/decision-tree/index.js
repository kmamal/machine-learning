const { __sort } = require('@kmamal/util/array/sort')
const { __partition } = require('@kmamal/util/array/partition')
const { __count, countBy } = require('@kmamal/util/map/count')
const Counts = require('@kmamal/counts/map')
const { compareBy } = require('@kmamal/util/function/compare')
const { _entropy } = require('@kmamal/statistics/entropy')
const { addBy, popBy } = require('@kmamal/heap')

const JS = require('@kmamal/numbers/js')


const makeLearner = ({ domain, limit, filter }) => {
	const labelIndex = domain.findIndex((variable) => variable?.isLabel)

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


	const getBestSplit = (samples, start, end) => {
		const num = end - start

		const bestSplit = {
			variableIndex: null,
			op: null,
			value: null,
			start,
			mid: null,
			end,
			numLeft: null,
			countsLeft: null,
			entropyLeft: null,
			labelLeft: null,
			numRight: null,
			countsRight: null,
			entropyRight: null,
			labelRight: null,
			entropyAverage: Infinity,
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

				const entropyLeft = _entropy(countsLeft, numLeft)
				const entropyRight = _entropy(countsRight, numRight)
				const entropyAverage = (entropyLeft * numLeft + entropyRight * numRight) / num
				if (entropyAverage < bestSplit.entropyAverage) {
					bestSplit.variableIndex = i
					bestSplit.op = isNominal ? 'eq' : 'lte'
					bestSplit.value = value
					bestSplit.mid = start + numLeft
					bestSplit.numLeft = numLeft
					bestSplit.countsLeft = new Map(countsLeft)
					bestSplit.entropyLeft = entropyLeft
					bestSplit.labelLeft = Counts.mostFrequent(countsLeft)
					bestSplit.numRight = numRight
					bestSplit.countsRight = new Map(countsRight)
					bestSplit.entropyRight = entropyRight
					bestSplit.labelRight = Counts.mostFrequent(countsRight)
					bestSplit.entropyAverage = entropyAverage
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

		if (bestSplit.op === 'lte') {
			const { fnCmp } = variables[variableIndex]
			__sort(samples, start, end, fnCmp)
		}
		else {
			const { eq } = variables[variableIndex]
			const fnPred = (x) => eq(x[variableIndex], bestSplit.value)
			__partition(samples, start, end, fnPred)
		}

		return bestSplit
	}


	const train = (samples) => {
		const N = samples.length
		const rootCounts = countBy(samples, getLabel)
		const initialEntropy = _entropy(rootCounts, N)

		let tree = null
		let size = 0
		let depth = 0
		let splits = 0

		const bestSplitForRoot = getBestSplit(samples, 0, N)
		if (bestSplitForRoot === null) {
			const value = Counts.mostFrequent(rootCounts)
			const p = rootCounts.get(value) / N
			return { tree: { value, p } }
		}
		bestSplitForRoot.parent = null
		bestSplitForRoot.parentSide = null
		bestSplitForRoot.parentDepth = 0
		bestSplitForRoot.informationGain = initialEntropy - bestSplitForRoot.entropyAverage
		const potentialSplits = [ bestSplitForRoot ]

		while (!limit?.({ tree, size, depth, splits, potentialSplits })) {
			if (potentialSplits.length === 0) { break }

			const {
				variableIndex,
				op,
				value,
				start,
				mid,
				end,
				numLeft,
				countsLeft,
				entropyLeft,
				labelLeft,
				numRight,
				countsRight,
				entropyRight,
				labelRight,
				parent,
				parentSide,
				parentDepth,
			} = popBy(potentialSplits, getInformationGain)

			const node = {
				variableIndex,
				op,
				value,
				left: { value: labelLeft, p: countsLeft.get(labelLeft) / numLeft },
				right: { value: labelRight, p: countsRight.get(labelRight) / numRight },
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

			leftChild: {
				if (entropyLeft === 0) { break leftChild }

				const bestSplitForLeft = getBestSplit(samples, start, mid)
				if (bestSplitForLeft === null) { break leftChild }

				bestSplitForLeft.parent = node
				bestSplitForLeft.parentSide = 'left'
				bestSplitForLeft.parentDepth = parentDepth + 1
				bestSplitForLeft.informationGain = entropyLeft - bestSplitForLeft.entropyAverage

				if (bestSplitForLeft.informationGain === 0 || (filter && !filter(bestSplitForLeft))) { break leftChild }
				addBy(potentialSplits, bestSplitForLeft, getInformationGain)
			}

			rightChild: {
				if (entropyRight === 0) { break rightChild }

				const bestSplitForRight = getBestSplit(samples, mid, end)
				if (bestSplitForRight === null) { break rightChild }

				bestSplitForRight.parent = node
				bestSplitForRight.parentSide = 'right'
				bestSplitForRight.parentDepth = parentDepth + 1
				bestSplitForRight.informationGain = entropyRight - bestSplitForRight.entropyAverage

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
			const { Algebra: M = JS } = variables[variableIndex]

			const x = sample[variableIndex]
			node = M[op](x, value) ? node.left : node.right
		}

		return node
	}

	return { train, predict }
}


module.exports = { makeLearner }
