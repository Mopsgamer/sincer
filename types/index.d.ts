export as namespace Sincer

export type RecordItem = {
	name: string,
	since: string,
	locale: string
}
export type Config = {
	records: RecordItem[],
	count: 0
}
export type ManagerData = {
	raw: Config | undefined,
	isReadable(path?): boolean,
	readCfg(path?): Buffer | undefined,
	parseCfg(path?): unknown,
	loadCfg(path?): Config | undefined,
	load(cfg?): Config,
	string(cfg?): string,
	save(path?): void,
}
export type Manager = {
	data: ManagerData
	printRecord(record: Record): void
	printRecordAdded(record: Record): void
	printRecordRemoved(record: Record): void
	printRecordChanged(record: Record, old: Record): void
	printAll(name: string): void
	findRecordIndex(records: Record[], name: string): number
	findRecord(records: Record[], name: string): Record
	findRecordAll(records: Record[], name: string): Record[]
	add(name: string, options): void
	swap(name: string, name2: string): void
	redate(name: string, newdate: string | Date): void
	rename(name: string, newname: string): void
	moveUp(name: string, count: number): void
	moveDown(name: string, count: number): void
	remove(name: string): void
	reset(): void
}
export type NameGeneratorTemplate = `${string}$0${string}`
export function isNameGeneratorTemplate(template): template is NameGeneratorTemplate
export type NameGenerator = {
	get current(): string
	next(): ThisType
	prev(): ThisType
}
