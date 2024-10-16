// @ts-check
//#region imports
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pm from "npm:picomatch@latest";
import prettyms from "npm:pretty-ms";
import tt from "npm:text-table";
import chalk, { type ChalkInstance } from "npm:chalk";
import { merge } from "npm:merge";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "npm:yaml";
import { stripVTControlCharacters } from "node:util";
import os from "node:os";
import { isDate } from "node:util/types";
//#endregion

//#region constants
export const rootPath = dirname(dirname(fileURLToPath(import.meta.url)));
export const defaultCfgPath = join(os.homedir(), ".sincer.yaml");
export const maxRecords = 200;
//#endregion

export type RecordOptions = {
  date?: string;
  below?: boolean;
  color?: string;
};

export type RecordItem = {
  name: string;
  since: Date;
  /**
   * Hex color.
   */
  color: string;
};

export type RecordItemJson = {
  name: string;
  since: string;
  /**
   * Hex color.
   */
  color: string;
};
export type RowAction = "normal" | "added" | "removed";
export type RecordItemFormatted = RecordItem & {
  action?: RowAction;
  ignored?: boolean;
};

export type Config = {
  records: RecordItem[];
  count: number;
};

export type ConfigJson = {
  records: RecordItemJson[];
  count: number;
};

export const defaultCfg: Readonly<Config> = Object.freeze({
  records: [],
  count: 0,
});

export function createRecord(
  name: string,
  date?: Date | string | number,
  color = "#ffffff",
): RecordItem {
  return {
    name,
    since: new Date(date ?? Date.now()),
    color,
  };
}

export function normalConfig(cfg: ConfigJson | Config) {
  const ncfg = structuredClone(cfg);
  ncfg.records = ncfg.records.map((r) =>
    createRecord(r.name, r.since, r.color)
  );
  return ncfg;
}

export function recordListTable(recordList: RecordItemFormatted[]): string {
  recordList = structuredClone(recordList);
  const now = Date.now();
  const rows = [
    [" ", "#", "Name", "Since", "Date"].map((s) =>
      s.trim() ? chalk.underline(s) : s
    ),
  ];
  const formatSwitch: Record<RowAction, ChalkInstance> = {
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
    ].map((s) => f(s)));
    if (isRemoved) {
      recordList.splice(recordIndex, 1);
      recordIndex--;
    }
  }
  return tt(rows, {
    stringLength: (s: string) => stripVTControlCharacters(s).length,
  });
}

//#region checkers
export function isRecordItem(rec: unknown): rec is RecordItem {
  return typeof rec === "object" && rec !== null && !Array.isArray(rec) &&
    "name" in rec && typeof rec.name === "string" && isRecordName(rec.name) &&
    "since" in rec && typeof rec.since === "string" && isRecordSince(rec.since);
}

export function isRecordSince(since: unknown): since is Date {
  if (
    typeof since !== "string" && typeof since !== "number" && !isDate(since)
  ) {
    return false;
  }
  return (new Date(since).toString() !== "Invalid Date");
}

export function isRecordName(name: unknown): name is string {
  if (typeof name !== "string") {
    return false;
  }
  try {
    pm(name);
    return !/^[ud](\d+|max)$/.test(name);
  } catch {
    return false;
  }
}

export function isConfig(cfg: unknown): cfg is Config {
  return typeof cfg === "object" && cfg !== null && !Array.isArray(cfg) &&
    "records" in cfg && Array.isArray(cfg.records) &&
    cfg.records.length <= maxRecords && cfg.records.every(isRecordItem) &&
    "count" in cfg && typeof cfg.count === "number";
}

export function isNameGeneratorTemplate(template: unknown): template is string {
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
  succMoved: (direction: string, count: number) =>
    `moved ${direction} by ${count}`,
  cantMove: (direction: string) => `can not move ${direction}`,
  invalidInteger: (varname: string) => `'${varname}' must be an integer`,
  invalidGreaterLess: (varname: string, greater: number, less: number) =>
    `'${varname}' must be greater than ${greater} and less than ${less}`,
};

