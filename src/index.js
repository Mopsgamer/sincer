//@ts-check
/**@typedef {import('../types/index.d.ts')} Sincer*/
const fs = require('fs')
const path = require('path')
const pm = require('picomatch')
const prettyms = import('pretty-ms')
const chalk = import('chalk')
const yaml = require('yaml')
const {merge} = require('merge')
const {default: isDict} = require('is-dict')


/**@type {Sincer.Config}*/
const defaultCfg = Object.freeze({
	records: [],
	count: 0
})


const rootPath = path.dirname(__dirname)
const defaultCfgPath = path.join(rootPath, 'sincer.yaml')

function isNameGeneratorTemplate(template) {
	return typeof template === 'string' && template.includes('$0')
}

class NameGenerator {
	/**
	 * @param {Sincer.NameGeneratorTemplate} template
	 * @param {number} counter
	*/
	constructor(template, counter) {
		this.template = template
		this.counter = counter
	}
	get current() {
		if (!isNameGeneratorTemplate(this.template)) {
			throw new TypeError('\'template\' should be a string.')
		}
		return this.template.replace('$0', String(this.counter))
	}
	next() {
		this.counter++
		return this
	}
	prev() {
		if (this.counter === 1) {
			throw new Error('Name generator can not get the previous name. Counter minimal limit.')
		}
		this.counter--
		return this
	}
}

/**
 * @param {string} name
 * @param {Date | string} date
 */
function createRecord(name, date) {
	const d = date instanceof Date ? date : new Date(date)
	/**@returns {Sincer.RecordItem}*/
	const record = {
		name: name,
		locale: d.toLocaleString(),
		since: d.toJSON()
	}
	return record
}

/**
 * @param {Sincer.RecordItem} record
 * @param {import('chalk').BackgroundColorName} bgcolor
 * @param {import('chalk').ForegroundColorName} fgcolor
 */
async function recordStr(record, bgcolor = 'bgGray', fgcolor = 'gray', dim = false) {
	const recordDate = new Date(record.since)
	const time = new Date().getTime() - recordDate.getTime()
	const {default: ms} = await prettyms
	const {Chalk} = await chalk
	const c = new Chalk()
	const str = `${c[bgcolor].white(record.name)} ${c[fgcolor](record.locale)} ${ms(time)}`
	return dim ? c.dim(str) : str
}

class Manager {

	/**
	 * @type {null | string}
	 */
	path = defaultCfgPath;

	/**
	 * @param {null | string} [path]
	 */
	constructor(path) {
		// path will be equal to defaultCfgPath if undefined.
		// If null, will not save the data on data.save().
		if (path !== undefined) {
			this.path = path
		}
	}

	/**@type {Sincer.ManagerData}*/
	data = {
		/**@type {Sincer.Config}*/
		raw: merge(true, defaultCfg),
		isReadable: () => {
			if (this.path === null) return false
			const exists = fs.existsSync(this.path)
			if (!exists) return false
			try {
				const doc = yaml.parse(fs.readFileSync(this.path).toString())
				return isDict(doc)
			} catch {
				return false
			}
		},
		readCfg: () => {
			if (this.path === null || !this.data.isReadable()) {
				throw new Error('Config is unreadable.')
			}
			return fs.readFileSync(this.path)
		},
		parseCfg: () => {
			if (this.path === null || !this.data.isReadable()) {
				throw new Error('Config is unreadable.')
			}
			return yaml.parse(fs.readFileSync(this.path).toString())
		},
		loadCfg: () => {
			return this.raw = merge({}, defaultCfg, this.data.parseCfg())
		},
		load: (cfg = this.raw) => {
			return this.raw = merge({}, defaultCfg, cfg)
		},
		string: (cfg = this.raw) => {
			return yaml.stringify(cfg)
		},
		save: () => {
			if (this.path === null) return;
			fs.writeFileSync(this.path, this.data.string())
		}
	}

	async printBadCfg() {
		console.log('Bad configuration')
	}

	async printRecord(record) {
		console.log(await recordStr(record))
	}
	async printRecordExists(record) {
		console.log(`'${record.name}' already exists: ${await recordStr(record, 'bgGreen', 'green')}`)
	}
	async printRecordAdded(record) {
		console.log(`added: ${await recordStr(record, 'bgGreenBright', 'greenBright')}`)
	}
	async printRecordRemoved(record) {
		console.log(`removed: ${await recordStr(record, 'bgRedBright', 'redBright')}`)
	}
	async printRecordChanged(record, old) {
		console.log(`changed: ${await recordStr(old, 'bgBlueBright', 'blueBright', true)} -> ${await recordStr(record, 'bgBlueBright', 'blueBright')}`)
	}
	async printAll(name) {
		if (!this.data.raw) {
			return
		}
		const {records} = this.data.raw
		if (records.length === 0) {
			console.log('no records')
			return
		}
		if (typeof name === 'string') {
			const filtEntries = this.findRecordAll(records, name)
			if (filtEntries.length === 0) {
				console.log('no matches')
			}
			for (const record of filtEntries) {
				await this.printRecord(record)
			}
			return
		}
		for (const record of records) {
			await this.printRecord(record)
		}
	}

