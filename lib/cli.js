import { program, Argument, InvalidArgumentError, InvalidOptionArgumentError } from 'commander'
import { Exception, Manager, version } from './index.js'
import { existsSync } from 'fs'
import chalk from 'chalk'

const sincer = new Manager()
if (!existsSync(sincer.path)) sincer.reset()
sincer.cfgLoadFromFile()

/**
 * @param {()=>string} cb
 */
function wrap(cb) {
	try {
		console.log(cb())
		return;
	} catch (exc) {
		if (exc instanceof Exception) {
			console.error(exc.message)
			return;
		}
		console.error(exc)
	}
}

function parseColor(arg = "") {
	const num = parseInt(arg, 16)
	if(!Number.isSafeInteger(num)) {
		throw new InvalidOptionArgumentError('bad hex value. try something like 0xff0000')
	}
	return num;
}

const description = {
	namestr: 'string',
	integer: 'integer',
	globFirst: 'glob pattern string. the first record on top. see https://www.npmjs.com/package/picomatch#globbing-features',
	globSet: 'glob pattern string. set of records. see https://www.npmjs.com/package/picomatch#globbing-features',
	date: 'date time string. example: \'04-13-2024 10:30:00\'. see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format',
	color: 'hex color',
}

program.version(version, '-v, --version')

program.command('list')
	.aliases(['ls'])
	.argument('[name]', description.globSet)
	.description('display record list')
	.action(function(name) {
		wrap(() => sincer.displayByName(name))
	})
program.command('create')
	.aliases(['new', 'add', 'make', 'start'])
	.argument('[name]', description.namestr)
	.description('create new record')
	.option('--date [date]', description.date)
	.option('--color [color]', description.color, parseColor)
	.option('--below', 'add once from below, not from above')
	.action(function(name, options) {
		wrap(() => sincer.create(name, options))
	})
program.command('change')
	.aliases(['ch', 'update', 'upd'])
	.argument('<name>', description.globFirst)
	.option('--date <date>', description.date)
	.option('--color <color>', description.color, parseColor)
	.description('set up the record')
	.action(function(name, options) {
		wrap(() => sincer.change(name, options))
	})
program.command('restart')
	.aliases(['rd', 'redate', 'rs'])
	.argument('<name>', description.globFirst)
	.description('change date for single record')
	.action(function(name) {
		wrap(() => sincer.change(name, {newdate: new Date()}))
	})
program.command('rename')
	.aliases(['rn'])
	.argument('<name>', description.globFirst)
	.argument('[newname]', description.namestr)
	.description('rename single record')
	.action(function(name, newname) {
		wrap(() => sincer.rename(name, newname))
	})
program.command('swap')
	.aliases(['sw'])
	.addArgument(new Argument('<mode>', 'swap mode').choices(['places', 'names']))
	.argument('<name>', description.globFirst)
	.argument('<name2>', description.globFirst)
	.description('swap two records (names or places)')
	.action(function(mode, name, name2) {
		wrap(() => sincer.swap(name, name2, mode))
	})
program.command('move')
	.argument('<name>', description.globFirst)
	.argument('<count>', `${description.integer}. should be prefixed with d(down) or u(up). No negative values. Can be umax and dmax`, (arg) => {
		if (!/^[ud](\d+|max)$/.test(arg)) {
			throw new InvalidArgumentError('should be u/d prefixed integer or max: u1 (up by 1), d5 (down by 5), dmax (move bottom)')
		}

		return arg
	})
	.description('move record up')
	.action(function (name, count) {
		wrap(() => sincer.moveDown(name, count))
	})
program.command('remove')
	.aliases(['rm'])
	.argument('<name>', description.globSet)
	.description('delete a couple of records')
	.action(function(name) {
		wrap(() => sincer.remove(name))
	})
program.command('reset')
	.description('reset all records and settings')
	.action(function() {
		wrap(() => sincer.reset())
	})

program.addHelpText('after', `
Resources:
${'GitHub'.padStart(8)}: ${chalk.blue('https://github.com/Mopsgamer/sincer')}`)

export {
	program
}
