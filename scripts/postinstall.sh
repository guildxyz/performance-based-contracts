#!/bin/bash

dir=$(pwd)

chmod +x scripts/*
mkdir -p build/contracts 2> /dev/null
cd node_modules/witnet-solidity-bridge
npm run compile
cd $dir
cp node_modules/witnet-solidity-bridge/build/**/**/*.json build/contracts
