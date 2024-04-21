#!/usr/bin/env node
const {program, Argument} = require('commander')
const {Manager} = require('../lib')

const sincer = new Manager()
sincer.cfgLoadFromFile()

/**
 * @param {Promise<string>} promise
 */
function wrap(promise) {
	return promise
		.then(function logMessage(message = '') {
			console.log(message)
		})
		.catch(function logError(typeerror = new TypeError('')) {
			console.error(typeerror.message)
			process.exit(1)
		})
}

const description = {
	namestr : 'string. glob pattern characters available',
	integer : 'integer',
	glob:  'glob pattern string. see https://www.npmjs.com/package/picomatch#globbing-features',
	date: 'date time string. example: \'04-13-2024 10:30:00\'. see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format'
}

program.command('list')
	.aliases(['ls'])
	.argument('[name]', description.glob)
	.description('get list of records')
	.action(function (name) {
		wrap(sincer.showAll(name))
	})
program.command('add')
	.aliases(['new', 'create'])
	.argument('[name]', description.glob)
	.description('create record')
	.option('--date [date]', description.date)
	.option('--below')
	.action(function (name, options) {
		wrap(sincer.add(name, options))
	})
program.command('redate')
	.argument('<name>', description.glob)
	.argument('[newdate]', description.date)
	.description('set record date')
	.action(function (name, newdate) {
		wrap(sincer.redate(name, newdate))
	})
program.command('rename')
	.argument('<name>', description.glob)
	.argument('[newname]', description.namestr)
	.description('set record name')
	.action(function (name, newname) {
		wrap(sincer.rename(name, newname))
	})
program.command('swap')
	.addArgument(new Argument('<mode>', 'swap mode').choices(['places', 'names']))
	.argument('<name>', description.glob)
	.argument('<name2>', description.glob)
	.description('swap two records')
	.action(function (mode, name, name2) {
		wrap(sincer.swap(name, name2, mode))
	})
program.command('up')
	.argument('<name>', description.glob)
	.argument('<count>', description.integer)
	.description('move record up')
	.action(function (name, count) {
		wrap(sincer.moveUp(name, count))
	})
program.command('down')
	.argument('<name>', description.glob)
	.argument('<count>', description.integer)
	.description('move record down')
	.action(function (name, count) {
		wrap(sincer.moveDown(name, count))
	})
program.command('remove')
	.aliases(['rm'])
	.argument('<name>', description.glob)
	.description('delete records')
	.action(function (name) {
		wrap(sincer.remove(name))
	})
program.command('reset')
	.description('reset all records and settings')
	.action(function () {
		wrap(sincer.reset())
	})
program.parse()
