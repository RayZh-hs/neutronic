#!/bin/bash

set -eo pipefail

cd "$(dirname "$0")"
git pull origin main
yarn install --frozen-lockfile
pm2 reload neutronic-api-server
pm2 save

echo "Neutronic Backend updated successfully! Running at port 9721."
