/**
 * Bridge Auto-Approve Route Handler
 * PATCH /api/bridge/auto-approve - Set auto-approve
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { BridgeData } from '@/lib/api-types';

function getBridgePath(): string {
  return path.join(process.cwd(), 'bridge.json');
}

function readBridge(): BridgeData {
  const bridgePath = getBridgePath();
  if (!fs.existsSync(bridgePath)) {
    const defaultData: BridgeData = { requests: [], auto_approve: false };
    fs.writeFileSync(bridgePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }

  try {
    const content = fs.readFileSync(bridgePath, 'utf-8');
    return JSON.parse(content) as BridgeData;
  } catch {
    return { requests: [], auto_approve: false };
  }
}

function writeBridge(data: BridgeData): void {
  const bridgePath = getBridgePath();
  fs.writeFileSync(bridgePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { enabled } = body as { enabled: boolean };

    const data = readBridge();
    data.auto_approve = Boolean(enabled);
    writeBridge(data);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
