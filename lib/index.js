// @ts-check
//#region imports
import { readFileSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import pm from "picomatch";
import prettyms from "pretty-ms";
import tt from "text-table";
import chalk from "chalk";
import { merge } from "merge";
import { fileURLToPath } from "url";
import { parse, stringify } from "yaml";
import { stripVTControlCharacters } from "util";
import os from "os";
//#endregion

//#region constants
export const rootPath = dirname(dirname(fileURLToPath(import.meta.url)));
export const defaultCfgPath = join(os.homedir(), ".sincer.yaml");
export const version = 'v' + JSON.parse(readFileSync(join(rootPath, 'package.json')).toString()).version
export const maxRecords = 200
//#endregion

/**
 * @typedef RecordItem
 * @prop {string} name
 * @prop {string} since
 * @prop {string} color Hex color.
 *
 * @typedef {'normal'|'added'|'removed'} RowAction
 * @typedef {RecordItem & {action?: RowAction, ignored?: boolean}} RecordItemFormatted
 *
 * @typedef Config
 * @prop {RecordItem[]} records
 * @prop {number} count
 */

/**@type {Readonly<Config>}*/
export const defaultCfg = Object.freeze({
	records: [],
	count: 0
});

export function createRecord(name, date, color = "#ffffff") {
	const d = date instanceof Date ? date : new Date(date);
	const record = {
		name,
		since: d.toJSON(),
		color,
	};
	return record;
}

/**
 * @param {Config} cfg
 */
export function normalConfig(cfg) {
	/**@type {Config}*/
	const ncfg = structuredClone(cfg)
	ncfg.records = ncfg.records.map(r => createRecord(r.name, r.since, r.color))
	return ncfg
}

/**
 * @param {RecordItemFormatted[]} recordList
 * @returns {string}
 */
export function recordListTable(recordList) {
	recordList = recordList.concat() // clone
	const now = Date.now()
	const rows = [[' ', '#', 'Name', 'Since', 'Date'].map(s => s.trim() ? chalk.underline(s) : s)]
	/**@type {Record<RowAction, import("chalk").ChalkInstance>}*/
	const formatSwitch = { 'normal': chalk, 'added': chalk.green, 'removed': chalk.red }
	for (let recordIndex = 0; recordIndex < recordList.length; recordIndex++) {
		const record = recordList[recordIndex]
		const recordDate = new Date(record.since)
		const isRemoved = record.action === 'removed'
		const f_ = formatSwitch[record.action ?? 'normal']
		const f = record.ignored ? f_.dim : f_;
		rows.push([
			chalk.hex(record.color)('■'),
			isRemoved ? 'x' : recordIndex + 1,
			record.name,
			prettyms(now - recordDate.getTime()),
			recordDate.toLocaleString()
		].map(s => f(s)))
		if (isRemoved) {
			recordList.splice(recordIndex, 1)
			recordIndex--
		}
	}
	return tt(rows, { stringLength: s => stripVTControlCharacters(s).length })
}

//#region checkers
export function isRecordItem(rec) {
	return typeof rec === "object" && rec !== null && !Array.isArray(rec)
		&& "name" in rec && typeof rec.name === "string" && isRecordName(rec.name)
		&& "since" in rec && typeof rec.since === "string" && isRecordSince(rec.since)
}

export function isRecordSince(since) {
	return (new Date(since).toString() !== 'Invalid Date')
}

export function isRecordName(name) {
	try { pm(name); return !/^[ud](\d+|max)$/.test(name) } catch { return false }
}

export function isConfig(cfg) {
	return typeof cfg === "object" && cfg !== null && !Array.isArray(cfg)
		&& "records" in cfg && Array.isArray(cfg.records) && cfg.records.length <= maxRecords && cfg.records.every(isRecordItem)
		&& "count" in cfg && typeof cfg.count === "number";
}

export function isNameGeneratorTemplate(template) {
	return typeof template === "string" && /(?<!\\)\$0/.test(template);
}
//#endregion

const messages = {
	invalidTemplate: '\'template\' should be a string.',
	invalidConfig: 'bad configuration',
	invalidName: 'name is invalid',
	invalidNameSecond: 'second name is invalid',
	invalidDate: 'date is invalid',
	invalidDateNew: 'new date is invalid',
	existsName: 'record with this name already exists',
	succSwappedNames: 'successfully swapped names',
	succSwappedPlaces: 'successfully swapped places',
	succMoved: (direction, count) => `moved ${direction} by ${count}`,
	cantMove: (direction) => `can not move ${direction}`,
	invalidInteger: (varname) => `'${varname}' must be an integer`,
	invalidGreaterLess: (varname, greater, less) => `'${varname}' must be greater than ${greater} and less than ${less}`,
}

//#region classes
export class NameGenerator {

	/**
	 * @param {number} counter
	 * @param {string} template
	 */
	constructor(template, counter) {
		if (!isNameGeneratorTemplate(template)) {
			throw new Exception(messages.invalidTemplate);
		}
		this.template = template;
		this.counter = counter;
	}

	get current() {
		return this.template
			.replace(/(?<!\\)\$0/g, String(this.counter)) // replace (no slash before)$0 with a number
			.replace(/\\(?=\$0)/g, ""); // replace \$0 with $0
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

export class Exception extends Error { }

export class Manager {
	path = defaultCfgPath;

	constructor(path2) {
		if (path2 !== void 0) {
			this.path = path2;
		}
	}

	//#region cfg
	/**@type {Config}*/
	cfg = merge(true, defaultCfg)
	cfgParseFromFile() {
		if (this.path === null || !this.cfgFileValid()) {
			throw new Error("Config is unreadable.");
		}
		/**@type {Config}*/
		const parsed = parse(readFileSync(this.path).toString());
		return normalConfig(parsed)
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
		return this.cfg = merge({}, defaultCfg, normalConfig(cfg));
	}
	cfgFileValid() {
		if (this.path === null)
			return false;
		const exists = existsSync(this.path);
		if (!exists)
			return false;
		try {
			const doc = parse(readFileSync(this.path).toString());
			return isConfig(doc);
		} catch {
			return false;
		}
	}
	/**
	 * @param {Config} [cfg]
	 */
	cfgString(cfg) {
		return stringify(cfg ?? this.cfg);
	}
	cfgSaveToFile() {
		if (this.path === null) {
			throw new Error("Manager is virtual.");
		}
		writeFileSync(this.path, this.cfgString());
	}
	//#endregion
	recordMatch(pattern, name) {
		return pm(pattern)(name)
	}
	findRecordIndex(records, pattern) {
		const result = records.findIndex((record) => this.recordMatch(pattern, record.name));
		if (result !== -1) {
			return result;
		}
		return records.findIndex((record) => this.recordMatch(pattern, record.name.toLowerCase()));
	}
	findRecord(records, pattern) {
		const result = records.find((record) => this.recordMatch(pattern, record.name));
		if (result) {
			return result;
		}
		return records.find((record) => this.recordMatch(pattern, record.name.toLowerCase()));
	}
	findRecordAll(records, pattern) {
		const result = records.filter((record) => this.recordMatch(pattern, record.name));
		if (result.length > 0) {
			return result;
		}
		return records.filter((record) => this.recordMatch(pattern, record.name.toLowerCase()));
	}
	//#region manipulate methods
	displayByName(name) {
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		const { records } = this.cfg;
		if (records.length === 0) {
			return 'no records'
		}
		if (typeof name !== "string") {
			return recordListTable(records);
		}
		const filtRecords = this.findRecordAll(records, name);
		if (filtRecords.length === 0) {
			return 'no matches'
		}
		return recordListTable(filtRecords);
	}
	create(name, options) {
		const { date, below, color } = options ?? {};
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		const { records, count } = this.cfg;
		if (records.length >= maxRecords) {
			throw new Exception(`you have reached the limit of ${maxRecords} records`);
		}
		name ?? (name = new NameGenerator("timer-$0", count).next().current);
		if (!isRecordName(name)) {
			throw new Exception(messages.invalidName);
		}
		if (!isRecordSince(date || new Date())) {
			throw new Exception(messages.invalidDate);
		}
		this.cfg.count++;
		const similar = this.findRecord(records, name);
		if (similar) {
			throw new Exception(messages.existsName);
		}
		const record = createRecord(name, date || new Date(), color);
		if (below) {
			records.push(record);
		} else {
			records.unshift(record);
		}
		if (this.path !== null)
			this.cfgSaveToFile();
		/**@type {RecordItemFormatted[]}*/
		const recordsFm = structuredClone(records)
		recordsFm[below ? records.length - 1 : 0].action = 'added'
		return recordListTable(recordsFm);
	}
	swap(name, name2, mode) {
		mode ?? (mode = "names");
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		if (!isRecordName(name)) {
			throw new Exception(messages.invalidName)
		}
		if (!isRecordName(name2)) {
			throw new Exception(messages.invalidNameSecond)
		}
		const { records } = this.cfg;
		const record = this.findRecord(records, name);
		if (!record) {
			throw new Exception(`record '${name}' not found`)
		}
		const record2 = this.findRecord(records.filter((r) => r !== record), name2);
		if (!record2) {
			throw new Exception(`second record '${name2}' not found`)
		}
		if (mode === "names") {
			[record.name, record2.name] = [record2.name, record.name];
			if (this.path !== null)
				this.cfgSaveToFile();
			return messages.succSwappedNames;
		}
		// else
		const temp = structuredClone(record2);
		merge(record2, record);
		merge(record, temp);
		if (this.path !== null)
			this.cfgSaveToFile();
		return messages.succSwappedPlaces;
	}
	change(name, options) {
		const { date, color } = options ?? {}
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		if (!isRecordName(name)) {
			throw new Exception(messages.invalidName)
		}
		if (!isRecordSince(date || new Date())) {
			throw new Exception(messages.invalidDateNew);
		}
		const { records } = this.cfg;
		const recordIndex = this.findRecordIndex(records, name);
		const record = records[recordIndex];
		if (!record) {
			throw new Exception(`record '${name}' not found`)
		}
		/**@type {RecordItemFormatted[]}*/
		const recordsFm = structuredClone(records)
		recordsFm[recordIndex].action = 'added'
		recordsFm[recordIndex].since = date ?? record.since
		recordsFm[recordIndex].color = color ?? record.color
		recordsFm.splice(recordIndex, 0, structuredClone(record))
		recordsFm[recordIndex].action = 'removed'
		record.since = date ?? record.since
		record.color = color ?? record.color
		if (this.path !== null)
			this.cfgSaveToFile();
		return recordListTable(recordsFm);
	}
	rename(name, newname) {
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		if (!isRecordName(name)) {
			throw new Exception(messages.invalidName)
		}
		if (!isRecordName(newname)) {
			throw new Exception('new name is invalid.')
		}
		if (name === newname) {
			throw new Exception('new name is same')
		}
		const { records } = this.cfg;
		const recordIndex = this.findRecordIndex(records, name);
		const record = records[recordIndex];
		if (!record) {
			throw new Exception(`record '${name}' not found`)
		}
		const similar = this.findRecord(records.slice(recordIndex + 1), name);
		if (similar) {
			throw new Exception(messages.existsName)
		}
		/**@type {RecordItemFormatted[]}*/
		const recordsFm = structuredClone(records)
		recordsFm[recordIndex].action = 'added'
		recordsFm[recordIndex].name = newname
		recordsFm.splice(recordIndex, 0, structuredClone(record))
		recordsFm[recordIndex].action = 'removed'
		record.name = newname;
		if (this.path !== null)
			this.cfgSaveToFile();
		return recordListTable(recordsFm);
	}
	/**
	 * @param {string} name
	 * @param {`${'u'|'d'}${number|'max'}`} move
	 */
	moveDown(name, move) {
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		const { records } = this.cfg;
		const index = this.findRecordIndex(records, name);
		const maxCountDown = records.length - index - 1;
		const maxCountUp = index;
		let count = 0
		const sub = move.substring(1)
		if (move.startsWith('u')) {
			count = sub === 'max' ? maxCountUp : -Number(move.substring(1))
		} else if (move.startsWith('d')) {
			count = sub === 'max' ? maxCountDown : Number(move.substring(1))
		}
		//#region replacing
		/**@type {RecordItemFormatted[]}*/
		const recordsFm = structuredClone(records)
		const indexNew = Math.max(0, Math.min(index + count, records.length - 1));
		if (indexNew === index) {
			return recordListTable(recordsFm);
		}
		const record = records[index];
		recordsFm[index].action = 'removed'
		records.splice(index, 1);
		records.splice(indexNew, 0, record);
		recordsFm.splice(indexNew + Number(indexNew > index), 0, record);
		recordsFm[indexNew + Number(indexNew > index)].action = 'added'
		//#endregion
		if (this.path !== null)
			this.cfgSaveToFile();
		return recordListTable(recordsFm);
	}
	remove(name) {
		if (!this.cfg) {
			throw new Exception(messages.invalidConfig);
		}
		const { records } = this.cfg;
		if (records.length === 0) {
			throw new Exception('no records')
		}
		if (!name || !this.findRecord(records, name)) {
			throw new Exception(`records '${name}' not found`);
		}
		/**@type {RecordItemFormatted[]}*/
		const recordsFm = structuredClone(records)
		let counterRm = 0 // needed for right painting
		while (true) {
			const recordIndexRm = this.findRecordIndex(records, name);
			if (recordIndexRm < 0) break;
			recordsFm[recordIndexRm + counterRm].action = 'removed'
			records.splice(recordIndexRm, 1);
			counterRm++;
		}
		if (this.path !== null)
			this.cfgSaveToFile();
		return recordListTable(recordsFm);
	}
	reset() {
		this.cfg = defaultCfg;
		if (this.path !== null)
			this.cfgSaveToFile();
		return 'reset completed';
	}
	//#endregion
}
//#endregion
