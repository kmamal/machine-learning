const Sdl = require('@kmamal/sdl')
const { KeyCommands } = require('@kmamal/key-commands')
const { create } = require('@kmamal/util/array/create')
const { randFloat } = require('@kmamal/util/random/rand-float')
const Canvas = require('@napi-rs/canvas')

const window = Sdl.video.createWindow()
const { pixelWidth: width, pixelHeight: height } = window
const canvas = Canvas.createCanvas(width, height)
const ctx = canvas.getContext('2d')

const { centroids } = require('../src/hierarchical-clustering/centroids')

const M = require('@kmamal/numbers/js')
const Vec = require('@kmamal/linear-algebra/vector').defineFor(M)
const { grahamScanConvexHull } = require('@kmamal/geometry/convex-hull/graham-scan').defineFor(M)
const { sumConvexConvex } = require('@kmamal/geometry/polygon/minkowski').defineFor(M)

const N = 40
const K = 0

const refresh = () => {
	const points = create(N, () => [
		randFloat(0.1, 0.9) * width,
		randFloat(0.1, 0.9) * height,
	])

	const _collectContents = function * (edge, depth) {
		if (edge.index !== undefined) {
			yield { point: points[edge.index], depth }
			return
		}
		yield* _collectContents(edge.a, depth + 1)
		yield* _collectContents(edge.b, depth + 1)
	}
	const collectContents = (edge) => {
		const contents = []
		let maxDepth = 0
		for (const { point, depth } of _collectContents(edge, 0)) {
			contents.push(point)
			maxDepth = Math.max(maxDepth, depth)
		}
		return { contents, depth: maxDepth }
	}

	const edges = centroids(points, (a, b) => Vec.normSquared(Vec.sub(a, b)))

	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, width, height)

	ctx.fillStyle = 'white'
	ctx.strokeStyle = 'white'
	ctx.lineWidth = 2

	for (const [ x, y ] of points) {
		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	}

	for (let i = 0; i < edges.length - K; i++) {
		const edge = edges[i]

		const { contents, depth } = collectContents(edge)
		const hull = grahamScanConvexHull(contents) || contents

		const hullPolygon = hull.flat()
		const s = depth * 3 + 4
		const inflated = sumConvexConvex(hullPolygon, [ s, s, s, -s, -s, -s, -s, s ])

		ctx.beginPath()
		ctx.moveTo(inflated[0], inflated[1])
		for (let j = 2; j < inflated.length; j += 2) {
			ctx.lineTo(inflated[j], inflated[j + 1])
		}
		ctx.lineTo(inflated[0], inflated[1])
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
