// @ts-check
const fs = require("fs");
const path = require("path");
const pm = require("picomatch");
const prettyms = import("pretty-ms");
const chalk = import("chalk");
const yaml = require("yaml");
const {merge} = require("merge");

const rootPath = path.dirname(__dirname);
const defaultCfgPath = path.join(rootPath, "sincer.yaml");
const version = 'v' + require(path.join(rootPath, 'package.json')).version

/**
 * @typedef RecordItem
 * @prop {string} name
 * @prop {string} locale
 * @prop {string} since
 */
/**
 * @typedef Config
 * @prop {RecordItem[]} records
 * @prop {number} count
 */

/**@type {Readonly<Config>}*/
const defaultCfg = Object.freeze({
	records: [],
	count: 0
});

function createRecord(name, date) {
	const d = date instanceof Date ? date : new Date(date);
	const record = {
		name,
		locale: d.toLocaleString(),
		since: d.toJSON()
	};
	return record;
}

/**
 * @param {RecordItem} record
 * @param {import("chalk").ForegroundColorName} [color]
 * @param {boolean} [dim]
 */
async function recordStr(record, color = "blue", dim = false) {
	const recordDate = new Date(record.since);
	const time = (new Date()).getTime() - recordDate.getTime();
	const {default: ms} = await prettyms;
	const {Chalk} = await chalk;
	const c = new Chalk();
	const clr = c[color]
	const d = clr('|')
	const str = `${clr('{')} ${record.name} ${d} ${ms(time)} ${d} ${c.gray(record.locale)} ${clr('}')}`;
	return dim ? c.dim(str) : str;
}

function isRecordItem(rec) {
	return typeof rec === "object" && rec !== null && !Array.isArray(rec)
		&& "name" in rec && typeof rec.name === "string" && isRecordName(rec.name)
		&& "since" in rec && typeof rec.since === "string" && isRecordSince(rec.since)
		&& "locale" in rec && typeof rec.locale === "string" && (new Date(rec.since).toLocaleString() === rec.locale);
}

function isRecordSince(since) {
	return (new Date(since).toString() !== 'Invalid Date')
}

function isRecordName(name) {
	try {pm(name); return true} catch {return false}
}

function isConfig(cfg) {
	return typeof cfg === "object" && cfg !== null && !Array.isArray(cfg) && "records" in cfg && Array.isArray(cfg.records) && cfg.records.every(isRecordItem) && "count" in cfg && typeof cfg.count === "number";
}

function isNameGeneratorTemplate(template) {
	return typeof template === "string" && /(?<!\\)\$0/.test(template);
}

class NameGenerator {

	/**
	 * @param {number} counter
	 * @param {string} template
	 */
	constructor(template, counter) {
		this.template = template;
		this.counter = counter;
	}

	get current() {
		if (!isNameGeneratorTemplate(this.template)) {
			throw new TypeError("'template' should be a string.");
		}
		return this.template
			.replace(/(?<!\\)\$0/g, String(this.counter))
			.replace(/\\(?=\$0)/g, "");
	}

	next() {
		this.counter++;
		return this;
	}

	prev() {
		if (this.counter === 1) {
			throw new Error("Name generator can not get the previous name. Counter minimal limit.");
		}
		this.counter--;
		return this;
	}
}

class Manager {
	path = defaultCfgPath;

	constructor(path2) {
		if (path2 !== void 0) {
			this.path = path2;
		}
	}

