// @ts-check
//#region imports
import { join } from "path";
import pm from "picomatch";
import prettyms from "pretty-ms";
import tt from "text-table";
import chalk from "chalk";
import { merge } from "merge";
import { stripVTControlCharacters } from "util";
import os from "os";
import { createRequire } from "module";
import { Config, Types } from "@m234/config";
import * as yaml from "yaml";
//#endregion

//#region constants
export const version = "v" + createRequire(import.meta.url)('../package.json').version;
export const maxRecords = 200;
//#endregion

/**
 * @typedef RecordItem
 * @prop {string} name
 * @prop {string} since
 * @prop {number} count
 * @prop {string} color Hex color.
 *
 * @typedef {'normal'|'added'|'removed'} RowAction
 * @typedef {RecordItem & {action?: RowAction, ignored?: boolean}} RecordItemFormatted
 *
 * @typedef SincerConfig
 * @prop {RecordItem[]} records
 * @prop {number} count
 */

export function createRecord(name, date, color = "#ffffff", count = 0) {
  const d = date instanceof Date ? date : new Date(date);
  const record = {
    name,
    since: d.toJSON(),
    count,
    color,
  };
  return record;
}

/**
 * @param {RecordItemFormatted[]} recordList
 * @returns {string}
 */
export function recordListTable(recordList) {
  recordList = recordList.concat(); // clone
  const now = Date.now();
  const rows = [
    [" ", "#", "Name", "Since", "Date", "Resets"].map((s) =>
      s.trim() ? chalk.underline(s) : s
    ),
  ];
  /**@type {Record<RowAction, import("chalk").ChalkInstance>}*/
  const formatSwitch = {
    "normal": chalk,
    "added": chalk.green,
    "removed": chalk.red,
  };
  for (let recordIndex = 0; recordIndex < recordList.length; recordIndex++) {
    const record = recordList[recordIndex];
    const recordDate = new Date(record.since);
    const isRemoved = record.action === "removed";
    const f_ = formatSwitch[record.action ?? "normal"];
    const f = record.ignored ? f_.dim : f_;
    rows.push([
      chalk.hex(record.color)("■"),
      isRemoved ? "x" : recordIndex + 1,
      record.name,
      prettyms(now - recordDate.getTime()),
      recordDate.toLocaleString(),
      record.count,
    ].map((s) => f(s)));
    if (isRemoved) {
      recordList.splice(recordIndex, 1);
      recordIndex--;
    }
  }
  return tt(rows, { stringLength: (s) => stripVTControlCharacters(s).length });
}

//#region checkers
export function isRecordItem(rec) {
  return typeof rec === "object" && rec !== null && !Array.isArray(rec) &&
    "name" in rec && typeof rec.name === "string" && isRecordName(rec.name) &&
    "since" in rec && typeof rec.since === "string" && isRecordSince(rec.since);
}

export function isRecordSince(since) {
  return (new Date(since).toString() !== "Invalid Date");
}

export function isRecordName(name) {
  try {
    pm(name);
    return !/^[ud](\d+|max)$/.test(name);
  } catch {
    return false;
  }
}

export function isNameGeneratorTemplate(template) {
  return typeof template === "string" && /(?<!\\)\$0/.test(template);
}
//#endregion

const messages = {
  invalidTemplate: "'template' should be a string.",
  invalidConfig: "bad configuration",
  invalidName: "name is invalid",
  invalidNameSecond: "second name is invalid",
  invalidDate: "date is invalid",
  invalidDateNew: "new date is invalid",
  existsName: "record with this name already exists",
  succSwappedNames: "successfully swapped names",
  succSwappedPlaces: "successfully swapped places",
  succMoved: (direction, count) => `moved ${direction} by ${count}`,
  cantMove: (direction) => `can not move ${direction}`,
  invalidInteger: (varname) => `'${varname}' must be an integer`,
  invalidGreaterLess: (varname, greater, less) =>
    `'${varname}' must be greater than ${greater} and less than ${less}`,
};

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
      throw new Error(
        "Name generator can not get the previous name. Counter minimal limit.",
      );
    }
    this.counter--;
    return this;
  }
}

export class Exception extends Error { }

export const cfg =
  new Config({
    parser: yaml,
    path: join(os.homedir(), '.sincer'),
    type: Types.struct({
      properties: {
        records: Types.array({
          defaultVal: [],
          elementType: Types.struct({
            properties: {
              name: Types.string(),
              since: Types.string(),
              color: Types.string({defaultVal: '#ffffff'}),
              count: Types.integer({defaultVal: 0, min: 0})
            }
          })
        }),
        count: Types.integer({defaultVal: 0})
      }
    })
  })

