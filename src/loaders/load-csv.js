const Fs = require('node:fs')

const loadCsv = async (path, domain) => {
	const data = await Fs.promises.readFile(path, 'utf8')
	const lines = data.split('\n').filter(Boolean)
	const samples = lines.map((line) => {
		const row = line.split(',')
		for (let i = 0; i < domain.length; i++) {
			const variable = domain[i]
			if (variable === null) {
				row[i] = null
				continue
			}
			switch (variable.type) {
				case 'real': { row[i] = parseFloat(row[i]) } break
				case 'integer': { row[i] = parseInt(row[i], 10) } break
				case 'ordinal': { row[i] = variable.values.indexOf(row[i]) } break
				case 'nominal': break
				default: throw new Error("unknown type")
			}
		}
		return row
	})
	return samples
}

module.exports = { loadCsv }
