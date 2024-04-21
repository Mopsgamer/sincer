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

program.command('list')
	.aliases(['ls'])
	.argument('[name]', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('get list of records')
	.action(function (name) {
		wrap(sincer.showAll(name))
	})
program.command('add')
	.aliases(['new', 'create'])
	.argument('[name]', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('create record')
	.option('--date [date]')
	.option('--below')
	.action(function (name, options) {
		wrap(sincer.add(name, options))
	})
program.command('redate')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('[newdate]', 'date time string. example: \'04-13-2024 10:30:00\'. see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format')
	.description('set record date')
	.action(function (name, newdate) {
		wrap(sincer.redate(name, newdate))
	})
program.command('rename')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('[newname]', 'string. glob pattern characters available')
	.description('set record name')
	.action(function (name, newname) {
		wrap(sincer.rename(name, newname))
	})
program.command('swap')
	.addArgument(new Argument('<mode>', 'swap mode').choices(['places', 'names']))
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<name2>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('swap two records')
	.action(function (mode, name, name2) {
		wrap(sincer.swap(name, name2, mode))
	})
program.command('up')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<count>', 'integer')
	.description('move record up')
	.action(function (name, count) {
		wrap(sincer.moveUp(name, count))
	})
program.command('down')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<count>', 'integer')
	.description('move record down')
	.action(function (name, count) {
		wrap(sincer.moveDown(name, count))
	})
program.command('remove')
	.aliases(['rm'])
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
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
