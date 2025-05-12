
const holdout = (samples, ratio) => {
	const N = samples.length
	const index = Math.floor(N * ratio)
	return {
		trainingSamples: samples.slice(0, index),
		testingSamples: samples.slice(index),
	}
}

module.exports = { holdout }
