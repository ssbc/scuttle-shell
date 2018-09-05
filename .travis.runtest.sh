#!/bin/bash

if [[ $TRAVIS_OS_NAME == 'linux' ]]; then
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
  echo started xvfb
fi

echo debug: $TRAVIS_OS_NAME $DISPLAY
npm i
node ./server.js

# npm test
# TODO: could do tests/test.bad on appvayor
