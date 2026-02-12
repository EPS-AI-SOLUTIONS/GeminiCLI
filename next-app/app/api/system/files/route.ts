/**
 * System Files Route Handler
 * POST /api/system/files - Save file content (with security checks)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { isDangerousExtension } from '@/lib/system-security';

interface SaveFileBody {
  path: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const { path: filePath, content } = (await request.json()) as SaveFileBody;

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
    }

    // Security: block executable files
    if (isDangerousExtension(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      return NextResponse.json(
        { error: `SECURITY: Cannot write executable files (${ext})` },
        { status: 403 },
      );
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
