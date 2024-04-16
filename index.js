#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const ms = require('ms')
const {program} = require('commander')
const chalk = import('chalk')
const yaml = require('yaml')

const defaultData = {
	entries: [],
	count: 0
}

const data = {
	raw: null,
	file: path.join(__dirname, 'time-since-cli.yaml'),
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
	async entry(entry) {
		const entryDate = new Date(entry.since)
		const time = new Date() - entryDate
		const {Chalk} = await chalk
		const c = new Chalk()
		console.log(`${c.bgGreen(entry.name)} ${c.green(entry.locale)} ${ms(time)}`)
	},
	async all() {
		for (const entry of data.raw.entries) {
			await print.entry(entry)
		}
	}
}


function tempName(n) { return 'timer-' + n }

function createEntry (name, date) {
	const d = date instanceof Date ? date : new Date(date)
	const entry = {
		name: name ?? tempName(data.raw.count),
		locale: d.toLocaleString(),
		since: d.toJSON()
	}
	return entry
}
function findEntryIndex (name) {
	return data.raw.entries.findIndex(entry => entry.name === name)
}
function findEntry (name) {
	return data.raw.entries.find(entry => entry.name === name)
}

program.command('list')
.aliases(['ls'])
.action(() => {
	print.all()
})
program.command('add')
.aliases(['new', 'create'])
.option('--name [name]')
.option('--date [date]')
.option('--below')
.action(({name, date, below}) => {
	const {entries, count} = data.raw
	while (entries.some(entry => entry.name === tempName(count))) ++data.raw.count
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
.action((name, newdate) => {
	const entry = findEntry(name)
	Object.merge(entry, createEntry(name, newdate))
	print.all()
})
program.command('rename <name> [newname]')
.action((name, newname) => {
	const entry = findEntry(name)
	entry.name = newname
	print.all()
})
program.command('up <name> [count]')
.action((name, count) => {
	count ??= Infinity
	const entryIndex = findEntryIndex(name)
	const {entries} = data.raw
	const entry = entries[entryIndex]
	entries.splice(entryIndex, 1)
	entries.splice(Math.max(0, entryIndex - count), 0, entry)
	print.all()
})
program.command('down <name> [count]')
.action((name, count) => {
	count ??= Infinity
	const entryIndex = findEntryIndex(name)
	const {entries} = data.raw
	const entry = data.raw.entries[entryIndex]
	entries.splice(entryIndex, 1)
	entries.splice(Math.min(entries.length-1, entryIndex + count), 0, entry)
	print.all()
})
program.command('remove [name]')
.aliases(['rm'])
.action((name) => {
	const {entries} = data.raw
	if (name) {
		entries.splice(findEntryIndex(name), 1) 
	} else {
		entries.length = 0
	}
	data.save()
	print.all()
})
program.command('reset')
.aliases(['rs'])
.action((name) => {
        data.raw = defaultData
        data.save()
})
program.parse()
