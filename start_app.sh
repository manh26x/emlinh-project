#!/bin/bash
set -e
source venv/bin/activate
exec python -m gunicorn -c gunicorn.conf.py wsgi:application