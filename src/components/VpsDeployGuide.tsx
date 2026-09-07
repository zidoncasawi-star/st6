import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  CheckCircle, 
  Server, 
  ShieldCheck, 
  Layers, 
  FileCode, 
  ExternalLink,
  Cpu,
  Globe2,
  HardDrive
} from 'lucide-react';

export const VpsDeployGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [domainName, setDomainName] = useState('vpn.yourdomain.com');
  const [adminPort, setAdminPort] = useState('3000');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const bashScript = `#!/bin/bash
# =========================================================
# NexusVPN Control Center - 1-Click Ubuntu VPS Deployer
# Tested on Ubuntu 22.04 / 24.04 LTS
# =========================================================
set -e

echo "🚀 [1/5] Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx

echo "📦 [2/5] Installing Node.js 20 LTS & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "📂 [3/5] Setting up NexusVPN App Directory..."
sudo mkdir -p /var/www/nexus-vpn
cd /var/www/nexus-vpn

# Clone / Extract project
# git clone https://github.com/your-org/nexus-vpn-admin.git .
npm install --production

echo "⚙️ [4/5] Building Production Bundle..."
npm run build

echo "🛡️ [5/5] Configuring Firewall (UFW)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw --force enable

echo "✅ Deployment prepared! Start with PM2: pm2 start dist/server.cjs --name nexus-vpn"
`;

  const dockerCompose = `version: '3.8'

services:
  nexus-vpn-gateway:
    image: node:20-alpine
    container_name: nexus-vpn-core
    restart: always
    working_dir: /app
    volumes:
      - ./:/app
      - ./data:/app/data
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=nexus_vpn_super_secure_jwt_secret_change_me_in_prod
      - CLIENT_APP_SECRET=NEXUS-ANDROID-APP-SECRET-V1-SECURE
      - PAYLOAD_ENCRYPTION_KEY=nexus-32-byte-secret-encryption-key-!
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin_password_123
    command: sh -c "npm install && npm run build && npm run start"
`;

  const nginxConfig = `server {
    server_name ${domainName};

    # WebSocket & REST API Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:${adminPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SSL Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
}
`;

  const certbotCommand = `sudo certbot --nginx -d ${domainName}`;

  const systemdService = `[Unit]
Description=NexusVPN Core Admin & Android Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/nexus-vpn
ExecStart=/usr/bin/node /var/www/nexus-vpn/dist/server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=nexus_vpn_super_secure_jwt_secret_change_me_in_prod
Environment=CLIENT_APP_SECRET=NEXUS-ANDROID-APP-SECRET-V1-SECURE
Environment=PAYLOAD_ENCRYPTION_KEY=nexus-32-byte-secret-encryption-key-!

[Install]
WantedBy=multi-user.target
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          Ubuntu VPS Deployment & Production Setup Guide
        </h2>
        <p className="text-xs text-slate-400">
          Step-by-step instructions for deploying on any Ubuntu 22.04 / 24.04 VPS with Nginx, SSL (Certbot), Docker or systemd.
        </p>
      </div>

      {/* Domain Customizer Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <div>
            <h4 className="text-xs font-bold text-white">Target Domain / Subdomain</h4>
            <p className="text-[11px] text-slate-400">Generates personalized Nginx & Certbot configs automatically</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 w-64"
            placeholder="vpn.yourdomain.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Docker Compose */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Method A: 1-Click Docker Compose
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(dockerCompose, 'docker')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === 'docker' ? 'Copied!' : 'Copy docker-compose.yml'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto h-64 leading-relaxed">
            {dockerCompose}
          </pre>

          <p className="text-[11px] text-slate-400 font-mono">
            Command to start: <code className="text-cyan-300">docker compose up -d</code>
          </p>
        </div>

        {/* Step 2: Nginx Reverse Proxy */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Nginx Reverse Proxy (/etc/nginx/sites-available/nexus)
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(nginxConfig, 'nginx')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === 'nginx' ? 'Copied!' : 'Copy Nginx Config'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto h-64 leading-relaxed">
            {nginxConfig}
          </pre>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">SSL Certbot:</span>
            <code className="text-emerald-400">{certbotCommand}</code>
          </div>
        </div>
      </div>

      {/* Step 3: Native systemd Service Setup */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Method B: Systemd Daemon (/etc/systemd/system/nexus-vpn.service)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(systemdService, 'systemd')}
            className="text-xs text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedKey === 'systemd' ? 'Copied!' : 'Copy systemd Unit'}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto h-52 leading-relaxed">
          {systemdService}
        </pre>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Enable Service: <code className="text-cyan-300">sudo systemctl enable --now nexus-vpn</code></span>
          <span>•</span>
          <span>View Logs: <code className="text-violet-300">journalctl -u nexus-vpn -f</code></span>
        </div>
      </div>
    </div>
  );
};