	/**@type {Config}*/
	cfg = merge(true, defaultCfg)
	cfgParseFromFile() {
		if (this.path === null || !this.cfgFileValid()) {
			throw new Error("Config is unreadable.");
		}
		return yaml.parse(fs.readFileSync(this.path).toString());
	}
	cfgLoadFromFile() {
		return this.cfg = merge({}, defaultCfg, this.cfgParseFromFile());
	}
	/**
	 * @param {Config} cfg
	 */
	cfgLoad(cfg) {
		if (!isConfig(cfg)) {
			throw new Error("Config is unoperable.");
		}
		return this.cfg = merge({}, defaultCfg, cfg);
	}
	cfgFileValid() {
		if (this.path === null)
			return false;
		const exists = fs.existsSync(this.path);
		if (!exists)
			return false;
		try {
			const doc = yaml.parse(fs.readFileSync(this.path).toString());
			return isConfig(doc);
		} catch {
			return false;
		}
	}
	/**
	 * @param {Config} [cfg]
	 */
	cfgString(cfg) {
		return yaml.stringify(cfg ?? this.cfg);
	}
	cfgSaveToFile() {
		if (this.path === null) {
			throw new Error("Manager is virtual.");
		}
		fs.writeFileSync(this.path, this.cfgString());
	}
	async printBadCfg() {
		return `bad configuration: '${this.path}'`;
	}
	async printRecord(record) {
		return await recordStr(record);
	}
	async printRecordExists(record) {
		return `'${record.name}' already exists: ${await recordStr(record, "green")}`;
	}
	async printRecordAdded(record) {
		return `added: ${await recordStr(record, "greenBright")}`;
	}
	async printRecordRemoved(record) {
		return `removed: ${await recordStr(record, "redBright")}`;
	}
	async printRecordChanged(record, old) {
		return `changed: ${await recordStr(old, "blueBright", true)} -> ${await recordStr(record, "blueBright")}`;
	}
	findRecordIndex(records, name) {
		const matcher = pm(name);
		return records.findIndex((record) => matcher(record.name));
	}
	findRecord(records, name) {
		const matcher = pm(name);
		return records.find((record) => matcher(record.name));
	}
	findRecordAll(records, name) {
		const matcher = pm(name);
		return records.filter((record) => matcher(record.name));
	}
	async showAll(name) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		const {records} = this.cfg;
		if (records.length === 0) {
			return 'no records'
		}
		if (typeof name === "string") {
			const filtEntries = this.findRecordAll(records, name);
			if (filtEntries.length === 0) {
				return 'no matches'
			}
			const list = []
			for (const record of filtEntries) {
				list.push(await this.printRecord(record));
			}
			return list.join('\n');
		}
		const list = []
		for (const record of records) {
			list.push(await this.printRecord(record));
		}
		return list.join('\n');
	}
	async add(name, options) {
		const {date, below} = options ?? {};
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		if (!isRecordName(name)) {
			throw new TypeError('name is invalid. see help');
		}
		if (!isRecordSince(date)) {
			throw new TypeError('date is invalid. see help');
		}
		const {records, count} = this.cfg;
		name ?? (name = new NameGenerator("timer-$0", count).next().current);
		this.cfg.count++;
		const similar = this.findRecord(records, name);
		if (similar) {
			throw new TypeError('can not add\n' + await this.printRecordExists(similar));
		}
		const record = createRecord(name, date || new Date());
		if (below)
			records.push(record);
		else
			records.unshift(record);
		this.cfgSaveToFile();

		return await this.printRecordAdded(record);
	}
	async swap(name, name2, mode) {
		mode ?? (mode = "names");
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		if (!isRecordName(name)) {
			throw new TypeError('name is invalid. see help')
		}
		if (!isRecordName(name2)) {
			throw new TypeError('second name is invalid. see help')
		}
		const {records} = this.cfg;
		const record = this.findRecord(records, name);
		if (!record) {
			throw new TypeError(`record '${name}' not found`)
		}
		const record2 = this.findRecord(records.filter((r) => r !== record), name2);
		if (!record2) {
			throw new TypeError(`second record '${name2}' not found`)
		}
		let message = ''
		if (mode === "names") {
			message += await this.printRecordChanged(record, merge(true, record, {name: record2.name})) + '\n';
			message += await this.printRecordChanged(record2, merge(true, record2, {name: record.name}));
			[record.name, record2.name] = [record2.name, record.name];
		} else if (mode === "places") {
			message += await this.printRecordChanged(record, record2) + '\n';
			message += await this.printRecordChanged(record2, record);
			const temp = {...record2};
			merge(record2, record);
			merge(record, temp);
		}
		this.cfgSaveToFile();
		message += '\nswap completed'
		return message;
	}
	async redate(name, newdate) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		if (!isRecordName(name)) {
			throw new TypeError('name is invalid. see help')
		}
		if (!isRecordSince(newdate)) {
			throw new TypeError('new date is invalid. see help');
		}
		const {records} = this.cfg;
		const record = this.findRecord(records, name);
		if (!record) {
			throw new TypeError(`record '${name}' not found`)
		}
		const newrecord = createRecord(name, newdate || new Date());
		let message = await this.printRecordChanged(newrecord, record);
		merge(record, newrecord);
		this.cfgSaveToFile();
		return message;
	}
	async rename(name, newname) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		if (!isRecordName(name)) {
			throw new TypeError('name is invalid. see help')
		}
		if (!isRecordName(newname)) {
			throw new TypeError('new name is invalid. see help')
		}
		if (name === newname) {
			throw new TypeError('new name is same')
		}
		const {records} = this.cfg;
		const recordIndex = this.findRecordIndex(records, name);
		const record = records[recordIndex];
		if (!record) {
			throw new TypeError(`record '${name}' not found`)
		}
		const similar = this.findRecord(records.slice(recordIndex + 1), name);
		if (similar) {
			throw new TypeError(`can not rename ${await recordStr(record)}\n${await this.printRecordExists(similar)}`)
		}
		const oldrecord = {...record};
		record.name = newname;
		this.cfgSaveToFile();
		return await this.printRecordChanged(record, oldrecord);;
	}
	async moveUp(name, count) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		count ?? (count = Infinity);
		const {records} = this.cfg;
		const recordIndex = this.findRecordIndex(records, name);
		const record = records[recordIndex];
		records.splice(recordIndex, 1);
		const recordNewIndex = Math.max(0, recordIndex - Math.max(0, count));
		records.splice(recordNewIndex, 0, record);
		this.cfgSaveToFile();
		return `moved up by ${recordIndex - recordNewIndex}`;
	}
	async moveDown(name, count) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		count ?? (count = Infinity);
		const {records} = this.cfg;
		const recordIndex = this.findRecordIndex(records, name);
		const record = records[recordIndex];
		records.splice(recordIndex, 1);
		const recordNewIndex = Math.min(records.length - 1, recordIndex + Math.max(0, count));
		records.splice(recordNewIndex, 0, record);
		this.cfgSaveToFile();
		return `moved down by ${recordNewIndex - recordIndex}`;
	}
	async remove(name) {
		if (!this.cfg) {
			throw new TypeError(await this.printBadCfg());
		}
		const {records} = this.cfg;
		if (records.length === 0) {
			throw new TypeError('no records')
		}
		if (!name || !this.findRecord(records, name)) {
			throw new TypeError(`records '${name}' not found`);
		}
		let list = []
		for (let recordIndex = this.findRecordIndex(records, name); recordIndex >= 0; recordIndex = this.findRecordIndex(records, name)) {
			list.push(await this.printRecordRemoved(records[recordIndex]))
			records.splice(recordIndex, 1);
		}
		let message = list.join('\n')
		this.cfgSaveToFile();
		return message;
	}
	async reset() {
		this.cfg = defaultCfg;
		this.cfgSaveToFile();
		return 'reset completed';
	}
}

module.exports = {
	version,
	defaultCfg,
	defaultCfgPath,
	rootPath,
	isNameGeneratorTemplate,
	isConfig,
	isRecordItem,
	isRecordName,
	NameGenerator,
	createRecord,
	recordStr,
	Manager,
};
