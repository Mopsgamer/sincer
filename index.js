#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const pm = require('picomatch')
const prettyms = import('pretty-ms')
const {program} = require('commander')
const chalk = import('chalk')
const yaml = require('yaml')
const merge = require('merge')

const defaultData = {
	records: [],
	count: 0
}

const data = {
	raw: null,
	file: path.join(__dirname, 'sincer.yaml'),
	exists() {
		return fs.existsSync(this.file)
	},
	readCfg() {
		return this.exists() ? fs.readFileSync(this.file) : null
	},
	parseCfg() {
		return this.exists() ? yaml.parse(this.readCfg().toString()) : null
	},
	loadCfg() {
		return this.raw = merge(this.parseCfg() ?? {}, defaultData)
	},
	load(cfg) {
		return this.raw = merge(cfg ?? {}, defaultData)
	},
	string(val) {
		return yaml.stringify(val ?? this.raw)
	},
	save() {
		fs.writeFileSync(this.file, this.string())
	}
}
data.loadCfg()

const print = {
	/**
	 * @param {import('chalk').BackgroundColorName} bgcolor
	 * @param {import('chalk').ForegroundColorName} fgcolor
	 */
	async recordStr(record, bgcolor = 'bgGray', fgcolor = 'gray', dim = false) {
		const recordDate = new Date(record.since)
		const time = new Date() - recordDate
		const {default: ms} = await prettyms
		const {Chalk} = await chalk
		const c = new Chalk()
		const str = `${c[bgcolor].white(record.name)} ${c[fgcolor](record.locale)} ${ms(time)}`
		return dim ? c.dim(str) : str
	},
	async record(record) {
		console.log(await print.recordStr(record))
	},
	async recordAdded(record) {
		console.log(`added: ${await print.recordStr(record, 'bgGreen', 'green')}`)
	},
	async recordRemoved(record) {
		console.log(`removed: ${await print.recordStr(record, 'bgRed', 'red')}`)
	},
	async recordChanged(record, old) {
		console.log(`changed: ${await print.recordStr(record, 'bgBlue', 'blue', true)} -> ${await print.recordStr(old, 'bgBlue', 'blue')}`)
	},
	async all(name) {
		if (data.raw.records.length === 0) {
			console.log('no records')
		}
		if (typeof name === 'string') {
			const filtEntries = findEntryAll(name)
			if (filtEntries.length === 0) {
				console.log('no matches')
			}
			for (const record of filtEntries) {
				await print.record(record)
			}
			return
		}
		for (const record of data.raw.records) {
			await print.record(record)
		}
	}
}


function tempName(n) {return 'timer-' + n}

function createEntry(name, date) {
	const d = date instanceof Date ? date : new Date(date)
	const record = {
		name: name ?? tempName(data.raw.count),
		locale: d.toLocaleString(),
		since: d.toJSON()
	}
	return record
}
function findEntryIndex(name) {
	const matcher = pm(name)
	return data.raw.records.findIndex(record => matcher(record.name))
}

function findEntry(name) {
	const matcher = pm(name)
	return data.raw.records.find(record => matcher(record.name))
}

function findEntryAll(name) {
	const matcher = pm(name)
	return data.raw.records.filter(record => matcher(record.name))
}

program.command('list [name]')
	.aliases(['ls'])
	.description('get list of records')
	.action((name) => {
		print.all(name)
	})
program.command('add [name]')
	.aliases(['new', 'create'])
	.description('create record')
	.option('--date [date]')
	.option('--below')
	.action((name, {date, below}) => {
		const {records, count} = data.raw
		++data.raw.count
		const d = date ? new Date(date) : new Date()
		const record = createEntry(name, d)
		if (below)
			records.push(record)
		else
			records.unshift(record)
		data.save()
		print.all()
	})
program.command('redate <name> [newdate]')
	.description('set record date')
	.action((name, newdate) => {
		const record = findEntry(name)
		if (!record) return
		const newrecord = createEntry(name, newdate || new Date())
		merge(record, newrecord)
		data.save()
		print.recordChanged(newrecord, record)
	})
program.command('rename <name> [newname]')
	.description('set record name')
	.action((name, newname) => {
		const record = findEntry(name)
		const oldrecord = {...record}
		record.name = newname
		data.save()
		print.recordChanged(record, oldrecord)
	})
program.command('up <name> [count]')
	.description('move record up')
	.action((name, count) => {
		count ??= Infinity
		const recordIndex = findEntryIndex(name)
		const {records} = data.raw
		const record = records[recordIndex]
		records.splice(recordIndex, 1)
		records.splice(Math.max(0, recordIndex - count), 0, record)
		data.save()
		console.log('moved up')
	})
program.command('down <name> [count]')
	.description('move record down')
	.action((name, count) => {
		count ??= Infinity
		const recordIndex = findEntryIndex(name)
		const {records} = data.raw
		const record = data.raw.records[recordIndex]
		records.splice(recordIndex, 1)
		records.splice(Math.min(records.length - 1, recordIndex + count), 0, record)
		data.save()
		console.log('moved up')
	})
program.command('remove [name]')
	.aliases(['rm'])
	.description('delete records')
	.action((name) => {
		const {records} = data.raw
		if (name) {
			for (let recordIndex = findEntryIndex(name); recordIndex >= 0; recordIndex = findEntryIndex(name)) {
				print.recordRemoved(records[recordIndex])
				records.splice(recordIndex, 1)
			}
		} else {
			records.length = 0
			console.log('all removed')
		}
		data.save()
	})
program.command('reset')
	.aliases(['rs'])
	.description('reset all records and settings')
	.action(() => {
		data.raw = defaultData
		data.save()
	})
	.command('counter')
program.parse()
