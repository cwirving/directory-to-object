#!/usr/bin/env bash

if [[ -d ./node_modules ]]; then
  rm -rf ./node_modules
fi

npm install

cp ../*.ts .
npx tsx --test *.test.ts
rm *.ts
