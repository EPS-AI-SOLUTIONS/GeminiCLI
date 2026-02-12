/**
 * Swarm Spawn Route Handler
 * POST /api/swarm/spawn - Spawn swarm agent with SSE streaming output
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { NextResponse } from 'next/server';
import { validateObjective, getProjectRoot } from '@/lib/system-security';
import { SSEWriter } from '@/lib/sse';

interface SpawnSwarmBody {
  objective: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SpawnSwarmBody;
  const { objective } = body;

  // Security validation
  const securityError = validateObjective(objective);
  if (securityError) {
    return NextResponse.json({ error: securityError }, { status: 403 });
  }

  // Find run-swarm script
  const projectRoot = getProjectRoot();
  const possiblePaths = [
    path.join(projectRoot, 'bin', 'run-swarm.ps1'),
    path.join(projectRoot, 'scripts', 'run-swarm.ps1'),
  ];

  let scriptPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      scriptPath = p;
      break;
    }
  }

  if (!scriptPath) {
    return NextResponse.json(
      { error: `run-swarm.ps1 not found. Checked: ${possiblePaths.join(', ')}` },
      { status: 404 },
    );
  }

  // SSE response with child process streaming
  // We use SSEWriter directly here instead of createSSEResponse because
  // the child process events drive the lifecycle (not a simple async function)
  const sse = new SSEWriter();
  const response = sse.response();
  sse.startKeepAlive();

  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell' : 'pwsh';
  const args = isWindows
    ? [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${scriptPath}' '${objective}'`,
      ]
    : ['-NoProfile', '-File', scriptPath, objective];

  const child = spawn(shell, args, {
    cwd: projectRoot,
    windowsHide: true,
  });

  child.stdout?.on('data', (data: Buffer) => {
    sse.sendChunk(data.toString());
  });

  child.stderr?.on('data', (data: Buffer) => {
    sse.sendChunk(`[ERR] ${data.toString()}`);
  });

  child.on('close', (code) => {
    if (code === 0) {
      sse.sendResult('[SWARM COMPLETED SUCCESSFULLY]', 0);
    } else {
      sse.sendError(`[SWARM EXITED WITH CODE: ${code}]`);
    }
    sse.close();
  });

  child.on('error', (err) => {
    sse.sendError(`[SWARM ERROR: ${err.message}]`);
    sse.close();
  });

  return response;
}
