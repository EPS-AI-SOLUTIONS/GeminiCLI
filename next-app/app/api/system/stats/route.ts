/**
 * System Stats Route Handler
 * GET /api/system/stats - Get CPU and memory usage
 */

import * as os from 'node:os';
import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// CPU Usage Tracking (replaces sysinfo crate)
// ═══════════════════════════════════════════════════════════════════════════

let prevCpuTimes: { idle: number; total: number } | null = null;

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
  }
  return { idle, total };
}

function getCpuUsage(): number {
  const current = getCpuTimes();
  if (!prevCpuTimes) {
    prevCpuTimes = current;
    return 0;
  }
  const idleDiff = current.idle - prevCpuTimes.idle;
  const totalDiff = current.total - prevCpuTimes.total;
  prevCpuTimes = current;
  if (totalDiff === 0) return 0;
  return (1 - idleDiff / totalDiff) * 100;
}

// Initialize first CPU sample
getCpuUsage();

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return NextResponse.json({
    cpu_usage: Math.round(getCpuUsage() * 100) / 100,
    memory_used_gb: Math.round((usedMem / 1073741824) * 100) / 100,
    memory_total_gb: Math.round((totalMem / 1073741824) * 100) / 100,
    memory_usage_percent: Math.round((usedMem / totalMem) * 10000) / 100,
  });
}
