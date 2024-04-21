import * as chai from 'chai'
import {isNameGeneratorTemplate} from '../lib/index.js'

describe('Methods', function () {
	it('isNameGeneratorTemplate', function () {
		chai.assert.isFalse(isNameGeneratorTemplate('hello'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0'))
		chai.assert.isTrue(isNameGeneratorTemplate('$0hello'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0$0'))
		chai.assert.isTrue(isNameGeneratorTemplate('hello$0!'))
		chai.assert.isFalse(isNameGeneratorTemplate('hello\\$0'))
	})
})