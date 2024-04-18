# sincer
Node.js terminal client for time monitoring. Inspired by [TimeSince](https://play.google.com/store/apps/details?id=es.desaway.timesince).

## Requirements
- Node.js 14

## Installation
> [!WARNING]  
> You cannot install this package from npm because it is under active development.

If you want to force try it out, clone it.

```
gh repo clone Mopsgamer/sincer
npm install
npm install -g .
```

To update:
```
git fetch
git pull
npm install -g .
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
