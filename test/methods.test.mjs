import * as chai from 'chai'
import {isNameGeneratorTemplate, isConfig, isRecordItem, isRecordName} from '../lib/index.js'

describe('Methods', function () {
	it('isNameGeneratorTemplate', function () {
		chai.assert.isFalse(isNameGeneratorTemplate('hello'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0'))
		chai.assert.isTrue(isNameGeneratorTemplate('$0hello'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0$0'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0!'))
		chai.assert.isFalse(isNameGeneratorTemplate('hello\\$0'))
	})
	it('isConfig', function () {
		chai.assert.isFalse(isConfig(0))
		chai.assert.isFalse(isConfig({}))
		chai.assert.isFalse(isConfig(null))
		chai.assert.isFalse(isConfig({records: {}, count: []}))
		chai.assert.isFalse(isConfig({records: [[]], count: 0}))
		chai.assert.isFalse(isConfig({records: [null], count: 0}))
		chai.assert.isTrue(isConfig({records: [], count: 0}))
	})
	it('isRecordItem', function () {
		chai.assert.isFalse(isRecordItem(0))
		chai.assert.isFalse(isRecordItem([]))
		chai.assert.isFalse(isRecordItem(null))
		chai.assert.isFalse(isRecordItem({}))
		chai.assert.isFalse(isRecordItem({name: 's'}))
		chai.assert.isFalse(isRecordItem({locale: 'a'}))
		chai.assert.isFalse(isRecordItem({since: 'd'}))
		const normLocale = new Date().toLocaleString()
		const normSince = new Date().toJSON()
		chai.assert.isFalse(isRecordItem({name: '', locale: normLocale, since: normSince}))
		chai.assert.isFalse(isRecordItem({name: 'normal', locale: '', since: normSince}))
		chai.assert.isFalse(isRecordItem({name: 'normal', locale: normLocale, since: ''}))
		chai.assert.isTrue(isRecordItem({name: 'normal', locale: normLocale, since: normSince}))
	})
	it('isRecordName', function () {
		chai.assert.isFalse(isRecordName(0))
		chai.assert.isFalse(isRecordName(''))
		chai.assert.isTrue(isRecordName('*'))
		chai.assert.isTrue(isRecordName('\0'))
		chai.assert.isTrue(isRecordName('normal'))
	})
})