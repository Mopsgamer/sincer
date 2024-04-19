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
	raw: Config,
	isReadable(): boolean,
	readCfg(): Buffer,
	parseCfg(): unknown,
	loadCfg(): Config,
	load(cfg?): Config,
	string(cfg?): string,
	save(): void,
}
export type Manager = {
	data: ManagerData
	printRecord(record: Record): Promise<void>
	printRecordAdded(record: Record): Promise<void>
	printRecordRemoved(record: Record): Promise<void>
	printRecordChanged(record: Record, old: Record): Promise<void>
	printAll(name: string): Promise<void>
	findRecordIndex(records: Record[], name: string): number
	findRecord(records: Record[], name: string): Record
	findRecordAll(records: Record[], name: string): Record[]
	add(name: string, options): Promise<boolean>
	swap(name: string, name2: string): Promise<boolean>
	redate(name: string, newdate: string | Date): Promise<boolean>
	rename(name: string, newname: string): Promise<boolean>
	moveUp(name: string, count: number): Promise<boolean>
	moveDown(name: string, count: number): Promise<boolean>
	remove(name: string): Promise<boolean>
	reset(): void
}
export type NameGeneratorTemplate = `${string}$0${string}`
export function isNameGeneratorTemplate(template): template is NameGeneratorTemplate
export type NameGenerator = {
	get current(): string
	next(): ThisType
	prev(): ThisType
}
