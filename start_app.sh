#!/bin/bash
echo "🚀 Starting EmLinh application..."
cd emlinh_mng
source venv/bin/activate
exec python -m gunicorn -c gunicorn.conf.py wsgi:application