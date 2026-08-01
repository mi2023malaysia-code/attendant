import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'webinar-questionnaire-system',
    timestamp: new Date().toISOString(),
  });
}
