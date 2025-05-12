const Sdl = require('@kmamal/sdl')
const { KeyCommands } = require('@kmamal/key-commands')
const { create } = require('@kmamal/util/array/create')
const { randFloat } = require('@kmamal/util/random/rand-float')
const Canvas = require('@napi-rs/canvas')

const window = Sdl.video.createWindow()
const { pixelWidth: width, pixelHeight: height } = window
const canvas = Canvas.createCanvas(width, height)
const ctx = canvas.getContext('2d')

const { kruskal } = require('../src/hierarchical-clustering/single-linkage')

const M = require('@kmamal/numbers/js')
const Vec = require('@kmamal/linear-algebra/vector').defineFor(M)

const N = 100
const K = 10

const refresh = () => {
	const points = create(N, () => [
		randFloat(0.1, 0.9) * width,
		randFloat(0.1, 0.9) * height,
	])

	const edges = kruskal(N, (ai, bi) => Vec.normSquared(
		Vec.sub(points[ai], points[bi]),
	))

	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, width, height)

	ctx.fillStyle = 'white'
	ctx.strokeStyle = 'white'

	for (const [ x, y ] of points) {
		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	}

	for (const { ai, bi } of edges.slice(0, -K)) {
		const [ ax, ay ] = points[ai]
		const [ bx, by ] = points[bi]
		ctx.beginPath()
		ctx.moveTo(ax, ay)
		ctx.lineTo(bx, by)
		ctx.stroke()
	}

	const buffer = Buffer.from(ctx.getImageData(0, 0, width, height).data)
	window.render(width, height, width * 4, 'rgba32', buffer)
}

refresh()


new KeyCommands({
	global: [
		{
			shortcut: 'space',
			description: "Refresh",
			command: refresh,
		},
	],
}).attach(window).printHelp()