export class Manager {
  recordMatch(pattern, name) {
    return pm(pattern)?.(name);
  }
  findRecordIndex(records, pattern) {
    const result = records.findIndex((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result !== -1) {
      return result;
    }
    return records.findIndex((record) =>
      this.recordMatch(pattern, record.name.toLowerCase())
    );
  }
  findRecord(records, pattern) {
    const result = records.find((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result) {
      return result;
    }
    return records.find((record) =>
      this.recordMatch(pattern, record.name.toLowerCase())
    );
  }
  findRecordAll(records, pattern) {
    const result = records.filter((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result.length > 0) {
      return result;
    }
    return records.filter((record) =>
      this.recordMatch(pattern, record.name.toLowerCase())
    );
  }
  //#region manipulate methods
  displayByName(name) {
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    if (records.length === 0) {
      return "no records";
    }
    if (typeof name !== "string") {
      return recordListTable(records);
    }
    const filtRecords = this.findRecordAll(records, name);
    if (filtRecords.length === 0) {
      return "no matches";
    }
    return recordListTable(filtRecords);
  }
  create(name, options) {
    const { date, below, color, count } = options ?? {};
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    const namecount = /**@type {number}*/(cfg.get('count'));
    if (records.length >= maxRecords) {
      throw new Exception(
        `you have reached the limit of ${maxRecords} records`,
      );
    }
    name ?? (name = new NameGenerator("timer-$0", namecount).next().current);
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordSince(date || new Date())) {
      throw new Exception(messages.invalidDate);
    }
    cfg.set('count', namecount + 1);
    const similar = this.findRecord(records, name);
    if (similar) {
      throw new Exception(messages.existsName);
    }
    const record = createRecord(name, date || new Date(), color, count);
    if (below) {
      records.push(record);
    } else {
      records.unshift(record);
    }
    cfg.save();
    /**@type {RecordItemFormatted[]}*/
    const recordsFm = structuredClone(records);
    recordsFm[below ? records.length - 1 : 0].action = "added";
    return recordListTable(recordsFm);
  }
  swap(name, name2, mode) {
    mode ?? (mode = "names");
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordName(name2)) {
      throw new Exception(messages.invalidNameSecond);
    }
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    const record = this.findRecord(records, name);
    if (!record) {
      throw new Exception(`record '${name}' not found`);
    }
    const record2 = this.findRecord(records.filter((r) => r !== record), name2);
    if (!record2) {
      throw new Exception(`second record '${name2}' not found`);
    }
    if (mode === "names") {
      [record.name, record2.name] = [record2.name, record.name];
      cfg.save()
      return messages.succSwappedNames;
    }
    // else
    const temp = structuredClone(record2);
    merge(record2, record);
    merge(record, temp);
    cfg.save();
    return messages.succSwappedPlaces;
  }
  change(name, options) {
    const { date, color, count } = options ?? {};
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordSince(date || new Date())) {
      throw new Exception(messages.invalidDateNew);
    }
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    const recordIndex = this.findRecordIndex(records, name);
    const record = records[recordIndex];
    if (!record) {
      throw new Exception(`record '${name}' not found`);
    }
    /**@type {RecordItemFormatted[]}*/
    const recordsFm = structuredClone(records);
    const recordFm = recordsFm[recordIndex]
    recordFm.action = "added";
    recordFm.color = color ?? record.color;
    record.count = count === "add" ? record.count + 1 : count ?? record.count;
    recordsFm.splice(recordIndex, 0, structuredClone(record));
    recordFm.action = "removed";
    record.since = date ?? record.since;
    record.color = color ?? record.color;
    record.since = date ?? record.since;
    record.count = count === "add" ? record.count + 1 : count ?? record.count;
    cfg.save();
    return recordListTable(recordsFm);
  }
  rename(name, newname) {
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordName(newname)) {
      throw new Exception("new name is invalid.");
    }
    if (name === newname) {
      throw new Exception("new name is same");
    }
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    const recordIndex = this.findRecordIndex(records, name);
    const record = records[recordIndex];
    if (!record) {
      throw new Exception(`record '${name}' not found`);
    }
    const similar = this.findRecord(records.slice(recordIndex + 1), name);
    if (similar) {
      throw new Exception(messages.existsName);
    }
    /**@type {RecordItemFormatted[]}*/
    const recordsFm = structuredClone(records);
    recordsFm[recordIndex].action = "added";
    recordsFm[recordIndex].name = newname;
    recordsFm.splice(recordIndex, 0, structuredClone(record));
    recordsFm[recordIndex].action = "removed";
    record.name = newname;
    cfg.save();
    return recordListTable(recordsFm);
  }
  /**
   * @param {string} name
   * @param {`${'u'|'d'}${number|'max'}`} move
   */
  moveDown(name, move) {
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    const index = this.findRecordIndex(records, name);
    const maxCountDown = records.length - index - 1;
    const maxCountUp = index;
    let count = 0;
    const sub = move.substring(1);
    if (move.startsWith("u")) {
      count = sub === "max" ? maxCountUp : -Number(move.substring(1));
    } else if (move.startsWith("d")) {
      count = sub === "max" ? maxCountDown : Number(move.substring(1));
    }
    //#region replacing
    /**@type {RecordItemFormatted[]}*/
    const recordsFm = structuredClone(records);
    const indexNew = Math.max(0, Math.min(index + count, records.length - 1));
    if (indexNew === index) {
      return recordListTable(recordsFm);
    }
    const record = records[index];
    recordsFm[index].action = "removed";
    records.splice(index, 1);
    records.splice(indexNew, 0, record);
    recordsFm.splice(indexNew + Number(indexNew > index), 0, record);
    recordsFm[indexNew + Number(indexNew > index)].action = "added";
    //#endregion
    cfg.save();
    return recordListTable(recordsFm);
  }
  remove(name) {
    if (!name) {
      cfg.unset()
      cfg.save()
      return "deleted config file";
    }
    const records = /**@type {RecordItem[]}*/(cfg.get('records'));
    if (records.length === 0) {
      throw new Exception("no records");
    }
    if (!name || !this.findRecord(records, name)) {
      throw new Exception(`records '${name}' not found`);
    }
    /**@type {RecordItemFormatted[]}*/
    const recordsFm = structuredClone(records);
    let counterRm = 0; // needed for right painting
    while (true) {
      const recordIndexRm = this.findRecordIndex(records, name);
      if (recordIndexRm < 0) break;
      recordsFm[recordIndexRm + counterRm].action = "removed";
      records.splice(recordIndexRm, 1);
      counterRm++;
    }
    cfg.save();
    return recordListTable(recordsFm);
  }
  //#endregion
}
//#endregion
