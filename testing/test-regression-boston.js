const { loadDataset } = require('../src/loaders/load-dataset')
const { seed } = require('@kmamal/util/random/seed')
const { randInt } = require('@kmamal/util/random/rand-int')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../src/cross-validation/holdout')
const { Scaler } = require('../src/scaling/dummy')

const Random = require('../src/baseline/random')
const Average = require('../src/baseline/average')

const LinearRegression = require('../src/linear-regression')
const DecisionTree = require('../src/decision-tree')
const KNearestNeighbors = require('../src/k-nearest-neighbors/linear')
const NeuralNetwork = require('../src/neural-network')

const Bagging = require('../src/ensemble/bagging')
const Selection = require('../src/ensemble/selection')
const Stacking = require('../src/ensemble/stacking')
const Blending = require('../src/ensemble/blending')

const AdaBoost = require('../src/ensemble/boosting/ada-boost')
const RandomForest = require('../src/random-forest')

const { EvaluationForRegression } = require('../src/evaluation-for-regression')
const { create } = require('@kmamal/util/array/create')
const Stat = require('@kmamal/statistics/summary')

const { eq: jsEq } = require('@kmamal/util/operators/comparison/eq')


const args = Object.fromEntries(process.argv.slice(2).map((x) => x.split('=')))

const MAX_SEED = 1e3
const seedNum = args.seed
	? parseInt(args.seed, 10) % MAX_SEED
	: randInt(0, MAX_SEED)
console.log({ seedNum })
seed(seedNum / MAX_SEED)

const filterList = args.only?.split(',')

const N = args.n ?? 10


loadDataset('boston').then(async ({ domain, samples }) => {
	const labelIndex = domain.findIndex((x) => x.name.startsWith("Median value of owner-occupied homes"))
	const labelVariable = domain[labelIndex]
	labelVariable.isLabel = true

	const nominalVariable = domain.find((x) => x.name.startsWith("Charles River dummy variable"))
	nominalVariable.Algebra = {
		eq: jsEq,
		mul: (x, y) => x === y ? 1 : 0,
	}

	const trivialLearners = [
		{
			name: 'random',
			...Random.makeLearner({ domain }),
		},
		{
			name: 'average',
			...Average.makeLearner({ domain }),
		},
	]

	const baseLearners = [
		// ...trivialLearners,

		{
			name: 'linear regression',
			...LinearRegression.makeLearner({
				domain,
			}),
		},
		{
			name: 'linear regression (quadratic)',
			...LinearRegression.makeLearner({
				domain,
				degree: 2,
			}),
		},
		{
			name: 'linear regression (cubic)',
			...LinearRegression.makeLearner({
				domain,
				degree: 3,
			}),
		},
		{
			name: 'decision tree',
			...DecisionTree.makeLearner({
				domain,
				limit: (x) => x.splits === 15,
			}),
		},
		{
			name: 'k nearest neighbors',
			...KNearestNeighbors.makeLearner({
				domain,
				k: 3,
				fnAggregate: require('../src/k-nearest-neighbors/aggregate/weighted-average').aggregate,
			}),
		},
		{
			name: 'neural network',
			...NeuralNetwork.makeLearner({
				domain,
				layout: [ 5 ],
				activationFunction: require('../src/neural-network/activation-functions/logistic'),
				learningRate: 0.05,
				k: 100,
			}),
		},
	]

	const ensembleLearners = [
		//

		{
			name: 'random forest',
			...RandomForest.makeLearner({
				domain,
				makeBaseLearner: (options) => DecisionTree.makeLearner({
					// limit: (x) => x.splits === 1,
					...options,
				}),
				k: 20,
				fnAggregate: require('../src/ensemble/aggregate/average').aggregate,
			}),
		},
	]

	const learners = [
		...trivialLearners,
		...baseLearners,
		...ensembleLearners,
	].filter((x) => !filterList || filterList.includes(x.name))

	const K = learners.length
	const trainingScores = create(K, () => new Array(N))
	const testingScores = create(K, () => new Array(N))

	for (let i = 0; i < N; i++) {
		process.stdout.write(".")

		shuffle.$$$(samples)
		const { trainingSamples, testingSamples } = holdout(samples, 7 / 10)

		const scaler = new Scaler(domain)
		scaler.fit(trainingSamples)
		const scaledTrainingSamples = trainingSamples.map((sample) => scaler.map(sample))

		const T = testingSamples.length
		const scaledTestingSamples = new Array(T)
		const labels = new Array(T)
		for (let t = 0; t < T; t++) {
			const scaledTestingSample = scaler.map(testingSamples[t])
			labels[t] = scaledTestingSample[labelIndex]
			scaledTestingSample[labelIndex] = null
			scaledTestingSamples[t] = scaledTestingSample
		}

		for (let j = 0; j < K; j++) {
			const { train, predict } = learners[j]

			shuffle.$$$(scaledTrainingSamples)
			const model = await train(scaledTrainingSamples)

			const trainingEvaluation = new EvaluationForRegression()
			shuffle.$$$(scaledTrainingSamples)
			for (let t = 0; t < scaledTrainingSamples.length; t++) {
				const scaledTrainingSample = scaledTrainingSamples[t]
				const predicted = predict(model, scaledTrainingSample).value
				const actual = scaledTrainingSample[labelIndex]
				trainingEvaluation.addResult(actual, predicted)
			}
			trainingScores[j][i] = trainingEvaluation.rSquared()

			const testingEvaluation = new EvaluationForRegression()
			for (let t = 0; t < T; t++) {
				const scaledTestingSample = scaledTestingSamples[t]
				const predicted = predict(model, scaledTestingSample).value
				const actual = labels[t]
				testingEvaluation.addResult(actual, predicted)
			}
			testingScores[j][i] = testingEvaluation.rSquared()
		}
	}

	const f = (x) => x.toFixed(2)
	const p = (x) => f(x).padStart(5)
	console.log()
	for (let j = 0; j < K; j++) {
		const { name } = learners[j]

		trainingOutput: {
			const results = trainingScores[j]

			const mean = Stat.mean(results)
			process.stdout.write(`${p(mean)} `)

			if (results.length === 1) { break trainingOutput }

			const min = Math.min(...results)
			const max = Math.max(...results)
			const variance = Stat.sampleVariance(results)
			process.stdout.write(`±${f(variance)} (${f(min)}-${f(max)}) `)
		}

		testingOutput: {
			const results = testingScores[j]

			const mean = Stat.mean(results)
			process.stdout.write(`${p(mean)} `)

			if (results.length === 1) { break testingOutput }

			const min = Math.min(...results)
			const max = Math.max(...results)
			const variance = Stat.sampleVariance(results)
			process.stdout.write(`±${f(variance)} (${f(min)}-${f(max)}) `)
		}

		console.log(` ${name}`)
	}
})
