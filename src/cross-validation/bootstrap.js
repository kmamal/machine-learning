const { choose } = require('@kmamal/util/random/choose')

const bootstrap = (arr) => {
	const N = arr.length
	const res = new Array(N)
	for (let i = 0; i < N; i++) {
		res[i] = choose(arr)
	}
	return res
}

const bootstrapTo = (dst, arr) => {
	const N = arr.length
	dst.length = N
	for (let i = 0; i < N; i++) {
		dst[i] = choose(arr)
	}
	return dst
}

bootstrap.to = bootstrapTo

module.exports = { bootstrap }
