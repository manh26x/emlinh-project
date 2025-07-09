#!/bin/bash
set -e
cd /home/minipc/actions-runner/_work/emlinh-project/emlinh-project/emlinh_mng
source venv/bin/activate
exec python -m gunicorn -c gunicorn.conf.py wsgi:application