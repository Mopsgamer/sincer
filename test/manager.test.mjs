import * as chai from 'chai'
import chaip from 'chai-as-promised'
import path from 'path'
import {Manager, maxRecords, rootPath} from '../lib/index.js'

chai.use(chaip)

const goodCfgPath = path.join(rootPath, 'sincer.test.yaml')

describe('Manager', function () {
	it('Limit', async function () {
		const sincer = new Manager(null)
		for (let i = 0; i < maxRecords; i++) {
			await sincer.add(String(i))
		}
		chai.assert.strictEqual(sincer.cfg.records.length, maxRecords)
		chai.assert.isRejected(sincer.add('newrecord'))
	})
	it('Actions', async function () {
		const sincer = new Manager(null)
		//#region showAll when empty
		await sincer.showAll()
		//#endregion
		//#region add
		await sincer.add('wantrename')
		await chai.assert.isRejected(sincer.add(''))
		await sincer.add('1')
		await chai.assert.isRejected(sincer.add('1'))
		await sincer.add('2', {})
		await sincer.add('3', 1)
		//#endregion
		//#region redate
		await chai.assert.isRejected(sincer.redate('unexistedname'))
		await sincer.redate('2')
		//#endregion
		//#region rename
		await chai.assert.isRejected(sincer.rename('unexistedname'))
		await sincer.rename('wantrename', '0')
		//#endregion
		//#region showAll
		await sincer.showAll()
		await sincer.showAll('sdbhfkjasbdhfkshb') // do not throw when no matches
		//#endregion
		//#region swap
		await sincer.swap('3', '2')
		await chai.assert.isRejected(sincer.swap('2', '2'))
		await sincer.swap('3', '2')
		//#endregion
		//#region moveDown
		await sincer.moveDown('3', 2)
		chai.assert.strictEqual('3', sincer.cfg.records[2].name)
		await sincer.moveDown('3', 'max')
		await chai.assert.isRejected(sincer.moveDown('3', 'max'))
		chai.assert.strictEqual('3', sincer.cfg.records[3].name)
		await chai.assert.isRejected(sincer.moveDown('1', 1e+6))
		//#endregion
		//#region moveUp
		await sincer.moveUp('3', 2)
		chai.assert.strictEqual('3', sincer.cfg.records[1].name)
		await sincer.moveUp('3', 'max')
		await chai.assert.isRejected(sincer.moveUp('3', 'max'))
		chai.assert.strictEqual('3', sincer.cfg.records[0].name)
		await chai.assert.isRejected(sincer.moveUp('1', 1e+6))
		//#endregion
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
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{name: '', since: ''}]})})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{name: 1, since: ''}]})})
			chai.assert.throws(function () {sincer.cfgLoad({count: 0, records: [{name: '', since: 1}]})})
			sincer.cfgLoad({count: 0, records: [{name: 'normal', since: new Date().toJSON()}]})
		})
	})
})