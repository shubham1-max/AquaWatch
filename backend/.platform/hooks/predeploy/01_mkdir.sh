#!/usr/bin/env bash
# Ensure uploads directory exists in staging
mkdir -p /var/app/staging/uploads
chmod -R 775 /var/app/staging/uploads
chown -R webapp:webapp /var/app/staging/uploads || true
