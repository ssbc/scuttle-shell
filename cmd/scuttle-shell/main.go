package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"sync"

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

	running  sync.Mutex
	cmd      *exec.Cmd
	shutdown context.CancelFunc
}

func (sm *ServerMenuItem) waitForExit() {
	sm.running.Lock()
	defer sm.running.Unlock()
	if sm.cmd == nil {
		return
	}
	err := sm.cmd.Wait()
	fmt.Println(sm.server.Label, "exited with", err)
	sm.cmd = nil
	sm.menu.Uncheck()
}

func (sm *ServerMenuItem) waitForClick() {
	for range sm.menu.ClickedCh {
		sm.runServerMaybe()
	}
}

func (sm *ServerMenuItem) runServerMaybe() {
	sm.running.Lock()
	defer sm.running.Unlock()

	item := sm.menu
	server := sm.server

	if item.Checked() {
		// need to quit.
		if sm.cmd == nil {
			fmt.Println("no server started?!")
			return
		}
		fmt.Println("stopping", sm.server.Label)
		sm.shutdown()
		return
	}

	ctx, cancel := context.WithCancel(longCtx)
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

	go sm.waitForExit()
}

var (
	longCtx, cancelAll = context.WithCancel(context.Background())

	mServers = []*ServerMenuItem{}
)

func quit() {
	cancelAll()

	// wait for server(s?) to shutdown
	for _, srv := range mServers {
		srv.waitForExit()
	}

	systray.Quit()
}

func main() {

	c := make(chan os.Signal, 1)

	// Passing no signals to Notify means that
	// all signals will be sent to the channel.
	signal.Notify(c, os.Interrupt)

	go func() { // wait until a signal is sent to the process (like ctrl+c)
		for s := range c {
			fmt.Println("Got signal:", s)
			quit()
		}
	}()

	onExit := func() {
		fmt.Println("Quitting")
	}

	systray.Run(onReady, onExit)
}

//go:generate go run github.com/flazz/togo -pkg main -name trayIcon -input ./icon.ico

func onReady() {
	systray.SetIcon(trayIcon)
	systray.SetTitle("Scuttle Shell")
	systray.SetTooltip("Scuttle Shell running Go")
	mMain := systray.AddMenuItem("Scuttle Shell", "Scuttle Shell in Go")
	mSite := mMain.AddSubMenuItem("http://ssb.nz", "SSB main website")
	mIssues := mMain.AddSubMenuItem("Issues", "Open issue tracker")
	systray.AddSeparator()

	// Load configuration and add menu items ...
	var cfg Config

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

	if _, err := toml.DecodeFile(configPath, &cfg); err != nil {
		log.Fatalf("Can't find scuttle-shell.toml in %s (%s)", configPath, err)
	}

	for _, server := range cfg.Servers {
		item := systray.AddMenuItem(server.Label, server.Label)
		path, err := exec.LookPath(server.Command)
		if err != nil {
			fmt.Printf("Can't find %s, disabling it's menu\n%s\n", server.Label, err)
			item.Disable()
			continue
		} else {
			fmt.Printf("%s is available at %s\n", server.Label, path)
		}
		srvItem := &ServerMenuItem{
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
		for {
			select {
			case <-mSite.ClickedCh:
				open.Run("http://ssb.nz")
			case <-mIssues.ClickedCh:
				open.Run("https://github.com/ssbc/scuttle-shell/issues")
			case <-mQuit.ClickedCh:

				quit()
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
