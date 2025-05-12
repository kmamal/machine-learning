const { choose } = require('@kmamal/util/random/choose')
const { prefixSums } = require('@kmamal/util/array/prefix-sums')
const { chooseFromPrefixSums } = require('@kmamal/util/random/weighted')

const prefixSumsTo = prefixSums.to

const initialize = (points, K, fnDist) => {
	const N = points.length

	const centers = new Array(K)
	let lastCenter = centers[0] = choose(points)

	const weights = new Array(N).fill(Infinity)
	const sums = new Array(N)

	for (let k = 1; k < K; k++) {
		for (let i = 0; i < N; i++) {
			const dist = fnDist(points[i], lastCenter)
			weights[i] = Math.min(weights[i], dist)
		}
		prefixSumsTo(sums, weights)

		const index = chooseFromPrefixSums(sums)
		lastCenter = centers[k] = points[index]
	}

	return centers
}

module.exports = { initialize }
