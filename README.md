# sincer
Node.js terminal client for time monitoring. Inspired by [TimeSince](https://play.google.com/store/apps/details?id=es.desaway.timesince).

## Plans

- Add interactive mode.
- Add tests (80%+).

## Requirements
- Node.js 16 or later.

## Installation
> [!WARNING]  
> You cannot install this package from npm because it is under active development.

## Usage
```
Usage: sincer [options] [command]

Options:
  -h, --help                  display help for command

Commands:
  version|v                   print version
  list|ls [name]              print set of records
  add|new [options] [name]    create new record
  redate <name> [newdate]     change date for single record
  rename <name> [newname]     rename single record
  swap <mode> <name> <name2>  swap two records (names or places)
  up <name> <count>           move record up
  down <name> <count>         move record down
  remove|rm <name>            delete a couple of records
  reset                       reset all records and settings
  help [command]              display help for command
```
