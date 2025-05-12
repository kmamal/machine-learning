const { memoize } = require('@kmamal/util/function/memoize')
const { initialize } = require('./initialization/plus-plus')
const { create } = require('@kmamal/util/array/create')
const { copy } = require('@kmamal/util/array/copy')

const defineFor = memoize((V) => {
	// throw new Error("needs to take into account the domain")

	const add$$$ = V.add.$$$
	const sub$$$ = V.sub.$$$
	const scale$$$ = V.scale.$$$
	const subTo = V.sub.to

	const _tmp = []
	const fnDist = (a, b) => V.norm(subTo(_tmp, a, b))

	const init = (points, K) => {
		const N = points.length
		if (N < K) { throw new Error("too few points") }

		const centers = initialize(points, K, fnDist)
		const clusters = new Array(K)
		for (let k = 0; k < K; k++) {
			const center = centers[k]
			clusters[k] = {
				center: [ ...center ],
				lastCenter: [ ...center ],
				toAdd: [ ...center ],
				toAddCount: 0,
				toSub: [ ...center ],
				toSubCount: 0,
				index: k,
				diff: 0,
				count: 0,
				scale: 0,
			}
		}

		const pointData = create(N, () => ({
			cluster: null,
			lowerBound: 0,
		}))

		const upperBounds = new Array(N * K)

		{
			// One round of Lloyd's to initialize

			for (let i = 0; i < N; i++) {
				const point = points[i]
				let bestCluster
				let bestDist = Infinity
				for (let k = 0; k < K; k++) {
					const cluster = clusters[k]
					const dist = fnDist(point, cluster.center)
					upperBounds[i * K + k] = dist
					if (dist > bestDist) { continue }
					bestCluster = cluster
					bestDist = dist
				}

				bestCluster.count++
				pointData[i].cluster = bestCluster
				pointData[i].lowerBound = bestDist
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

			// Then update diffs and bounds

			for (let k = 0; k < K; k++) {
				const cluster = clusters[k]
				cluster.diff = fnDist(cluster.lastCenter, cluster.center)
			}

			for (let i = 0; i < N; i++) {
				const data = pointData[i]
				data.lowerBound += data.cluster.diff
				for (let k = 0; k < K; k++) {
					const index = i * K + k
					upperBounds[index] = Math.max(0, upperBounds[index] - clusters[k].diff)
				}
			}
		}

		return {
			points,
			clusters,
			pointData,
			upperBounds,
		}
	}

	const iter = (state) => {
		const {
			points,
			clusters,
			pointData,
			upperBounds,
		} = state

		const K = clusters.length
		const N = points.length

		for (let k = 0; k < K; k++) {
			const cluster = clusters[k]
			cluster.toAdd.fill(0)
			cluster.toAddCount = 0
			cluster.toSub.fill(0)
			cluster.toSubCount = 0
		}

		for (let i = 0; i < N; i++) {
			const point = points[i]
			const data = pointData[i]

			let lowerBoundUpdated = false
			let newCluster = null
			let newLowerBound = null

			for (let k = 0; k < K; k++) {
				if (k === data.cluster.index) { continue }

				const upperBound = upperBounds[i * K + k]
				if (data.lowerBound < upperBound) { continue }

				if (!lowerBoundUpdated) {
					const dist = fnDist(point, data.cluster.center)
					data.lowerBound = dist
					upperBounds[i * K + data.cluster.index] = dist
					lowerBoundUpdated = true
					if (data.lowerBound < upperBound) { continue }
				}

				const cluster = clusters[k]
				const dist = fnDist(point, cluster.center)
				upperBounds[i * K + k] = dist
				if (data.lowerBound < dist) { continue }

				newCluster = cluster
				newLowerBound = dist
			}

			if (newCluster !== null) {
				const oldCluster = data.cluster

				add$$$(oldCluster.toSub, V.scale(point, 1 / N))
				oldCluster.toSubCount++

				add$$$(newCluster.toAdd, V.scale(point, 1 / N))
				newCluster.toAddCount++

				data.cluster = newCluster
				data.lowerBound = newLowerBound
			}
		}

		for (let k = 0; k < K; k++) {
			const cluster = clusters[k]
			copy(cluster.lastCenter, cluster.center)
			const oldCount = cluster.count

			if (cluster.toSubCount > 0) {
				const newCount = cluster.count - cluster.toSubCount
				scale$$$(cluster.center, oldCount / newCount)
				scale$$$(cluster.toSub, N / newCount)
				sub$$$(cluster.center, cluster.toSub)
			}

			if (cluster.toAddCount > 0) {
				const newCount = cluster.count + cluster.toAddCount
				scale$$$(cluster.center, oldCount / newCount)
				scale$$$(cluster.toAdd, N / newCount)
				add$$$(cluster.center, cluster.toAdd)
				cluster.count = newCount
			}

			if (cluster.count !== oldCount) {
				cluster.scale = 1 / cluster.count
			}

			cluster.diff = fnDist(cluster.lastCenter, cluster.center)
		}

		for (let i = 0; i < N; i++) {
			const data = pointData[i]
			data.lowerBound += data.cluster.diff
			for (let k = 0; k < K; k++) {
				const index = i * K + k
				upperBounds[index] = Math.max(0, upperBounds[index] - clusters[k].diff)
			}
		}
	}

	return {
		init,
		iter,
	}
})

module.exports = { defineFor }
