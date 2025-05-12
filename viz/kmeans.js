const Sdl = require('@kmamal/sdl')
const { KeyCommands } = require('@kmamal/key-commands')
const { create } = require('@kmamal/util/array/create')
const { randFloat } = require('@kmamal/util/random/rand-float')
const { choose } = require('@kmamal/util/random/choose')
const { sampleNormal } = require('@kmamal/sampling/normal')
const Canvas = require('@napi-rs/canvas')

const window = Sdl.video.createWindow()
const { pixelWidth: width, pixelHeight: height } = window
const canvas = Canvas.createCanvas(width, height)
const ctx = canvas.getContext('2d')

const M = require('@kmamal/numbers/js')
const V = require('@kmamal/linear-algebra/vector').defineFor(M)

const { init, iter } = require('../src/k-means/elkans').defineFor(V)

const N = 1000
const K = 3
const colors = [
	'red',
	'green',
	'blue',
]

let state

const render = () => {
	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, width, height)

	for (let i = 0; i < state.points.length; i++) {
		const [ x, y ] = state.points[i]
		const { cluster } = state.pointData[i]
		ctx.fillStyle = cluster?.color ?? 'white'
		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	}

	ctx.strokeStyle = 'white'
	for (let k = 0; k < K; k++) {
		const { center, color } = state.clusters[k]

		ctx.fillStyle = color
		ctx.fillRect(center[0] - 5, center[1] - 5, 10, 10)
		ctx.strokeRect(center[0] - 5, center[1] - 5, 10, 10)
	}

	ctx.fillStyle = 'white'
	for (const { m: [ x, y ] } of state.distributions) {
		ctx.fillRect(x - 5, y - 1, 10, 2)
		ctx.fillRect(x - 1, y - 5, 2, 10)
	}

	const buffer = Buffer.from(ctx.getImageData(0, 0, width, height).data)
	window.render(width, height, width * 4, 'rgba32', buffer)
}

const reset = () => {
	const distributions = create(K, () => ({
		m: [
			randFloat(0.1, 0.9) * width,
			randFloat(0.1, 0.9) * height,
		],
		s: Math.min(width, height) * 0.1,
	}))

	const points = new Array(N)
	for (let i = 0; i < N; i++) {
		const { m, s } = choose(distributions)
		points[i] = [
			sampleNormal(m[0], s),
			sampleNormal(m[1], s),
		]
	}

	state = init(points, K, (a, b) => V.normSquared(V.sub(a, b)), (contents) => {
		const mean = [ 0, 0 ]
		const scale = 1 / contents.length
		for (let i = 0; i < contents.length; i++) {
			V.add.$$$(mean, V.scale(contents[i], scale))
		}
		return mean
	})

	for (let i = 0; i < state.clusters.length; i++) {
		state.clusters[i].color = colors[i]
	}

	state.distributions = distributions

	render()
}

const step = () => {
	iter(state)
	render()
}

reset()


new KeyCommands({
	global: [
		{
			shortcut: 'return',
			description: "Reset",
			command: reset,
		},
		{
			shortcut: 'space',
			description: "Step",
			command: step,
		},
	],
}).attach(window).printHelp()
