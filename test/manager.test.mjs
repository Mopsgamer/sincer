import * as chai from 'chai'
import chaip from 'chai-as-promised'
import path from 'path'
import {Manager, rootPath} from '../lib/index.js'

chai.use(chaip)

const goodCfgPath = path.join(rootPath, 'sincer.test.yaml')

describe('Manager', function () {
	describe('Actions', function () {
		const sincer = new Manager(null)
		it('showAll empty', function () {
			chai.assert.isFulfilled(sincer.showAll('*'))
		})
		sincer.add('wantrename')
		it('add', function () {
			chai.assert.isRejected(sincer.add(''))
			chai.assert.isFulfilled(sincer.add('1'))
			chai.assert.isRejected(sincer.add('1'))
			chai.assert.isFulfilled(sincer.add('2', {}))
			chai.assert.isRejected(sincer.add('3', 1))
			chai.assert.isFulfilled(sincer.add('3', 1))
		})
		it('redate', function () {
			chai.assert.isRejected(sincer.redate('unexistedname'))
			chai.assert.isFulfilled(sincer.redate('2'))
		})
		it('rename', function () {
			chai.assert.isRejected(sincer.rename('unexistedname'))
			chai.assert.isFulfilled(sincer.rename('wantrename', '0'))
		})
		it('showAll', function () {
			chai.assert.isFulfilled(sincer.showAll())
			chai.assert.isFulfilled(sincer.showAll('*'))
		})
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