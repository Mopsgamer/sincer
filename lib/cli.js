const {program, Argument} = require('commander')
const {Manager, version} = require('./index.js')

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
	namestr: 'string',
	integer: 'integer',
	globFirst: 'glob pattern string. the first record on top. see https://www.npmjs.com/package/picomatch#globbing-features',
	globSet: 'glob pattern string. set of records. see https://www.npmjs.com/package/picomatch#globbing-features',
	date: 'date time string. example: \'04-13-2024 10:30:00\'. see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format'
}

program.version(version)

program.command('list')
	.aliases(['ls'])
	.argument('[name]', description.globSet)
	.description('print set of records')
	.action(function (name) {
		wrap(sincer.showAll(name))
	})
program.command('add')
	.aliases(['new', 'create'])
	.argument('[name]', description.namestr)
	.description('create new record')
	.option('--date [date]', description.date)
	.option('--below', 'add once from below, not from above')
	.action(function (name, options) {
		wrap(sincer.add(name, options))
	})
program.command('redate')
	.argument('<name>', description.globFirst)
	.argument('[newdate]', description.date)
	.description('change date for single record')
	.action(function (name, newdate) {
		wrap(sincer.redate(name, newdate))
	})
program.command('rename')
	.argument('<name>', description.globFirst)
	.argument('[newname]', description.namestr)
	.description('rename single record')
	.action(function (name, newname) {
		wrap(sincer.rename(name, newname))
	})
program.command('swap')
	.addArgument(new Argument('<mode>', 'swap mode').choices(['places', 'names']))
	.argument('<name>', description.globFirst)
	.argument('<name2>', description.globFirst)
	.description('swap two records (names or places)')
	.action(function (mode, name, name2) {
		wrap(sincer.swap(name, name2, mode))
	})
program.command('up')
	.argument('<name>', description.globFirst)
	.argument('<count>', description.integer)
	.description('move record up')
	.action(function (name, count) {
		wrap(sincer.moveUp(name, count))
	})
program.command('down')
	.argument('<name>', description.globFirst)
	.argument('<count>', description.integer)
	.description('move record down')
	.action(function (name, count) {
		wrap(sincer.moveDown(name, count))
	})
program.command('remove')
	.aliases(['rm'])
	.argument('<name>', description.globSet)
	.description('delete a couple of records')
	.action(function (name) {
		wrap(sincer.remove(name))
	})
program.command('reset')
	.description('reset all records and settings')
	.action(function () {
		wrap(sincer.reset())
	})

program.addHelpText('after', `

Sincer Resources
${'GitHub'.padStart(8)}: ${'https://github.com/Mopsgamer/sincer'}`)

module.exports = {
	program
}