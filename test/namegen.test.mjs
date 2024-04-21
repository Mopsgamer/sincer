import * as chai from 'chai'
import {NameGenerator} from '../lib/index.js'

it('NameGenerator', function () {
	const ng = new NameGenerator('\\$0-template$0', 1)
	chai.assert.strictEqual(ng.current, '$0-template1')
	chai.assert.strictEqual(ng.next().current, '$0-template2')
})