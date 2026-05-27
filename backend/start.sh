#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Seeding database..."
python manage.py seed_data

echo "==> Starting web server..."
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
