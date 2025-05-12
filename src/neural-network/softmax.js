
const softmax = (activations) => {
	const N = activations.length

	const firstX = activations[0]
	const firstExp = Math.exp(firstX)
	let maxExp = firstExp
	let maxIndex = 0
	let sum = firstX
	for (let i = 1; i < N; i++) {
		const x = activations[i]
		const exp = Math.exp(x)
		sum += exp
		if (exp > maxExp) {
			maxExp = exp
			maxIndex = i
		}
	}
	return {
		p: maxExp / sum,
		index: maxIndex,
	}
}

module.exports = { softmax }
