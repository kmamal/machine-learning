const { loadCsv } = require('../src/loaders/load-csv')
const { shuffle } = require('@kmamal/util/random/shuffle')
const { holdout } = require('../src/cross-validation/holdout')

const domain = [
	{ type: 'real', name:  },

	{ type: 'integer' },
	{ type: 'ordinal' },
	{ type: 'nominal' },
]

loadCsv('datasets/boston/boston.data', domain).then((samples) => {

})
