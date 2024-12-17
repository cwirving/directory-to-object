#!/usr/bin/env bash

if [[ -d ./node_modules ]]; then
  rm -rf ./node_modules
fi

set -e

bun install

cp ../*.ts .
mkdir -p mocks
cp ../mocks/*.ts mocks

for testfile in ./*.test.ts; do
  bun test $testfile
done

rm ./*.ts
rm -rf mocks
