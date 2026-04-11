#!/bin/bash
set -e

echo "=== 1. FIX NGINX CSP (add blob: to frame-src) ==="
sudo sed -i "s|frame-ancestors 'none'; base-uri|frame-src 'self' blob:; frame-ancestors 'none'; base-uri|" /etc/nginx/sites-enabled/lpapp
echo "CSP updated."

echo "=== 2. TEST NGINX CONFIG ==="
sudo nginx -t

echo "=== 3. RELOAD NGINX ==="
sudo systemctl reload nginx
echo "Nginx reloaded."

echo "=== 4. REMOVE UNUSED PM2 FILES FROM REPO ==="
rm -f ~/lpapp-pesantren/pm2.json ~/lpapp-pesantren/ecosystem.config.js
echo "PM2 config files removed."

echo "=== 5. VERIFY DOCKER CONTAINERS ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "=== 6. VERIFY BACKEND LOGS ==="
docker logs mslpapp_backend --tail 3 2>&1

echo "=== 7. VERIFY NGINX CSP ==="
grep "frame-src" /etc/nginx/sites-enabled/lpapp

echo "=== DONE ==="
