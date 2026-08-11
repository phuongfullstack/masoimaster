#!/bin/bash
cd /home/z/my-project/mini-services/game-server
while true; do
  echo "[$(date)] Starting game server..."
  node server.cjs 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Game server exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done