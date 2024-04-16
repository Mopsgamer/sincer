# sincer
Node.js terminal client for time monitoring. Inspired by [TimeSince](https://play.google.com/store/apps/details?id=es.desaway.timesince).

## Requirements
- Node.js 14

## Installation
```bash
npm install -g sincer
```

## Usage
```
Usage: bundled [options] [command]

Options:
  -h, --help               display help for command

Commands:
  list|ls                  list of entries
  add|new [options]        create entry
  redate <name> [newdate]  set entry date
  rename <name> [newname]  set entry name
  up <name> [count]        move entry up
  down <name> [count]      move entry down
  remove|rm [name]         delete entries
  reset|rs                 reset all entries and settings
  help [command]           display help for command
```
