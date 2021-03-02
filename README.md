![Hermie The Crab](/icon.png)

# Scuttle Shell

This is a [Secure Scuttlebutt](http://scuttlebutt.nz) system tray application. It provides an always-running _sbot_ for your local system.

## Dependencies

You must have [Git](https://git-scm.com) and [Node](https://nodejs.org) installed.

## Install globally

```
$ npm install -g scuttle-shell
```

or if you cloned this repo (run from the repo folder itself):

```
$ npm install -g
```

You can run the app by executing `scuttleshell` on your terminal.

## Using it programmatically

Right now, there is only one feature exported by the `scuttle-shell` module which is the ability to start a server. Example:

```
let scuttleshell = require("scuttle-shell")

console.log("Starting sbot, quitting after 30 seconds")
scuttleshell.start()

setTimeout(scuttleshell.stop, 30000)
```

## API

### `start(customConfig, donecb)`
The `start()` function is used to launch scuttle-shell. You can pass a custom configuration object as the first parameter and a callback to be triggered once the shell starts.

In the custom config, you can only pass _appname_ and _plugins_. Other fields are ignored.

The callback receives no parameter.

### `stop(done)` 
The `stop()` function is used to stop scuttle-shell. It will close the tray application and also stop _sbot_. You can pass a callback to be triggered after it stops everything.

### `getConfig()`
The `getConfig()` function is a synchronous function that returns an object contained the current configuration. The object has the following shape:

```
{
    type: "config",
    keys: "<string>",
    manifest: "<object>",
    remote: "<string>
}
```

If there is an error getting the config, the returned object will look like:

```
{
    type: "error",
    msg: "<string>
}
```

## Setup

This application is built with [NodeJS](https://nodejs.org). To set it up run:

```
$ npm install
```

This should set it up. If anything fails you can check your setup with


### Plugins

scuttle-shell supports mutliple ways to extend the sbot that it runs with pluigns (like [ssb-chess-db](https://github.com/Happy0/ssb-chess-db) or [ssb-query](https://github.com/dominictarr/ssb-query)).

First of all, it supports and loads the plugins that were installed by running `sbot plugins.install ...`.
These are stored under `$HOME/.ssb/node_modules`.

Additonally, you can either pass the file paths to the API constructor by adding a `plugins` field to the object you pass to `.start()`. Check out `examples/launch_sbot_custom_plugin.js` to see it in action.

Alternativly you can use the command-line flag of `scuttleshell`, named `--extra-plugins`. i.e. `scuttleshell --extra-plugin path/to/plugin1 --extra-plugin path/to/plugin2`. Please note that these are not installed or persisted, you need to take care of that.

If you don't want to store them in the `$HOME/.ssb` folder, there is also the option to create a `scuttleshell.json` file next to your custom scuttle-shell and set a `plugins` array inside it.

```json
{
    'plugins': ['path/to/plug1','path/to/plug2','path/to/plug3']
}
```
