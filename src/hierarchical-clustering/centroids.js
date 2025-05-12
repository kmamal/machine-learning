const { agglomerate } = require('./strategies/nearest-neighbor-chain')

const M = require('@kmamal/numbers/js')
const Vec = require('@kmamal/linear-algebra/vector').defineFor(M)


const centroids = (data, fnDist) => {
	const N = data.length

	return agglomerate(
		N,
		(i) => ({ index: i, centroid: data[i] }),
		(a, b) => {
			const ac = a.centroid
			const bc = b.centroid
			return fnDist(ac, bc)
		},
		(a, b) => {
			const ac = a.centroid
			const bc = b.centroid
			delete a.centroid
			delete b.centroid
			return {
				a,
				b,
				centroid: Vec.scale(Vec.add(ac, bc), 1 / 2),
			}
		},
	)
}

module.exports = { centroids }
