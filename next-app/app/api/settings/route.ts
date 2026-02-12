/**
 * GET /api/settings - Get current settings
 * PATCH /api/settings - Update settings
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { Settings } from '@/lib/api-types';
import { settingsStore } from '@/lib/stores';
import { validateSettingsUpdate } from '@/lib/validators';

export async function GET() {
  await settingsStore.ensureReady();
  return NextResponse.json<Settings>(settingsStore.get());
}

export async function PATCH(request: Request) {
  try {
    await settingsStore.ensureReady();

    const body = await request.json();
    const validated = validateSettingsUpdate(body);
    const result = settingsStore.update(validated);

    if ('error' in result) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json<Settings>(result);
  } catch (error) {
    return errorResponse(error);
  }
}
