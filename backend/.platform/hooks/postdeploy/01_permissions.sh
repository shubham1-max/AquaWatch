#!/usr/bin/env bash
# Ensure uploads directory exists in current deployment directory
mkdir -p /var/app/current/uploads
chmod -R 775 /var/app/current/uploads
chown -R webapp:webapp /var/app/current/uploads || true
