package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/BurntSushi/toml"
	"github.com/getlantern/systray"
	"github.com/skratchdot/open-golang/open"
)

type Server struct {
	Label     string   `toml:"label"`
	Command   string   `toml:"command"`
	Start     []string `toml:"start"`
	Check     string   `toml:"check"`
	AutoStart bool     `toml:"auto_start" default:"false"`
}

type Config struct {
	Servers map[string]Server `toml:"servers"`
}

type ServerMenuItem struct {
	server Server
	menu   *systray.MenuItem

	path string
	cmd  *exec.Cmd

	shutdown context.CancelFunc
}

func (sm *ServerMenuItem) waitForClick() {
	for range sm.menu.ClickedCh {
		sm.runServerMaybe()
	}
}

func (sm *ServerMenuItem) runServerMaybe() {
	item := sm.menu
	server := sm.server
	if item.Checked() {
		// need to quit.
		if sm.cmd == nil {
			fmt.Println("no server started?!")
			return
		}
		sm.shutdown()
		fmt.Println("stopping", sm.server.Label)
		sm.cmd.Wait()
		sm.cmd = nil
		item.Uncheck()
	} else {
		ctx, cancel := context.WithCancel(context.TODO()) // should be hooked into the process signal handler
		cmd := exec.CommandContext(ctx, sm.path, server.Start...)
		cmd.Stderr = os.Stderr
		cmd.Stdout = os.Stderr
		if err := cmd.Start(); err != nil {
			log.Fatalf("Can't start %s: %s", server.Label, err)
			return
		}

		sm.cmd = cmd
		sm.shutdown = cancel
		item.Check()
	}
}

func main() {
	onExit := func() {
		fmt.Println("Quitting")
	}

	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetIcon(getIcon("icon.ico"))
	systray.SetTitle("Scuttle Shell")
	systray.SetTooltip("Scuttle Shell running Go")
	mMain := systray.AddMenuItem("Scuttle Shell", "Scuttle Shell in Go")
	mSite := mMain.AddSubMenuItem("http://ssb.nz", "SSB main website")
	mIssues := mMain.AddSubMenuItem("Issues", "Open issue tracker")
	systray.AddSeparator()

	// Load configuration and add menu items ...
	var config Config

	// First look for "scuttle-shell.toml" next to binary
	configPath := "scuttle-shell.toml"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// it was not there, look in home
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatal("Can't find home folder")
		}

		configPath := filepath.Join(home, "scuttle-shell.toml")
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			log.Fatal("Can't find scuttle-shell.toml")
		}
	}

	if _, err := toml.DecodeFile(configPath, &config); err != nil {
		log.Fatalf("Can't find scuttle-shell.toml in %s", configPath)
	}

	mServers := []ServerMenuItem{}
	for _, server := range config.Servers {
		item := systray.AddMenuItem(server.Label, server.Label)
		path, err := exec.LookPath(server.Command)
		if err != nil {
			fmt.Printf("Can't find %s, disabling it's menu\n", server.Command)
			item.Disable()
			continue
		} else {
			fmt.Printf("%s is available at %s\n", server.Label, path)
		}
		srvItem := ServerMenuItem{
			server: server,
			menu:   item,
			path:   path,
		}
		go srvItem.waitForClick()
		mServers = append(mServers, srvItem)
	}

	// Add quit app ...
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit the whole app")

	go func() {
		// var spawnedServer *exec.Cmd
		for {
			select {
			case <-mSite.ClickedCh:
				open.Run("http://ssb.nz")
			case <-mIssues.ClickedCh:
				open.Run("https://github.com/ssbc/scuttle-shell/issues")
			case <-mQuit.ClickedCh:

				// spawnedServer.Process.Kill()
				// if err := spawnedServer.Wait(); err != nil {
				// fmt.Println("server failed to shutdown cleanly", err)
				// }

				systray.Quit()
				return

			}
		}
	}()
}

func getIcon(s string) []byte {
	b, err := ioutil.ReadFile(s)
	if err != nil {
		fmt.Print(err)
	}
	return b
}
