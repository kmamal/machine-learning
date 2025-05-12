
const kFold = function * (samples, k) {
	const { length: N } = samples
	const M = N / k
	for (let i = 0; i < k; i++) {
		const a = Math.round(i * M)
		const b = Math.round((i + 1) * M)
		yield {
			trainingSamples: [
				...samples.slice(0, a),
				...samples.slice(b, N),
			],
			testingSamples: samples.slice(a, b),
		}
	}
}

module.exports = { kFold }
