#!/bin/bash

set -eo pipefail

cd "$(dirname "$0")"
yarn install
pm2 start backend/api/server.cjs --name neutronic-api-server
pm2 save
echo "Neutronic Backend setup complete. Running at port 9721."
