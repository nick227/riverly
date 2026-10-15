#!/usr/bin/env bash
# Project-local MySQL-compatible server for development (no Docker, no sudo).
# Data lives in .data/mysql (gitignored). Listens on 127.0.0.1:${RIVERLY_DB_PORT:-3407}.
# Prefer `docker compose up -d db` (MySQL 8.0, matches Railway) when Docker is available.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.data"
PORT="${RIVERLY_DB_PORT:-3407}"
SOCK="$DATA/mysqld.sock"
SERVER_BIN="$(command -v mariadbd || command -v mysqld || true)"
CLIENT="$(command -v mariadb || command -v mysql)"

start() {
  [ -n "$SERVER_BIN" ] || { echo "No mysqld/mariadbd found. Install mysql-server or use Docker (docker compose up -d db)."; exit 1; }
  mkdir -p "$DATA"
  if [ ! -d "$DATA/mysql/mysql" ]; then
    echo "→ Initializing data directory"
    if command -v mariadb-install-db >/dev/null; then
      mariadb-install-db --no-defaults --datadir="$DATA/mysql" --auth-root-authentication-method=normal --skip-test-db >/dev/null
    else
      "$SERVER_BIN" --no-defaults --initialize-insecure --datadir="$DATA/mysql" >/dev/null
    fi
  fi
  if status >/dev/null 2>&1; then echo "✓ already running on 127.0.0.1:$PORT"; return; fi
  nohup "$SERVER_BIN" --no-defaults --datadir="$DATA/mysql" --port="$PORT" --bind-address=127.0.0.1 \
    --socket="$SOCK" --pid-file="$DATA/mysqld.pid" --log-error="$DATA/mysqld.err" \
    --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci >/dev/null 2>&1 &
  for _ in $(seq 1 40); do "$CLIENT" --socket="$SOCK" -uroot -e 'select 1' >/dev/null 2>&1 && break; sleep 0.25; done
  # Dev-only account. Needs CREATE privileges for Prisma's shadow database during `migrate dev`.
  "$CLIENT" --socket="$SOCK" -uroot <<SQL
CREATE USER IF NOT EXISTS 'riverly'@'127.0.0.1' IDENTIFIED BY 'riverly_dev';
CREATE USER IF NOT EXISTS 'riverly'@'localhost' IDENTIFIED BY 'riverly_dev';
GRANT ALL ON *.* TO 'riverly'@'127.0.0.1';
GRANT ALL ON *.* TO 'riverly'@'localhost';
CREATE DATABASE IF NOT EXISTS riverly_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS riverly_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
  echo "✓ running on 127.0.0.1:$PORT (databases riverly_dev, riverly_test)"
}
stop() {
  if [ -f "$DATA/mysqld.pid" ]; then kill "$(cat "$DATA/mysqld.pid")" && echo "✓ stopped"; else echo "not running"; fi
}
status() { "$CLIENT" --socket="$SOCK" -uroot -e 'select version()' 2>/dev/null; }
case "${1:-}" in start) start ;; stop) stop ;; status) status || { echo "not running"; exit 1; } ;; *) echo "usage: $0 start|stop|status"; exit 2 ;; esac
