"""Gunicorn configuration for production deployment on Render / Railway."""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = max(2, (os.cpu_count() or 1) * 2 + 1)
worker_class = "sync"
worker_tmp_dir = "/dev/shm"
threads = 2
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
preload_app = True

accesslog = "-"
errorlog = "-"
loglevel = "info"
