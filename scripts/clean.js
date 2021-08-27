#!/usr/bin/env node

var exec = require('child_process').exec;
var os = require('os');

switch (os.type()) {
  case "Windows_NT":
    exec("rm contracts\\requests\\*.sol migrations\\*_witnet_core.js migrations\\*user_contracts.js migrations\\*.json build\\contracts\\*")
    break;
  default:
    exec("rm contracts/requests/*.sol migrations/*_witnet_core.js migrations/*user_contracts.js migrations/*.json build/contracts/* 2>/dev/null")
}
