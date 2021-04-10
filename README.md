# Scuttle Shell (now in Go)

## Build

Remember to customise your `scuttle-shell.toml` inside `cmd/scuttle-shell`.

_MacOS tip: Apps like Patchwork that is an executable, the path on `scuttle-shell.toml` may be:_

`/Applications/Patchwork.app/Contents/MacOS/Patchwork`

### Windows

From inside `cmd/scuttle-shell`

```
PS> go build -ldflags "-H=windowsgui"
```

## MacOS

From inside `cmd/scuttle-shell`

```
PS> go build
```
