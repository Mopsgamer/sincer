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
export const defaultCfg = Object.freeze({
	records: [],
	count: 0
})

export const rootPath = path.dirname(__dirname)
export const defaultCfgPath = path.join(rootPath, 'sincer.yaml')

export function isNameGeneratorTemplate(template) {
	return typeof template === 'string' && template.includes('$0')
}

export class NameGenerator {
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
export function createRecord(name, date) {
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
export async function recordStr(record, bgcolor = 'bgGray', fgcolor = 'gray', dim = false) {
	const recordDate = new Date(record.since)
	const time = new Date().getTime() - recordDate.getTime()
	const {default: ms} = await prettyms
	const {Chalk} = await chalk
	const c = new Chalk()
	const str = `${c[bgcolor].white(record.name)} ${c[fgcolor](record.locale)} ${ms(time)}`
	return dim ? c.dim(str) : str
}

export class Manager {

	/**@type {Sincer.ManagerData}*/
	data = {
		raw: undefined,
		isReadable(path = defaultCfgPath) {
			const exists = fs.existsSync(path)
			if (!exists) return false
			try {
				const doc = yaml.parse(fs.readFileSync(path).toString())
				return isDict(doc)
			} catch {
				return false
			}
		},
		readCfg(path = defaultCfgPath) {
			return this.isReadable(path) ? fs.readFileSync(path) : undefined
		},
		parseCfg(path = defaultCfgPath) {
			return this.isReadable(path) ? yaml.parse(fs.readFileSync(path).toString()) : undefined
		},
		loadCfg(path = defaultCfgPath) {
			return this.raw = merge({}, defaultCfg, this.parseCfg(path))
		},
		load(cfg = this.raw) {
			return this.raw = merge({}, defaultCfg, cfg)
		},
		string(cfg = this.raw) {
			return yaml.stringify(cfg)
		},
		save(path = defaultCfgPath) {
			fs.writeFileSync(path, this.string())
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
			return
		}
		const {records, count} = this.data.raw
		name ??= new NameGenerator('timer-$0', count).next().current
		this.data.raw.count++
		const similar = this.findRecord(records, name)
		if (similar) {
			console.log('can not add')
			this.printRecordExists(similar)
			return
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
	}

	swap(name, name2) {

	}

	async redate(name, newdate) {
		if (!this.data.raw) {
			this.printBadCfg()
			return
		}
		const {records} = this.data.raw
		const record = this.findRecord(records, name)
		if (!record) {
			console.log(`record '${name}' not found`)
			return
		}
		const newrecord = createRecord(name, newdate || new Date())
		await this.printRecordChanged(newrecord, record)
		merge(record, newrecord)
		this.data.save()
	}

	async rename(name, newname) {
		if (!this.data.raw) {
			this.printBadCfg()
			return
		}
		if (!newname) {
			console.log('bad new name')
			return
		}
		const {records} = this.data.raw
		const recordIndex = this.findRecordIndex(records, name)
		const record = records[recordIndex]
		if (!record) {
			console.log(`record '${name}' not found`)
			return
		}
		const similar = this.findRecord(records.slice(recordIndex + 1), name)
		if (similar) {
			console.log(`can not rename ${await recordStr(record)}`)
			this.printRecordExists(similar)
			return
		}
		const oldrecord = {...record}
		record.name = newname
		this.data.save()
		this.printRecordChanged(record, oldrecord)
	}

	async moveUp(name, count) {
		if (!this.data.raw) {
			this.printBadCfg()
			return
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
	}

	async moveDown(name, count) {
		if (!this.data.raw) {
			this.printBadCfg()
			return
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
	}

	async remove(name) {
		if (!this.data.raw) {
			this.printBadCfg()
			return
		}
		const {records} = this.data.raw
		if (records.length === 0) {
			console.log('no records')
			return
		}
		if (!name || !this.findRecord(records, name)) {
			console.log(`records '${name}' not found`)
			return
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
	}

	async reset() {
		this.data.raw = defaultCfg
		this.data.save()
		console.log(`reset completed`)
	}

}