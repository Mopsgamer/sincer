import * as chai from 'chai'
import chaip from 'chai-as-promised'
import path from 'path'
import {Manager, rootPath} from '../lib/index.js'

chai.use(chaip)

const goodCfgPath = path.join(rootPath, 'sincer.test.yaml')

describe('Manager', function () {
	it('Actions', async function () {
		const sincer = new Manager(null)
		// showAll empty
		await sincer.showAll()
		// add
		await sincer.add('wantrename')
		chai.assert.isRejected(sincer.add(''))
		await sincer.add('1')
		chai.assert.isRejected(sincer.add('1'))
		await sincer.add('2', {})
		await sincer.add('3', 1)
		// redate
		chai.assert.isRejected(sincer.redate('unexistedname'))
		await sincer.redate('2')
		// rename
		chai.assert.isRejected(sincer.rename('unexistedname'))
		await sincer.rename('wantrename', '0')
		// showAll
		await sincer.showAll()
		chai.assert.isRejected(sincer.showAll('sdbhfkjasbdhfkshb'))
		// swap
		await sincer.swap('3', '2')
		chai.assert.isRejected(sincer.swap('2', '2'))
		// move
		chai.assert.isRejected(sincer.swap('2', '2'))
		console.log(await sincer.showAll())
		await sincer.moveDown('3', 100)
		console.log(await sincer.showAll())
		chai.assert.strictEqual('3', sincer.cfg.records[3].name)
		await sincer.moveDown('3', 100)
		await sincer.moveDown('3', '100')
		chai.assert.isRejected(await sincer.moveDown('3', '10000000000000000000000000000000000000000000000000000000000000000000000000000000'))
	})
	describe('Config loading', function () {
		it('Normal manager', function () {
			const sincer = new Manager(goodCfgPath)
			chai.assert.strictEqual(sincer.cfg.records.length, 0)
		})
		it('Virtual manager', function () {
			const sincer = new Manager(null)
			chai.assert.strictEqual(sincer.cfg.records.length, 0)
			chai.assert.throws(function () {sincer.cfgSaveToFile()})
			chai.assert.throws(function () {sincer.cfgParseFromFile()})
			chai.assert.throws(function () {sincer.cfgLoadFromFile()})
			chai.assert.throws(function () {sincer.cfgLoad()})
			chai.assert.throws(function () {sincer.cfgLoad(null)})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: 1})})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{locale: 1, name: '', since: ''}]})})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{locale: '', name: 1, since: ''}]})})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{locale: '', name: '', since: 1}]})})
		})
	})
})