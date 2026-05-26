#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Seeding database (if empty)..."
# Check if users already exist to avoid seeding duplicates or failing
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth.models import User
if not User.objects.exists():
    from django.core.management import call_command
    print('No users found. Seeding initial data...')
    call_command('loaddata', 'seed_data.json')
else:
    print('Database already initialized. Skipping seeding.')
"

echo "==> Starting web server..."
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
