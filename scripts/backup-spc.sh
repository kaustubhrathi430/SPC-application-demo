#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

BACKUP_ROOT=${BACKUP_ROOT:-"$REPO_ROOT/backups"}
DATA_ROOT=${DATA_ROOT:-"$REPO_ROOT/data"}
IMAGE_ROOT=${IMAGE_ROOT:-"$DATA_ROOT/spc-images"}
DB_CONTAINER=${DB_CONTAINER:-spc-database}
DB_NAME=${DB_NAME:-spc_db}
DB_USER=${DB_USER:-spc_user}

STAMP=$(date +"%Y%m%d-%H%M%S")
MONTH_BUCKET=$(date +"%Y-%m")
DAILY_DIR="$BACKUP_ROOT/daily"
MONTHLY_DIR="$BACKUP_ROOT/monthly/$MONTH_BUCKET"
WORK_DIR="$BACKUP_ROOT/.work/$STAMP"

mkdir -p "$DAILY_DIR" "$MONTHLY_DIR" "$WORK_DIR"

DB_DUMP="$WORK_DIR/database.sql"
IMAGE_ARCHIVE="$WORK_DIR/images.tar.gz"
MANIFEST="$WORK_DIR/manifest.txt"
FINAL_ARCHIVE="$DAILY_DIR/spc-backup-$STAMP.tar.gz"

echo "Creating PostgreSQL dump from container $DB_CONTAINER..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$DB_DUMP"

if [ -d "$IMAGE_ROOT" ]; then
  echo "Archiving image storage from $IMAGE_ROOT..."
  tar -czf "$IMAGE_ARCHIVE" -C "$DATA_ROOT" "$(basename "$IMAGE_ROOT")"
else
  echo "Image root not found; creating empty placeholder archive."
  mkdir -p "$WORK_DIR/empty"
  tar -czf "$IMAGE_ARCHIVE" -C "$WORK_DIR/empty" .
  rmdir "$WORK_DIR/empty"
fi

{
  echo "created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "database_container=$DB_CONTAINER"
  echo "database_name=$DB_NAME"
  echo "database_user=$DB_USER"
  echo "image_root=$IMAGE_ROOT"
} > "$MANIFEST"

tar -czf "$FINAL_ARCHIVE" -C "$WORK_DIR" database.sql images.tar.gz manifest.txt

if [ "$(date +"%d")" = "01" ]; then
  cp "$FINAL_ARCHIVE" "$MONTHLY_DIR/"
fi

find "$DAILY_DIR" -type f -name 'spc-backup-*.tar.gz' | sort | head -n -30 | xargs -r rm -f
find "$BACKUP_ROOT/monthly" -mindepth 1 -maxdepth 1 -type d | sort | head -n -12 | xargs -r rm -rf
rm -rf "$WORK_DIR"

echo "Backup created: $FINAL_ARCHIVE"
