#!/usr/bin/env node
/**
 * GeminiGUI Launcher - Node.js replacement for clean-start.ps1
 * Cleans up ports and starts Tauri dev server
 */

import { execSync, spawn } from 'node:child_process';

const PORT = 1420;

const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

console.log(`${c.cyan}--- GeminiGUI Auto-Cleanup & Launch ---${c.reset}`);

/**
 * Kill process using a specific port (Windows)
 */
function killPort(port) {
  process.stdout.write(`Checking port ${port}... `);

  try {
    // Find PID using netstat
    const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = result.trim().split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && parseInt(pid, 10) > 4) {
        pids.add(pid);
      }
    }

    if (pids.size > 0) {
      console.log(`${c.yellow}OCCUPIED${c.reset}`);
      for (const pid of pids) {
        try {
          console.log(`  ${c.red}-> Killing PID: ${pid}${c.reset}`);
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
        } catch {
          // Process may have already exited
        }
      }
    } else {
      console.log(`${c.green}FREE${c.reset}`);
    }
  } catch {
    console.log(`${c.green}FREE${c.reset}`);
  }
}

/**
 * Kill process by name (Windows)
 */
function killProcess(name) {
  try {
    execSync(`taskkill /IM ${name}.exe /F 2>nul`, { stdio: 'pipe' });
    console.log(`  ${c.yellow}-> Killed hanging process: ${name}${c.reset}`);
  } catch {
    // Process not found - that's fine
  }
}

// 1. Clean up port
killPort(PORT);

// 2. Kill hanging app processes
killProcess('geminigui');

// 3. Wait a moment
await new Promise((r) => setTimeout(r, 500));

console.log(`${c.cyan}Starting application...${c.reset}`);
console.log(`${c.gray}---------------------------------------${c.reset}`);

// 4. Start Tauri dev
const child = spawn('npm', ['run', 'tauri:dev'], {
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error(`${c.red}Failed to start: ${err.message}${c.reset}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
