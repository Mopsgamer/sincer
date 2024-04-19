import {Manager, rootPath} from '../lib/index.js'
import assert from 'assert'
import * as chai from 'chai'
import path from 'path'

const testCfgPath = path.join(rootPath, 'sincer.test.yaml')
const sincerNorm = new Manager(testCfgPath)
const sincerNormRaw = sincerNorm.data.raw

const sincerVirt = new Manager(null)
const sincerVirtRaw = sincerVirt.data.raw

it('Config loading', function () {
	describe('Norm manager', function () {
		assert.strictEqual(sincerNormRaw.records.length, 0)
	})
	describe('Virt manager', function () {
		assert.strictEqual(sincerVirtRaw.records.length, 0)
		chai.expect(sincerNorm.data.loadCfg()).to.be.an('object')
		chai.expect(sincerNorm.data.load()).to.be.an('object')
		chai.expect(sincerNorm.data.load({})).to.be.an('object')
	})
})

it('Actions', function () {
	describe('Norm manager', function () {
		assert.strictEqual(sincerNormRaw.records.length, 0)
	})
	describe('Virt manager', function () {
		assert.strictEqual(sincerVirtRaw.records.length, 0)
	})
})