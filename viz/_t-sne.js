const Sdl = require('../../sdl-related/sdl/src/types')
const { throttle } = require('@kmamal/util/function/async/throttle')
const { sleep } = require('@kmamal/util/promise/sleep')

const { LowerLeft } = require('@kmamal/triangular')
const { copy } = require('@kmamal/util/array/copy')

// t-distributed stochastic neighbor embedding

const calcEmbedding = async (samples, domain, perplexity = 10) => {
	const N = samples.length
	const labelIndex = domain.findIndex((variable) => variable.isLabel)
	const variableIndexes = domain
		.map((variable, index) => variable.isLabel || variable.type === 'nominal' ? null : index)
		.filter((x) => x !== null)

	const lastCoordinates = new Array(N * 2).fill(0)

	const colors = {
		'Iris-setosa': [ 255, 0, 0 ],
		'Iris-versicolor': [ 0, 255, 0 ],
		'Iris-virginica': [ 0, 0, 255 ],
	}

	const window = Sdl.video.createWindow({ resizable: true })

	let width
	let height
	let stride
	let buffer

	const resize = () => {
		width = Math.floor(window.pixelWidth / 4)
		height = Math.floor(window.pixelHeight / 4)
		stride = width * 3
		buffer = Buffer.alloc(stride * height)

		render()
	}

	const render = throttle(() => {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				buffer[y * stride + x * 3 + 0] = 0
				buffer[y * stride + x * 3 + 1] = 0
				buffer[y * stride + x * 3 + 2] = 0
			}
		}

		for (let i = 0; i < N; i++) {
			const x = Math.round(((lastCoordinates[i * 2 + 0] + 1) / 2) * width)
			const y = Math.round(((lastCoordinates[i * 2 + 1] + 1) / 2) * height)
			// const [ r, g, b ] = colors[samples[i][labelIndex]]
			const a = Math.floor(255 * (samples[i][labelIndex] + 1) / 2)

			buffer[y * stride + x * 3 + 0] = a
			buffer[y * stride + x * 3 + 1] = a
			buffer[y * stride + x * 3 + 2] = a
		}

		window.render(width, height, stride, 'rgb24', buffer)
	}, 100)

	window.on('expose', render)
	window.on('resize', throttle(resize, 100))
	resize()


	const fnDist = (a, b) => {
		let dist = 0
		for (const index of variableIndexes) {
			dist += (a[index] - b[index]) ** 2
		}
		return Math.sqrt(dist)
	}

	const e = new LowerLeft(N)
	for (let i = 0; i < N; i++) {
		for (let j = 0; j < i; j++) {
			const dist = fnDist(samples[i], samples[j])
			e.set(j, i, Math.exp(-dist))
		}
	}

	const pc = new Array(N * N)
	for (let i = 0; i < N; i++) {
		let sum = 0
		for (let j = 0; j < i; j++) { sum += e.get(j, i) }
		for (let j = i + 1; j < N; j++) { sum += e.get(i, j) }

		for (let j = 0; j < i; j++) { pc[i * N + j] = e.get(j, i) / sum }
		for (let j = i + 1; j < N; j++) { pc[i * N + j] = e.get(i, j) / sum }
	}

	const p = new LowerLeft(N)
	for (let i = 0; i < N; i++) {
		for (let j = 0; j < i; j++) {
			const pcij = pc[i * N + j]
			const pcji = pc[j * N + i]
			p.set(j, i, (pcij + pcji) / (2 * N))
		}
	}

	const t = new LowerLeft(N)

	const initialSolution = new Array(2 * N)
	for (let i = 0; i < N; i++) {
		const a = 2 * Math.PI * i / N
		const x = Math.sin(a) / 2 + 0.5
		const y = Math.cos(a) / 2 + 0.5
		initialSolution[i * 2 + 0] = x
		initialSolution[i * 2 + 1] = y
	}

	const RandomSearch = require('@kmamal/optimization/random-search')
	const CoordinateDescent = require('@kmamal/optimization/coordinate-descent')
	const { search } = require('@kmamal/optimization/search')
	const GolderRatio = require('@kmamal/optimization/1d/bounded/golden-ratio')
	const GolderRatioBounds = require('@kmamal/optimization/1d/find-bounds/golden-ratio')
	const { search: search1d } = require('@kmamal/optimization/1d/unbounded/meta-bidirectional')

	let lastValue = Infinity
	await search({
		algo: RandomSearch,
		problem: {
			func: async (coordinates) => {
				// copy.$$$(lastCoordinates, coordinates)
				// render()
				await sleep(0)

				let sum = 0
				for (let i = 0; i < N; i++) {
					const ix = coordinates[i * 2 + 0]
					const iy = coordinates[i * 2 + 1]

					for (let j = 0; j < i; j++) {
						const jx = coordinates[j * 2 + 0]
						const jy = coordinates[j * 2 + 1]

						const dist = Math.sqrt((ix - jx) ** 2 + (iy - jy) ** 2) * perplexity // not right
						t.set(j, i, 1 / (1 + dist))
						sum += 1 / (1 + dist)
					}
				}

				let divergence = 0
				for (let i = 0; i < N; i++) {
					for (let j = 0; j < i; j++) {
						const qij = t.get(j, i) / sum
						const pij = p.get(j, i)
						divergence += pij * Math.log(pij / qij)
					}
				}

				const ridge = 0.001 * coordinates.reduce((acc, x) => acc + x * x, 0)

				return divergence + ridge
			},
			domain: new Array(2 * N).fill({ type: 'real', from: -1, to: 1 }),
		},
		limit: (state) => {
			const best = RandomSearch.best(state)
			if (best.value < lastValue) {
				lastValue = best.value
				copy.$$$(lastCoordinates, best.solution)
				render()
			}
			else {
				state.temperature *= 0.9999
				console.log(state.temperature)
			}
			return false
		},
		options: {
			index: 0,
			temperature: 2,
			getNeighbor: (state, dst, src) => {
				copy.$$$(dst, src)

				// const index = Math.floor(Math.random() * N)
				const index = state.index++
				state.index %= state.order / 2

				dst[index * 2 + 0] += (Math.random() - 0.5) * state.temperature
				dst[index * 2 + 1] += (Math.random() - 0.5) * state.temperature
			},
			searchLine: async (state) => await search1d(
				{
					...GolderRatio,
					...GolderRatioBounds,
					limit: ({ a, b }) => Math.abs(a - b) < 0.01,
				},
				{
					variable: { type: 'real', from: -1, to: 1 },
					func: async (scale) => {
						const { func, solution, index } = state
						const candidate = Array.from(solution)
						candidate[index] = scale
						return await func(candidate)
					},
				},
				0,
				state.value,
				0.1,
			),
		},
	})
}


const { loadDataset } = require('../src/loaders/load-dataset')
const { Scaler } = require('../src/scaling/robust')

loadDataset('boston').then(({ samples, domain }) => {
	// domain[4].isLabel = true
	domain[13].isLabel = true
	const scaler = new Scaler(domain)
	scaler.fit(samples)
	calcEmbedding(samples.map((x) => scaler.map(x)), domain)
})
