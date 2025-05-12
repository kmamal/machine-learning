const Fs = require('node:fs')
const Path = require('node:path')
const JSON5 = require('json5')
const { loadCsv } = require('./load-csv')

const datasetsDir = Path.join(__dirname, '../../datasets')

const loadDataset = async (name) => {
	const datasetDir = Path.join(datasetsDir, name)

	const domainPath = Path.join(datasetDir, `${name}.domain`)
	const domainJson5 = await Fs.promises.readFile(domainPath, 'utf8')
	const domain = JSON5.parse(domainJson5)

	const dataPath = Path.join(datasetDir, `${name}.data`)
	const samples = await loadCsv(dataPath, domain)

	return { domain, samples }
}

module.exports = { loadDataset }
