const { loadDataset } = require('../src/loaders/load-dataset')
const { seed } = require('@kmamal/util/random/seed')
const { randInt } = require('@kmamal/util/random/rand-int')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../src/cross-validation/holdout')

const Random = require('../src/baseline/random')
const Majority = require('../src/baseline/majority')

const DecisionTree = require('../src/decision-tree')
const KNearestNeighbors = require('../src/k-nearest-neighbors/linear')
const NaiveBayes = require('../src/naive-bayes')
const NeuralNetwork = require('../src/neural-network')

const Bagging = require('../src/ensemble/bagging')
const Selection = require('../src/ensemble/selection')
const Stacking = require('../src/ensemble/stacking')
const Blending = require('../src/ensemble/blending')

const AdaBoost = require('../src/ensemble/boosting/ada-boost')
const RandomForest = require('../src/random-forest')

const { Evaluation } = require('../src/evaluation')
const { create } = require('@kmamal/util/array/create')
const Stat = require('@kmamal/statistics/summary')


const MAX_SEED = 1e3
const seedArg = process.argv[2]
const seedNum = seedArg
	? parseInt(seedArg, 10) % MAX_SEED
	: randInt(0, MAX_SEED)
console.log({ seedNum })
seed(seedNum / MAX_SEED)


loadDataset('iris').then(({ domain, samples }) => {
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
		// ...trivialLearners,
		{
			name: 'decision tree',
			...DecisionTree.makeLearner({
				domain,
				limit: (x) => x.splits === 3,
			}),
		},
		{
			name: 'k nearest neighbors',
			...KNearestNeighbors.makeLearner({
				domain,
				k: 3,
				fnAggregate: require('../src/k-nearest-neighbors/aggregate/majority').aggregate,
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
				activationFunction: require('../src/neural-network/activation-functions').logistic,
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
		...baseLearners,
		...ensembleLearners,
	]

	const N = 10
	const K = learners.length
	const allResults = create(K, () => new Array(N))


	for (let i = 0; i < N; i++) {
		process.stdout.write(".")

		shuffle.$$$(samples)
		const { trainingSamples, testingSamples } = holdout(samples, 7 / 10)

		for (let j = 0; j < K; j++) {
			shuffle.$$$(trainingSamples)

			const { train, predict } = learners[j]
			const model = train(trainingSamples)

			const evaluation = new Evaluation()
			for (const sample of testingSamples) {
				const predicted = predict(model, sample).value
				const actual = sample[labelIndex]
				evaluation.addResult(actual, predicted)
			}

			allResults[j][i] = evaluation.lift()
		}
	}

	console.log()
	for (let j = 0; j < K; j++) {
		const { name } = learners[j]
		const results = allResults[j]
		const min = Math.min(...results)
		const max = Math.max(...results)
		const mean = Stat.mean(results)
		const variance = Stat.sampleVariance(results)

		const f = (x) => x.toFixed(2).padStart(5)
		console.log(`${f(mean)} ±${f(variance)} (${f(min)}-${f(max)}) ${name}`)
	}
})
