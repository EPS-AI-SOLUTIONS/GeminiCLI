/**
 * POST /api/settings/reset
 * Reset settings to defaults
 */

import { NextResponse } from 'next/server';
import type { Settings } from '@/lib/api-types';
import { settingsStore } from '@/lib/stores';

export async function POST() {
  return NextResponse.json<Settings>(settingsStore.reset());
}
