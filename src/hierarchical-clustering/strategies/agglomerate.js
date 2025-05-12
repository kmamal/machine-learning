const { IndexedItemArray } = require('@kmamal/indexed-item-array')
const {
	heapifyBy,
	popBy,
	addBy,
	removeBy,
} = require('@kmamal/heap')

const getDist = (x) => x.dist

const opposite = (edge, node) => edge.a === node ? edge.b : edge.a

const agglomerate = (N, fnMake, fnDist, fnMerge) => {
	const clusters = new IndexedItemArray(new Array(N), 'indexInClusters')
	let nextKey = 0
	for (let i = 0; i < N; i++) {
		const cluster = fnMake(i)
		cluster.indexKey = `${nextKey++}`
		cluster.edges = new IndexedItemArray([], cluster.indexKey)
		clusters.set(i, cluster)
	}

	const openSet = []
	for (let ai = 0; ai < N; ai++) {
		const a = clusters.at(ai)
		for (let bi = ai + 1; bi < N; bi++) {
			const b = clusters.at(bi)
			const edge = { a, b, dist: fnDist(a, b) }
			a.edges.push(edge)
			b.edges.push(edge)
			openSet.push(edge)
		}
	}
	heapifyBy(openSet, getDist, 'indexInHeap')

	const tree = []

	while (openSet.length > 0) {
		const edge = popBy(openSet, getDist, 'indexInHeap')
		tree.push(edge)

		const { a, b } = edge

		a.edges.removeItem(edge)
		for (let i = 0; i < a.edges.size(); i++) {
			const edgeA = a.edges.at(i)
			const other = opposite(edgeA, a)
			other.edges.removeItem(edgeA)
			removeBy(openSet, edgeA['indexInHeap'], getDist, 'indexInHeap')
		}
		delete a.edges
		clusters.removeItem(a)

		b.edges.removeItem(edge)
		for (let i = 0; i < b.edges.size(); i++) {
			const edgeB = b.edges.at(i)
			const other = opposite(edgeB, b)
			other.edges.removeItem(edgeB)
			removeBy(openSet, edgeB['indexInHeap'], getDist, 'indexInHeap')
		}
		delete b.edges
		clusters.removeItem(b)

		const c = fnMerge(a, b)
		c.indexKey = `${nextKey++}`
		c.edges = new IndexedItemArray([], c.indexKey)
		for (let i = 0; i < clusters.size(); i++) {
			const d = clusters.at(i)
			const edgeC = { a: c, b: d, dist: fnDist(c, d) }
			c.edges.push(edgeC)
			d.edges.push(edgeC)
			addBy(openSet, edgeC, getDist, 'indexInHeap')
		}
		clusters.push(c)
	}

	return tree
}

module.exports = { agglomerate }
