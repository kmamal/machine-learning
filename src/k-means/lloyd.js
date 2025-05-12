const { memoize } = require('@kmamal/util/function/memoize')
const { initialize } = require('./initialization/plus-plus')
const { create } = require('@kmamal/util/array/create')
const { map } = require('@kmamal/util/array/map')

const map$$$ = map.$$$

const defineFor = memoize((V) => {
	throw new Error("needs to take into account the domain")

	const add$$$ = V.add.$$$
	const subTo = V.sub.to

	const _tmp = []
	const fnDist = (a, b) => V.normSquared(subTo(_tmp, a, b))

	const init = (points, K) => {
		const N = points.length
		if (N < K) { throw new Error("too few points") }

		const centers = initialize(points, K, fnDist)
		const clusters = map$$$(centers, (center) => ({
			center: [ ...center ],
			count: 0,
			scale: 0,
		}))

		const pointData = create(N, () => ({
			cluster: null,
		}))

		return {
			points,
			clusters,
			pointData,
		}
	}

	const iter = (state) => {
		const {
			points,
			clusters,
			pointData,
		} = state

		const N = points.length
		const K = clusters.length

		for (let k = 0; k < K; k++) {
			clusters[k].count = 0
		}

		for (let i = 0; i < N; i++) {
			const point = points[i]
			let bestCluster = clusters[0]
			let bestDist = fnDist(point, clusters[0].center)
			for (let k = 1; k < K; k++) {
				const cluster = clusters[k]
				const dist = fnDist(point, cluster.center)
				if (dist > bestDist) { continue }
				bestCluster = cluster
				bestDist = dist
			}

			bestCluster.count++
			pointData[i].cluster = bestCluster
		}

		for (let k = 0; k < K; k++) {
			const cluster = clusters[k]
			cluster.center.fill(0)
			cluster.scale = 1 / cluster.count
		}

		for (let i = 0; i < N; i++) {
			const point = points[i]
			const { cluster } = pointData[i]
			add$$$(cluster.center, V.scale(point, cluster.scale))
		}
	}

	return {
		init,
		iter,
	}
})

module.exports = { defineFor }
