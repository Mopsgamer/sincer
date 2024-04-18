#!/usr/bin/env node
const {program, Argument} = require('commander')
const {Manager} = require('.')

const sincer = new Manager()
sincer.data.loadCfg()

program.command('list')
	.aliases(['ls'])
	.argument('[name]', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('get list of records')
	.action((name) => {
		sincer.printAll(name)
	})
program.command('add')
	.aliases(['new', 'create'])
	.argument('[name]', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('create record')
	.option('--date [date]')
	.option('--below')
	.action((name, options) => {
		sincer.add(name, options)
	})
program.command('redate')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('[newdate]', 'date time string. example: \'04-13-2024 10:30:00\'. see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format')
	.description('set record date')
	.action((name, newdate) => {
		sincer.redate(name, newdate)
	})
program.command('rename')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('[newname]', 'string. glob pattern characters available')
	.description('set record name')
	.action((name, newname) => {
		sincer.rename(name, newname)
	})
program.command('swap')
	.addArgument(new Argument('<mode>', 'swap mode').choices(['places', 'names']))
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<name2>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('swap two records')
	.action((mode, name, name2) => {
		sincer.swap(name, name2, mode)
	})
program.command('up')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<count>', 'integer')
	.description('move record up')
	.action((name, count) => {
		sincer.moveUp(name, count)
	})
program.command('down')
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.argument('<count>', 'integer')
	.description('move record down')
	.action((name, count) => {
		sincer.moveDown(name, count)
	})
program.command('remove')
	.aliases(['rm'])
	.argument('<name>', 'glob pattern. see https://www.npmjs.com/package/picomatch#globbing-features')
	.description('delete records')
	.action((name) => {
		sincer.remove(name)
	})
program.command('reset')
	.description('reset all records and settings')
	.action(() => {
		sincer.reset()
	})
program.parse()