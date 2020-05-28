package main

import (
	"fmt"
	"io/ioutil"
	"time"

	"github.com/getlantern/systray"
	"github.com/BurntSushi/toml"
	"github.com/ssbc/scuttle-shell/icon"
)

type Server struct {
	Label string
	WorkingFolder string `toml:"working_folder`
	CheckCommand string `toml:"check_command`
	StartCommand string `toml:"start_command`
	AutoStart bool `toml:"auto_start default:"false"`
}

type Config struct {
	Servers map[string]Server
}

func main() {
	onExit := func() {
		now := time.Now()
		ioutil.WriteFile(fmt.Sprintf(`on_exit_%d.log`, now.UnixNano()), []byte(now.String()), 0644)
	}

	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetTemplateIcon(icon.Data, icon.Data)
	systray.SetTitle("Scuttle Shell")
	systray.SetTooltip("Scuttle Shell running Go")

	// Load configuration and add menu items ...
	var config Config

	if _, err := toml.DecodeFile("scuttle-shell.toml", &config); err != nil {
		fmt.Println(err)
		return
	}

	for serverName, server := range config.Servers {
		fmt.Printf("Server: %s (%s, %s)\n", serverName, server.Label, server.CheckCommand)
	}

	// Add quit whole app ...
	mQuitOrig := systray.AddMenuItem("Quit", "Quit the whole app")
	go func() {
		<-mQuitOrig.ClickedCh
		fmt.Println("Requesting quit")
		systray.Quit()
		fmt.Println("Finished quitting")
	}()
}

func getIcon(s string) []byte {
    b, err := ioutil.ReadFile(s)
    if err != nil {
        fmt.Print(err)
    }
    return b
}
