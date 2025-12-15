#!/bin/bash

set -eo pipefail

cd "$(dirname "$0")"
cd backend && yarn install --frozen-lockfile
pm2 start src/server.js --name neutronic-api-server
pm2 save
echo "Neutronic Backend setup complete. Running at port 9721."
