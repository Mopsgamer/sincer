#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const prettyms = import('pretty-ms')
const {program} = require('commander')
const chalk = import('chalk')
const yaml = require('yaml')

const defaultData = {
	entries: [],
	count: 0
}

const data = {
	raw: null,
	file: path.join(__dirname, 'sincer.yaml'),
	exists() {
		return fs.existsSync(this.file)
	},
	readBuff() {
		return this.exists() ? fs.readFileSync(this.file) : null
	},
	read() {
		return this.exists() ? yaml.parse(this.readBuff().toString()) : null
	},
	load() {
		return this.raw = this.read() ?? defaultData
	},
	string(val) {
		return yaml.stringify(val ?? this.raw)
	},
	save() {
		fs.writeFileSync(this.file, this.string())
	}
}
data.load()

const print = {
	/**
	 * @param {import('chalk').BackgroundColorName} bgcolor
	 * @param {import('chalk').ForegroundColorName} fgcolor
	 */
	async entryStr(entry, bgcolor = 'bgGray', fgcolor = 'gray', dim = false) {
		const entryDate = new Date(entry.since)
		const time = new Date() - entryDate
		const {default: ms} = await prettyms
		const {Chalk} = await chalk
		const c = new Chalk()
		const str = `${c[bgcolor].white(entry.name)} ${c[fgcolor](entry.locale)} ${ms(time)}`
		return dim ? c.dim(str) : str
	},
	async entry(entry) {
		console.log(await print.entryStr(entry))
	},
	async entryAdded(entry) {
		console.log(`added: ${await print.entryStr(entry, 'bgGreen', 'green')}`)
	},
	async entryRemoved(entry) {
		console.log(`removed: ${await print.entryStr(entry, 'bgRed', 'red')}`)
	},
	async entryChanged(entry, old) {
		console.log(`changed: ${await print.entryStr(entry, 'bgBlue', 'blue', true)} -> ${await print.entryStr(old, 'bgBlue', 'blue')}`)
	},
	async all() {
		if (data.raw.entries.length === 0) {
			console.log('no entries')
		}
		for (const entry of data.raw.entries) {
			await print.entry(entry)
		}
	}
}


function tempName(n) {return 'timer-' + n}

function createEntry(name, date) {
	const d = date instanceof Date ? date : new Date(date)
	const entry = {
		name: name ?? tempName(data.raw.count),
		locale: d.toLocaleString(),
		since: d.toJSON()
	}
	return entry
}
function findEntryIndex(name) {
	return data.raw.entries.findIndex(entry => entry.name === name)
}
function findEntry(name) {
	return data.raw.entries.find(entry => entry.name === name)
}

program.command('list')
	.aliases(['ls'])
	.description('list of entries')
	.action(() => {
		print.all()
	})
program.command('add [name]')
	.aliases(['new', 'create'])
	.description('create entry')
	.option('--date [date]')
	.option('--below')
	.action((name, {date, below}) => {
		const {entries, count} = data.raw
		++data.raw.count
		const d = date ? new Date(date) : new Date()
		const entry = createEntry(name, d)
		if (below)
			entries.push(entry)
		else
			entries.unshift(entry)
		data.save()
		print.all()
	})
program.command('redate <name> [newdate]')
	.description('set entry date')
	.action((name, newdate) => {
		const entry = findEntry(name)
		if (!entry) return
		const newentry = createEntry(name, newdate || new Date())
		for (const key in newentry) entry[key] = newentry[key]
		data.save()
		print.entryChanged(newentry, entry)
	})
program.command('rename <name> [newname]')
	.description('set entry name')
	.action((name, newname) => {
		const entry = findEntry(name)
		const oldentry = {...entry}
		entry.name = newname
		data.save()
		print.entryChanged(entry, oldentry)
	})
program.command('up <name> [count]')
	.description('move entry up')
	.action((name, count) => {
		count ??= Infinity
		const entryIndex = findEntryIndex(name)
		const {entries} = data.raw
		const entry = entries[entryIndex]
		entries.splice(entryIndex, 1)
		entries.splice(Math.max(0, entryIndex - count), 0, entry)
		data.save()
		console.log('moved up')
	})
program.command('down <name> [count]')
	.description('move entry down')
	.action((name, count) => {
		count ??= Infinity
		const entryIndex = findEntryIndex(name)
		const {entries} = data.raw
		const entry = data.raw.entries[entryIndex]
		entries.splice(entryIndex, 1)
		entries.splice(Math.min(entries.length - 1, entryIndex + count), 0, entry)
		data.save()
		console.log('moved up')
	})
program.command('remove [name]')
	.aliases(['rm'])
	.description('delete entries')
	.action((name) => {
		const {entries} = data.raw
		if (name) {
			for (let entryIndex = findEntryIndex(name); entryIndex >= 0; entryIndex = findEntryIndex(name)) {
				print.entryRemoved(entries[entryIndex])
				entries.splice(entryIndex, 1)
			}
		} else {
			entries.length = 0
			console.log('all removed')
		}
		data.save()
	})
program.command('reset')
	.aliases(['rs'])
	.description('reset all entries and settings')
	.action(() => {
		data.raw = defaultData
		data.save()
	})
program.parse()