	findRecordIndex(records, name) {
		const matcher = pm(name)
		return records.findIndex(record => matcher(record.name))
	}

	findRecord(records, name) {
		const matcher = pm(name)
		return records.find(record => matcher(record.name))
	}

	findRecordAll(records, name) {
		const matcher = pm(name)
		return records.filter(record => matcher(record.name))
	}

	async add(name, options) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		const {records, count} = this.data.raw
		name ??= new NameGenerator('timer-$0', count).next().current
		this.data.raw.count++
		const similar = this.findRecord(records, name)
		if (similar) {
			console.log('can not add')
			this.printRecordExists(similar)
			return false
		}
		const {date, below} = options ?? {};
		const d = date ? new Date(date) : new Date()
		const record = createRecord(name, d)
		if (below)
			records.push(record)
		else
			records.unshift(record)
		this.data.save()
		this.printRecordAdded(record)
		return true
	}

	async swap(name, name2, mode) {
		mode ??= 'names'
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		const {records} = this.data.raw
		const record = this.findRecord(records, name)
		if (!record) {
			console.log(`record '${name}' not found`)
			return false
		}
		const record2 = this.findRecord(records.filter(r => r !== record), name2)
		if (!record2) {
			console.log(`second record '${name2}' not found`)
			return false
		}
		if (mode === 'names') {
			await this.printRecordChanged(record, merge(true, record, {name: record2.name}));
			await this.printRecordChanged(record2, merge(true, record2, {name: record.name}));
			[record.name, record2.name] = [record2.name, record.name]
		} else if (mode === 'places') {
			await this.printRecordChanged(record, record2)
			await this.printRecordChanged(record2, record)
			const temp = {...record2}
			merge(record2, record)
			merge(record, temp)
		}
		this.data.save()
		console.log('swap completed')
		return true
	}

	async redate(name, newdate) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		const {records} = this.data.raw
		const record = this.findRecord(records, name)
		if (!record) {
			console.log(`record '${name}' not found`)
			return false
		}
		const newrecord = createRecord(name, newdate || new Date())
		await this.printRecordChanged(newrecord, record)
		merge(record, newrecord)
		this.data.save()
		return true
	}

	async rename(name, newname) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		if (!newname) {
			console.log('bad new name')
			return false
		}
		const {records} = this.data.raw
		const recordIndex = this.findRecordIndex(records, name)
		const record = records[recordIndex]
		if (!record) {
			console.log(`record '${name}' not found`)
			return false
		}
		const similar = this.findRecord(records.slice(recordIndex + 1), name)
		if (similar) {
			console.log(`can not rename ${await recordStr(record)}`)
			this.printRecordExists(similar)
			return false
		}
		const oldrecord = {...record}
		record.name = newname
		this.data.save()
		this.printRecordChanged(record, oldrecord)
		return true
	}

	async moveUp(name, count) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		count ??= Infinity
		const {records} = this.data.raw
		const recordIndex = this.findRecordIndex(records, name)
		const record = records[recordIndex]
		records.splice(recordIndex, 1)
		const recordNewIndex = Math.max(0, recordIndex - Math.max(0, count))
		records.splice(recordNewIndex, 0, record)
		this.data.save()
		console.log(`moved up by ${recordIndex - recordNewIndex}`)
		return true
	}

	async moveDown(name, count) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		count ??= Infinity
		const {records} = this.data.raw
		const recordIndex = this.findRecordIndex(records, name)
		const record = records[recordIndex]
		records.splice(recordIndex, 1)
		const recordNewIndex = Math.min(records.length - 1, recordIndex + Math.max(0, count))
		records.splice(recordNewIndex, 0, record)
		this.data.save()
		console.log(`moved down by ${recordNewIndex - recordIndex}`)
		return true
	}

	async remove(name) {
		if (!this.data.raw) {
			this.printBadCfg()
			return false
		}
		const {records} = this.data.raw
		if (records.length === 0) {
			console.log('no records')
			return false
		}
		if (!name || !this.findRecord(records, name)) {
			console.log(`records '${name}' not found`)
			return false
		}
		for (
			let recordIndex = this.findRecordIndex(records, name);
			recordIndex >= 0;
			recordIndex = this.findRecordIndex(records, name)
		) {
			this.printRecordRemoved(records[recordIndex])
			records.splice(recordIndex, 1)
		}
		this.data.save()
		return true
	}

	async reset() {
		this.data.raw = defaultCfg
		this.data.save()
		console.log(`reset completed`)
		return true
	}

}

module.exports = {
	defaultCfg,
	rootPath,
	defaultCfgPath,
	isNameGeneratorTemplate,
	NameGenerator,
	createRecord,
	recordStr,
	Manager
}