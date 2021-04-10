.DEFAULT_GOAL := compile

BIN_FILE=scuttle-shell
BUILD_FOLDER=builds

PLATFORMS := darwin/amd64 windows/386

temp = $(subst /, ,$@)
OS = $(word 1, $(temp))
ARCH = $(word 2, $(temp))

WIN_FLAGS = -v -ldflags "-H=windowsgui"
FLAGS = -v

compile: $(PLATFORMS)

$(PLATFORMS):
ifeq ($(OS),windows)
	GO111MODULE=on GOOS=$(OS) GOARCH=$(ARCH) go build $(WIN_FLAGS) -o './$(BUILD_FOLDER)/$(BIN_FILE)-$(OS)-$(ARCH)' ./cmd/$(BIN_FILE)
else
	GO111MODULE=on GOOS=$(OS) GOARCH=$(ARCH) go build $(FLAGS) -o './$(BUILD_FOLDER)/$(BIN_FILE)-$(OS)-$(ARCH)' ./cmd/$(BIN_FILE)
endif
	
clean:
	go clean
	
