const fs = require('fs')
const path = require('path')

// Parse .env file from repo root
const envPath = path.resolve(__dirname, '../../.env')
const envVars = {}

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    let val = trimmed.slice(eqIdx + 1)
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    envVars[key] = val
  }
}

module.exports = {
  apps: [
    {
      name: 'mzadat-api',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      cwd: __dirname,
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        ...envVars,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/logs/api-error.log',
      out_file: '/home/ec2-user/logs/api-out.log',
      merge_logs: true,
    },
  ],
}
