#! /usr/bin/env bash

set -e

if [[ $TRAVIS_OS_NAME == 'linux' ]]; then
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
  echo started xvfb
fi

echo debug: $TRAVIS_OS_NAME $DISPLAY

node ./server.js &
sbotPID=$!

sleep 5
echo checking if sbot is still up
kill -0 $sbotPID
./node_modules/.bin/sbot whoami

kill $sbotPID


