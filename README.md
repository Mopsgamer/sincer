# sincer
Node.js terminal client for time monitoring. Inspired by [TimeSince](https://play.google.com/store/apps/details?id=es.desaway.timesince).

## Requirements
- Node.js 14

## Installation
> [!WARNING]  
> You cannot install this package because it is under active development. If you want to force try it out, use `npm install -g Mopsgamer/sincer`.
```bash
npm install -g sincer
```

## Usage
```
Usage: sincer [options] [command]

Options:
  -h, --help                display help for command

Commands:
  list|ls [name]            get list of records
  add|new [options] [name]  create record
  redate <name> [newdate]   set record date
  rename <name> [newname]   set record name
  up <name> <count>         move record up
  down <name> <count>       move record down
  remove|rm <name>          delete records
  reset                     reset all records and settings
  help [command]            display help for command
```
