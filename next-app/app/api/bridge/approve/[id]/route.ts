/**
 * Bridge Approve Route Handler
 * POST /api/bridge/approve/:id - Approve a request
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { errorResponse, NotFoundError } from '@/lib/api-errors';
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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = readBridge();

    const req = data.requests.find((r) => r.id === id);
    if (!req) {
      throw new NotFoundError(`Request '${id}'`);
    }

    req.status = 'approved';
    writeBridge(data);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
