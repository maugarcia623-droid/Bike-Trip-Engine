import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertTrackPointsToGpx,
  detectRouteUrlProvider,
  importRouteFromUrl,
  parseProxyRoutePayload,
} from '../routeUrlImporter';
import { getOrCreateIntegrationConnectionKey } from '../../services/stravaIntegration';
import { exportTripToFit } from '../fitExporter';
import type { TripProfile } from '../../types/trip';

describe('routeUrlImporter.ts', () => {
  it('detects Komoot, RideWithGPS, Bikemap, Strava, and direct file providers', () => {
    const k = detectRouteUrlProvider('https://www.komoot.com/tour/12345678?share_token=abc');
    assert.equal(k.provider, 'komoot');
    assert.equal(k.routeId, '12345678');

    const r = detectRouteUrlProvider('https://ridewithgps.com/routes/44556677');
    assert.equal(r.provider, 'ridewithgps');
    assert.equal(r.routeId, '44556677');

    const b = detectRouteUrlProvider('https://www.bikemap.net/en/r/998877/');
    assert.equal(b.provider, 'bikemap');
    assert.equal(b.routeId, '998877');

    const s = detectRouteUrlProvider('https://www.strava.com/routes/314159265');
    assert.equal(s.provider, 'strava');
    assert.equal(s.routeId, '314159265');

    const d = detectRouteUrlProvider('https://example.org/rides/loire.gpx');
    assert.equal(d.provider, 'direct-file');
  });

  it('synthesizes GPX from track points and parses GPX/TCX proxy payloads', () => {
    const gpx = convertTrackPointsToGpx(
      [
        { lat: 47.2184, lon: -1.5536, ele: 12 },
        { lat: 47.235, lon: -1.51, ele: 28 },
        { lat: 47.26, lon: -1.46, ele: 45 },
      ],
      'Loire Spur'
    );
    assert.ok(gpx.includes('<name>Loire Spur</name>'));

    const gpxOutcome = parseProxyRoutePayload(
      {
        ok: true,
        provider: 'ridewithgps',
        routeId: '44556677',
        format: 'gpx',
        fileName: 'ridewithgps-44556677.gpx',
        content: gpx,
      },
      'ridewithgps',
      '44556677'
    );
    assert.ok(gpxOutcome?.ok);
    assert.equal(gpxOutcome?.provider, 'ridewithgps');
    assert.ok((gpxOutcome?.parsed?.coordinates.length ?? 0) >= 3);
    assert.ok((gpxOutcome?.parsed?.distanceKm ?? 0) > 5);

    const tcxXml = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase>
  <Courses><Course><Name>TCX Loop</Name><Track>
    <Trackpoint><Position><LatitudeDegrees>47.218</LatitudeDegrees><LongitudeDegrees>-1.553</LongitudeDegrees></Position><AltitudeMeters>15</AltitudeMeters></Trackpoint>
    <Trackpoint><Position><LatitudeDegrees>47.248</LatitudeDegrees><LongitudeDegrees>-1.490</LongitudeDegrees></Position><AltitudeMeters>35</AltitudeMeters></Trackpoint>
  </Track></Course></Courses>
</TrainingCenterDatabase>`;
    const prevDomParser = (globalThis as { DOMParser?: unknown }).DOMParser;
    (globalThis as { DOMParser?: unknown }).DOMParser = class MockDomParser {
      parseFromString(xml: string) {
        const tpMatches = Array.from(
          xml.matchAll(
            /<Trackpoint>[\s\S]*?<LatitudeDegrees>([^<]+)<\/LatitudeDegrees>[\s\S]*?<LongitudeDegrees>([^<]+)<\/LongitudeDegrees>(?:[\s\S]*?<AltitudeMeters>([^<]+)<\/AltitudeMeters>)?[\s\S]*?<\/Trackpoint>/g
          )
        );
        const nameMatch = xml.match(/<Name>([^<]+)<\/Name>/);
        return {
          querySelector(sel: string) {
            if (sel === 'parsererror') return null;
            if (sel === 'Course > Name' && nameMatch) return { textContent: nameMatch[1] };
            return null;
          },
          querySelectorAll(sel: string) {
            if (sel !== 'Trackpoint') return [];
            return tpMatches.map((m) => ({
              querySelector(sub: string) {
                if (sub === 'Position > LatitudeDegrees') return { textContent: m[1] };
                if (sub === 'Position > LongitudeDegrees') return { textContent: m[2] };
                if (sub === 'AltitudeMeters' && m[3] !== undefined) return { textContent: m[3] };
                return null;
              },
            }));
          },
        };
      }
    };
    try {
      const tcxOutcome = parseProxyRoutePayload(
        {
          ok: true,
          provider: 'direct-file',
          format: 'tcx',
          fileName: 'loop.tcx',
          content: tcxXml,
        },
        'direct-file'
      );
      assert.ok(tcxOutcome?.ok);
      assert.equal(tcxOutcome?.fileName, 'loop.tcx');
      assert.ok((tcxOutcome?.parsed?.coordinates.length ?? 0) === 2);
    } finally {
      if (prevDomParser === undefined) {
        delete (globalThis as { DOMParser?: unknown }).DOMParser;
      } else {
        (globalThis as { DOMParser?: unknown }).DOMParser = prevDomParser;
      }
    }

    const sampleTrip = {
      id: 'fit-proxy-test',
      name: 'Fit Proxy Route',
      tag: 'Sport',
      description: 'Test',
      createdAt: '2026-11-18T00:00:00Z',
      updatedAt: '2026-11-18T00:00:00Z',
      physics: {
        riderWeightKg: 70,
        bikeWeightKg: 9,
        gearWeightKg: 1,
        cda: 0.32,
        crr: 0.0045,
        rho: 1.225,
        drivetrainEfficiency: 0.97,
        grossMechanicalEfficiency: 0.22,
        gradientPercent: 0,
      },
      route: {
        distanceKm: 12,
        targetSpeedKmH: 25,
        urbanTrafficDelayMinutes: 0,
        gateSecurityDelayMinutes: 0,
        coordinates: [
          [47.2184, -1.5536],
          [47.25, -1.49],
        ],
      },
      office: {
        shiftStartTime: '09:00',
        targetGateArrivalTime: '08:45',
        gateName: 'Main',
        lockerRefuelMinutes: 5,
      },
      weather: {
        temperatureC: 15,
        windDirection: 'calm',
        windDirectionDegrees: 0,
        baseWindSpeedKmH: 5,
        isHeadwindActive: false,
        airDensityRho: 1.225,
        precipitationRiskPercent: 0,
      },
      nutrition: { carbAbsorptionCeilingGramsPerHour: 60 },
      checklist: [],
    } as unknown as TripProfile;

    const fitBytes = exportTripToFit(sampleTrip, {
      includeFuelingCues: false,
      includeClimbCues: false,
    });
    const fitBase64 = btoa(String.fromCharCode(...fitBytes));
    const fitOutcome = parseProxyRoutePayload(
      {
        ok: true,
        provider: 'direct-file',
        format: 'fit',
        fileName: 'proxy-route.fit',
        contentBase64: fitBase64,
      },
      'direct-file'
    );
    assert.ok(fitOutcome?.ok);
    assert.equal(fitOutcome?.fileName, 'proxy-route.fit');
    assert.equal(fitOutcome?.parsed?.coordinates.length, 2);
  });

  it('imports route via injected proxyInvoker in importRouteFromUrl', async () => {
    const gpx = convertTrackPointsToGpx(
      [
        { lat: 48.8566, lon: 2.3522, ele: 35 },
        { lat: 48.88, lon: 2.39, ele: 55 },
      ],
      'Paris Komoot Tour'
    );

    let receivedUrl = '';
    const outcome = await importRouteFromUrl('https://www.komoot.com/tour/551122', {
      proxyInvoker: async (url) => {
        receivedUrl = url;
        return {
          data: {
            ok: true,
            provider: 'komoot',
            routeId: '551122',
            format: 'gpx',
            fileName: 'komoot-551122.gpx',
            content: gpx,
          },
          error: null,
        };
      },
    });

    assert.equal(receivedUrl, 'https://www.komoot.com/tour/551122');
    assert.equal(outcome.ok, true);
    assert.equal(outcome.provider, 'komoot');
    assert.equal(outcome.routeId, '551122');
    assert.ok((outcome.parsed?.distanceKm ?? 0) > 2);

    // Strava route resolution via proxy + stable connectionKey UUID
    const connKey = getOrCreateIntegrationConnectionKey();
    assert.match(connKey, /^[0-9a-f-]{36}$/i);

    const stravaGpx = convertTrackPointsToGpx(
      [
        { lat: 47.2184, lon: -1.5536, ele: 15 },
        { lat: 47.265, lon: -1.49, ele: 42 },
      ],
      'Strava Coastal Loop'
    );
    const stravaOutcome = await importRouteFromUrl('https://www.strava.com/routes/987654321', {
      proxyInvoker: async () => ({
        data: {
          ok: true,
          provider: 'strava',
          routeId: '987654321',
          format: 'gpx',
          fileName: 'strava-987654321.gpx',
          content: stravaGpx,
        },
        error: null,
      }),
    });
    assert.equal(stravaOutcome.ok, true);
    assert.equal(stravaOutcome.provider, 'strava');
    assert.equal(stravaOutcome.routeId, '987654321');
    assert.ok((stravaOutcome.parsed?.distanceKm ?? 0) > 4);
  });
});
