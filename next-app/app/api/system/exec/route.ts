/**
 * System Exec Route Handler
 * POST /api/system/exec - Execute sandboxed system command
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { validateCommand, getProjectRoot } from '@/lib/system-security';

const execAsync = promisify(exec);

interface RunCommandBody {
  command: string;
}

export async function POST(request: Request) {
  try {
    const { command } = (await request.json()) as RunCommandBody;

    // Security checks
    const securityError = validateCommand(command);
    if (securityError) {
      return NextResponse.json({ error: securityError }, { status: 403 });
    }

    const projectRoot = getProjectRoot();
    const isWindows = process.platform === 'win32';

    const shell = isWindows ? 'powershell' : '/bin/sh';
    const shellArgs = isWindows
      ? `-NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ${command}"`
      : `-c "${command}"`;

    const { stdout, stderr } = await execAsync(`${shell} ${shellArgs}`, {
      cwd: projectRoot,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5, // 5MB
      windowsHide: true,
    });

    if (stderr && stdout) {
      return NextResponse.json({ output: `${stdout}\n[STDERR]: ${stderr}` });
    }
    if (stderr) {
      return NextResponse.json({ output: `[STDERR]: ${stderr}` });
    }
    return NextResponse.json({ output: stdout });
  } catch (error) {
    return errorResponse(error);
  }
}
