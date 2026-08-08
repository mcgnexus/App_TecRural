import { NextResponse } from 'next/server';
import { getWeather } from '@/lib/weather';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: 'Se necesitan parámetros válidos "lat" y "lon".' },
      { status: 400 }
    );
  }

  try {
    const data = await getWeather(lat, lon);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[weather] error inesperado:', err);
    return NextResponse.json(
      { error: 'No se pudo obtener el tiempo. Inténtalo de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
