const { IndexedItemArray } = require('@kmamal/indexed-item-array')
const { heapifyBy, addBy, removeBy } = require('@kmamal/heap')

const getDist = (x) => x.dist

const opposite = (edge, node) => edge.a === node ? edge.b : edge.a

const agglomerate = (N, fnMake, fnDist, fnMerge) => {
	const clusters = new IndexedItemArray(new Array(N), 'indexInClusters')
	let nextKey = 0
	for (let i = 0; i < N; i++) {
		const cluster = fnMake(i)
		cluster.indexKey = `${nextKey++}`
		cluster.edges = new IndexedItemArray([], cluster.indexKey)
		cluster.incomingEdgeDist = -1
		clusters.set(i, cluster)
	}

	const tree = []

	const stack = []
	const stackSet = new Set()

	while (clusters.size() > 1) {
		if (stack.length === 0) {
			const first = clusters.at(0)
			stack.push(first)
			stackSet.add(first)
		}

		const curr = stack.at(-1)
		const prev = stack.at(-2)

		for (let i = 0; i < clusters.size(); i++) {
			const cluster = clusters.at(i)
			if (stackSet.has(cluster)) { continue }
			const edge = { a: curr, b: cluster, dist: fnDist(curr, cluster) }
			curr.edges.push(edge)
			cluster.edges.push(edge)
		}
		heapifyBy(curr.edges.array(), getDist, curr.indexKey)

		const edge = curr.edges.at(0)
		const next = opposite(edge, curr)

		if (next !== prev) {
			next.incomingEdgeDist = edge.dist
			stack.push(next)
			stackSet.add(next)
			continue
		}

		tree.push(edge)

		for (let i = 1; i < curr.edges.size(); i++) {
			const edgeA = curr.edges.at(i)
			const other = opposite(edgeA, curr)
			if (stackSet.has(other)) {
				removeBy(other.edges.array(), edgeA[other.indexKey], getDist, other.indexKey)
			} else {
				other.edges.removeItem(edgeA)
			}
		}
		delete curr.edges
		delete curr.indexKey
		delete curr.incomingEdgeDist
		clusters.removeItem(curr)

		for (let i = 1; i < next.edges.size(); i++) {
			const edgeB = next.edges.at(i)
			const other = opposite(edgeB, next)
			if (stackSet.has(other)) {
				removeBy(other.edges.array(), edgeB[other.indexKey], getDist, other.indexKey)
			} else {
				other.edges.removeItem(edgeB)
			}
		}
		delete next.edges
		delete curr.indexKey
		delete curr.incomingEdgeDist
		clusters.removeItem(next)

		const merged = fnMerge(curr, next)
		merged.indexKey = `${nextKey++}`
		merged.edges = new IndexedItemArray([], merged.indexKey)
		merged.incomingEdgeDist = -1
		clusters.push(merged)

		for (let i = 0; i < stack.length - 2; i++) {
			const cluster = stack[i]
			const edge = { a: merged, b: cluster, dist: fnDist(merged, cluster) }
			merged.edges.push(edge)
			addBy(cluster.edges.array(), edge, getDist, cluster.indexKey)
		}

		stackSet.delete(curr)
		stackSet.delete(prev)
		stack.length -= 2
	}

	return tree
}

module.exports = { agglomerate }
