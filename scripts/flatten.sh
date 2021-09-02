#!/bin/bash

mkdir contracts/flattened/ 2> /dev/null
npx truffle-flattener contracts/Monetizer.sol > contracts/flattened/Flattened.sol
