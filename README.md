# Scuttle Shell (now in Go)

## Build

Remember to customize your `scuttle-shell.toml` inside `cmd/scuttle-shell`.

*MacOS tip: Apps like Patchwork that is an executable, the path on `scuttle-shell.toml` may be:*

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