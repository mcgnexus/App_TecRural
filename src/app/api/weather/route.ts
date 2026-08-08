import { NextResponse } from 'next/server';
import { getWeather } from '@/lib/weather';
import { findMunicipality } from '@/lib/municipalities';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const municipalityName = searchParams.get('municipality');
  const place = municipalityName
    ? findMunicipality(municipalityName)
    : undefined;

  if (place) {
    try {
      const data = await getWeather(place);
      return NextResponse.json(data);
    } catch (err) {
      console.error('[weather] error inesperado:', err);
      return NextResponse.json(
        { error: 'No se pudo obtener el tiempo. Inténtalo de nuevo en unos minutos.' },
        { status: 500 }
      );
    }
  }

  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const lat = Number(latParam);
  const lon = Number(lonParam);
  if (latParam === null || lonParam === null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: 'Se necesita un municipio válido o coordenadas "lat" y "lon".' },
      { status: 400 }
    );
  }

  // Coordenadas sin municipio conocido: solo Open-Meteo / respaldo.
  const data = await getWeather({
    name: `${lat.toFixed(3)},${lon.toFixed(3)}`,
    lat,
    lon,
    aemet: '',
  });
  return NextResponse.json(data);
}

export const dynamic = 'force-dynamic';