//#region classes
export class NameGenerator {
  constructor(public template: string, public counter: number) {
    if (!isNameGeneratorTemplate(template)) {
      throw new Exception(messages.invalidTemplate);
    }
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

export class Exception extends Error {}

export class Manager {
  constructor(public path: string = defaultCfgPath) {
  }

  //#region cfg
  private cfg: Config = merge(true, defaultCfg);
  cfgParseFromFile() {
    if (this.path === null || !this.cfgFileValid()) {
      throw new Error("Config is unreadable.");
    }
    const parsed: ConfigJson = parse(readFileSync(this.path).toString());
    return normalConfig(parsed);
  }
  cfgLoadFromFile() {
    return this.cfg = merge({}, defaultCfg, this.cfgParseFromFile());
  }
  cfgLoad(cfg: Config) {
    if (!isConfig(cfg)) {
      throw new Error("Config is unoperable.");
    }
    return this.cfg = merge({}, defaultCfg, normalConfig(cfg));
  }
  cfgFileValid() {
    if (this.path === null) {
      return false;
    }
    const exists = existsSync(this.path);
    if (!exists) {
      return false;
    }
    try {
      const doc = parse(readFileSync(this.path).toString());
      return isConfig(doc);
    } catch {
      return false;
    }
  }

  cfgString(cfg?: Config): string {
    return stringify(cfg ?? this.cfg);
  }
  cfgSaveToFile() {
    if (this.path === null) {
      throw new Error("Manager is virtual.");
    }
    writeFileSync(this.path, this.cfgString());
  }
  //#endregion
  recordMatch(pattern: string, name: string) {
    return pm(pattern)(name);
  }
  findRecordIndex(records: RecordItem[], pattern: string) {
    const result = records.findIndex((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result !== -1) {
      return result;
    }
    return records.findIndex((record) =>
      this.recordMatch(pattern.toLowerCase(), record.name.toLowerCase())
    );
  }
  findRecord(records: RecordItem[], pattern: string) {
    const result = records.find((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result) {
      return result;
    }
    return records.find((record) =>
      this.recordMatch(pattern.toLowerCase(), record.name.toLowerCase())
    );
  }
  findRecordAll(records: RecordItem[], pattern: string) {
    const result = records.filter((record) =>
      this.recordMatch(pattern, record.name)
    );
    if (result.length > 0) {
      return result;
    }
    return records.filter((record) =>
      this.recordMatch(pattern.toLowerCase(), record.name.toLowerCase())
    );
  }
  //#region manipulate methods
  displayByName(name: string) {
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    const { records } = this.cfg;
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
  create(name: string, options?: RecordOptions) {
    const { date, below, color } = options ?? {};
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    const { records, count } = this.cfg;
    if (records.length >= maxRecords) {
      throw new Exception(
        `you have reached the limit of ${maxRecords} records`,
      );
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
    const record = createRecord(name, date, color);
    if (below) {
      records.push(record);
    } else {
      records.unshift(record);
    }
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    const recordsFm: RecordItemFormatted[] = structuredClone(records);
    recordsFm[below ? records.length - 1 : 0].action = "added";
    return recordListTable(recordsFm);
  }
  swap(name: string, name2: string, mode: "names") {
    mode ?? (mode = "names");
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordName(name2)) {
      throw new Exception(messages.invalidNameSecond);
    }
    const { records } = this.cfg;
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
      if (this.path !== null) {
        this.cfgSaveToFile();
      }
      return messages.succSwappedNames;
    }
    // else
    const temp = structuredClone(record2);
    merge(record2, record);
    merge(record, temp);
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return messages.succSwappedPlaces;
  }
  change(name: string, options: Omit<RecordOptions, "below">) {
    const { date, color } = options ?? {};
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    if (!isRecordName(name)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordSince(date || new Date())) {
      throw new Exception(messages.invalidDateNew);
    }
    const { records } = this.cfg;
    const recordIndex = this.findRecordIndex(records, name);
    const record = records[recordIndex];
    if (!record) {
      throw new Exception(`record '${name}' not found`);
    }
    const recordsFm: RecordItemFormatted[] = structuredClone(records);
    recordsFm[recordIndex].action = "added";
    recordsFm[recordIndex].since = date !== undefined
      ? new Date(date)
      : record.since;
    recordsFm[recordIndex].color = color ?? record.color;
    recordsFm.splice(recordIndex, 0, structuredClone(record));
    recordsFm[recordIndex].action = "removed";
    record.since = date !== undefined ? new Date(date) : record.since;
    record.color = color ?? record.color;
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return recordListTable(recordsFm);
  }
  rename(pattern: string, newname: string) {
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    if (!isRecordName(pattern)) {
      throw new Exception(messages.invalidName);
    }
    if (!isRecordName(newname)) {
      throw new Exception("new name is invalid.");
    }
    if (pattern === newname) {
      throw new Exception("new name is same");
    }
    const { records } = this.cfg;
    const recordIndex = this.findRecordIndex(records, pattern);
    const record = records[recordIndex];
    if (!record) {
      throw new Exception(`record '${pattern}' not found`);
    }
    const similar = this.findRecord(records.slice(recordIndex + 1), pattern);
    if (similar) {
      throw new Exception(messages.existsName);
    }
    const recordsFm: RecordItemFormatted[] = structuredClone(records);
    recordsFm[recordIndex].action = "added";
    recordsFm[recordIndex].name = newname;
    recordsFm.splice(recordIndex, 0, structuredClone(record));
    recordsFm[recordIndex].action = "removed";
    record.name = newname;
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return recordListTable(recordsFm);
  }
  moveDown(pattern: string, move: `${"u" | "d"}${number | "max"}`) {
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    const { records } = this.cfg;
    const index = this.findRecordIndex(records, pattern);
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
    const recordsFm: RecordItemFormatted[] = structuredClone(records);
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
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return recordListTable(recordsFm);
  }
  remove(pattern: string) {
    if (!this.cfg) {
      throw new Exception(messages.invalidConfig);
    }
    const { records } = this.cfg;
    if (records.length === 0) {
      throw new Exception("no records");
    }
    if (!pattern || !this.findRecord(records, pattern)) {
      throw new Exception(`records '${pattern}' not found`);
    }
    const recordsFm: RecordItemFormatted[] = structuredClone(records);
    let counterRm = 0; // needed for right painting
    while (true) {
      const recordIndexRm = this.findRecordIndex(records, pattern);
      if (recordIndexRm < 0) break;
      recordsFm[recordIndexRm + counterRm].action = "removed";
      records.splice(recordIndexRm, 1);
      counterRm++;
    }
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return recordListTable(recordsFm);
  }
  reset() {
    this.cfg = defaultCfg;
    if (this.path !== null) {
      this.cfgSaveToFile();
    }
    return "reset completed";
  }
  //#endregion
}
//#endregion
