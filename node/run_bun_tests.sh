#!/usr/bin/env bash

if [[ -d ./node_modules ]]; then
  rm -rf ./node_modules
fi

bun install

cp ../*.ts .
bun test *.test.ts
rm *.ts
