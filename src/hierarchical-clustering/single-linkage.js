const {
	heapifyBy,
	popBy,
	bubbleUpBy,
} = require('@kmamal/heap')
const { sortBy } = require('@kmamal/util/array/sort')
const { DisjointSet } = require('@kmamal/disjoint-set')

const getDist = (x) => x.dist

const sortBy$$$ = sortBy.$$$


const kruskal = (N, fnDist) => {
	const numDistances = N * (N - 1) / 2
	const distances = new Array(numDistances)
	let writeIndex = 0
	for (let ai = 0; ai < N; ai++) {
		for (let bi = ai + 1; bi < N; bi++) {
			distances[writeIndex++] = { ai, bi, dist: fnDist(ai, bi) }
		}
	}
	heapifyBy(distances, getDist, 'index')

	const tree = new Array(N - 1)
	writeIndex = 0

	const clusters = new DisjointSet(N)
	while (clusters.numGroups() > 1) {
		const edge = popBy(distances, getDist, 'index')
		const aCluster = clusters._findGroup(edge.ai)
		const bCluster = clusters._findGroup(edge.bi)
		if (aCluster === bCluster) { continue }
		clusters._merge(aCluster, bCluster)
		tree[writeIndex++] = edge
	}

	return tree
}


const prim = (N, fnDist) => {
	const openSet = new Array(N - 1)
	for (let bi = 1; bi < N; bi++) {
		const dist = fnDist(0, bi)
		openSet[bi - 1] = { ai: 0, bi, dist }
	}
	heapifyBy(openSet, getDist, 'index')

	const tree = new Array(N - 1)
	let writeIndex = 0

	while (openSet.length > 0) {
		const edge = popBy(openSet, getDist, 'index')

		const { bi } = edge
		tree[writeIndex++] = edge

		for (const edge of openSet) {
			const newDist = fnDist(bi, edge.bi)
			if (newDist >= edge.dist) { continue }
			edge.ai = bi
			edge.dist = newDist
			bubbleUpBy(openSet, getDist, 'index')
		}
	}

	sortBy$$$(tree, getDist)
	return tree
}

module.exports = {
	kruskal,
	prim,
}
