#!/usr/bin/env bash

if [[ -d ./node_modules ]]; then
  rm -rf ./node_modules
fi

set -e

npm install

cp ../*.ts .
mkdir -p mocks
cp ../mocks/*.ts mocks

npx tsx --test *.test.ts

rm ./*.ts
rm -rf mocks
