const { loadDataset } = require('../src/loaders/load-dataset')
const { seed } = require('@kmamal/util/random/seed')
const { randInt } = require('@kmamal/util/random/rand-int')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../src/cross-validation/holdout')
const { Scaler } = require('../src/scaling/dummy')

const Random = require('../src/baseline/random')
const Majority = require('../src/baseline/majority')

const KNearestNeighbors = require('../src/k-nearest-neighbors/linear')
const LogisticRegression = require('../src/logistic-regression')
const DecisionTree = require('../src/decision-tree')
const NaiveBayes = require('../src/naive-bayes')
const NeuralNetwork = require('../src/neural-network')

const Bagging = require('../src/ensemble/bagging')
const Selection = require('../src/ensemble/selection')
const Stacking = require('../src/ensemble/stacking')
const Blending = require('../src/ensemble/blending')

const AdaBoost = require('../src/ensemble/boosting/ada-boost')
const RandomForest = require('../src/random-forest')

const { EvaluationForClassification } = require('../src/evaluation-for-classification')
const { create } = require('@kmamal/util/array/create')
const Stat = require('@kmamal/statistics/summary')


const args = Object.fromEntries(process.argv.slice(2).map((x) => x.split('=')))

const MAX_SEED = 1e3
const seedNum = args.seed
	? parseInt(args.seed, 10) % MAX_SEED
	: randInt(0, MAX_SEED)
console.error({ seedNum })
seed(seedNum / MAX_SEED)

const filterList = args.only?.split(',').map((x) => new RegExp(x, 'u'))

const N = args.n ?? 10


loadDataset('iris').then(async ({ domain, samples }) => {
	const labelIndex = domain.findIndex((variable) => variable.name === 'class')
	const labelVariable = domain[labelIndex]
	labelVariable.isLabel = true

	const trivialLearners = [
		{
			name: 'random',
			...Random.makeLearner({ domain }),
		},
		{
			name: 'majority',
			...Majority.makeLearner({ domain }),
		},
	]

	const baseLearners = [
		{
			name: 'k nearest neighbors',
			...KNearestNeighbors.makeLearner({
				domain,
				k: 3,
				fnAggregate: require('../src/k-nearest-neighbors/aggregate/majority').aggregate,
			}),
		},
		{
			name: 'logistic regression',
			...LogisticRegression.makeLearner({
				domain,
				ridgeNormalizationStrength: 1e-3,
			}),
		},
		{
			name: 'decision tree',
			...DecisionTree.makeLearner({
				domain,
				limit: (x) => x.splits === 3,
			}),
		},
		{
			name: 'naive bayes',
			...NaiveBayes.makeLearner({
				domain,
			}),
		},
		{
			name: 'neural network',
			...NeuralNetwork.makeLearner({
				domain,
				layout: [ 5 ],
				activationFunction: require('../src/neural-network/activation-functions/logistic'),
				learningRate: 0.5,
				k: 100,
			}),
		},
	]

	const ensembleLearners = [
		...baseLearners.map((baseLearner) => ({
			name: `bagging ${baseLearner.name}`,
			...Bagging.makeLearner({
				baseLearner,
				k: 10,
				fnAggregate: require('../src/ensemble/aggregate/majority').aggregate,
			}),
		})),
		{
			name: 'selection',
			...Selection.makeLearner({
				domain,
				baseLearners,
				k: 10,
			}),
		},
		{
			name: 'stacking',
			...Stacking.makeLearner({
				domain,
				baseLearners,
				makeMetaLearner: (options) => DecisionTree.makeLearner({
					...options,
					limit: (x) => x.splits === 3,
				}),
				k: 10,
			}),
		},
		{
			name: 'blending',
			...Blending.makeLearner({
				domain,
				baseLearners,
				makeMetaLearner: (options) => DecisionTree.makeLearner({
					...options,
					limit: (x) => x.splits === 3,
				}),
				k: 10,
			}),
		},
		{
			name: 'ada boost',
			...AdaBoost.makeLearner({
				domain,
				baseLearner: DecisionTree.makeLearner({
					domain,
					limit: (x) => x.size === 1,
				}),
				k: 50,
				fnAggregate: require('../src/ensemble/aggregate/weighted-majority').aggregate,
			}),
		},
		{
			name: 'random forest',
			...RandomForest.makeLearner({
				domain,
				makeBaseLearner: (options) => DecisionTree.makeLearner({
					// limit: (x) => x.splits === 1,
					...options,
				}),
				k: 20,
				fnAggregate: require('../src/ensemble/aggregate/majority').aggregate,
			}),
		},
	]

	const learners = [
		// ...trivialLearners,
		...baseLearners,
		...ensembleLearners,
	].filter((x) => !filterList || filterList.some((p) => p.test(x.name)))

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

		const V = testingSamples.length
		const scaledTestingSamples = new Array(V)
		const labels = new Array(V)
		for (let t = 0; t < V; t++) {
			const scaledTestingSample = scaler.map(testingSamples[t])
			labels[t] = scaledTestingSample[labelIndex]
			scaledTestingSample[labelIndex] = null
			scaledTestingSamples[t] = scaledTestingSample
		}

		for (let j = 0; j < K; j++) {
			const { train, predict } = learners[j]

			shuffle.$$$(scaledTrainingSamples)
			const model = await train(scaledTrainingSamples)

			const trainingEvaluation = new EvaluationForClassification()
			shuffle.$$$(scaledTrainingSamples)
			for (let t = 0; t < scaledTrainingSamples.length; t++) {
				const scaledTrainingSample = scaledTrainingSamples[t]
				const predicted = predict(model, scaledTrainingSample).value
				const actual = scaledTrainingSample[labelIndex]
				trainingEvaluation.addResult(actual, predicted)
			}
			trainingScores[j][i] = trainingEvaluation.lift()

			const testingEvaluation = new EvaluationForClassification()
			for (let t = 0; t < scaledTestingSamples.length; t++) {
				const scaledTestingSample = scaledTestingSamples[t]
				const predicted = predict(model, scaledTestingSample).value
				const actual = labels[t]
				testingEvaluation.addResult(actual, predicted)
			}
			testingScores[j][i] = testingEvaluation.lift()
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
