import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGpxFileContent } from '../gpxParser';

describe('gpxParser.ts', () => {
  it('parses GPX track points, distance, elevation gain/loss, and arrow-delimited route labels', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CadenceTest">
  <trk>
    <name>Nantes -> Ancenis</name>
    <trkseg>
      <trkpt lat="47.2184" lon="-1.5536"><ele>10</ele></trkpt>
      <trkpt lat="47.2400" lon="-1.4500"><ele>120</ele></trkpt>
      <trkpt lat="47.2600" lon="-1.3500"><ele>150</ele></trkpt>
      <trkpt lat="47.2900" lon="-1.2800"><ele>40</ele></trkpt>
      <trkpt lat="47.3200" lon="-1.2200"><ele>20</ele></trkpt>
      <trkpt lat="47.3667" lon="-1.1833"><ele>90</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const res = parseGpxFileContent(gpx, 'nantes_ancenis.gpx');

    assert.equal(res.trackName, 'Nantes -> Ancenis');
    assert.equal(res.originLabel, 'Nantes');
    assert.equal(res.destLabel, 'Ancenis');
    assert.ok(res.distanceKm > 25 && res.distanceKm < 45);
    assert.ok(res.elevationGainM > 0);
    assert.ok(res.elevationLossM > 0);
    assert.ok(res.coordinates.length >= 4);
    assert.ok(res.elevationProfile.length >= 4);
  });

  it('detects loop routes when start and end are within 1.5 km and distance > 4 km', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Sunday Loop</name>
    <trkseg>
      <trkpt lat="47.2184" lon="-1.5536"><ele>15</ele></trkpt>
      <trkpt lat="47.2500" lon="-1.5000"><ele>25</ele></trkpt>
      <trkpt lat="47.2190" lon="-1.5530"><ele>15</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const res = parseGpxFileContent(gpx);
    assert.equal(res.originLabel, 'Sunday Loop');
    assert.equal(res.destLabel, 'Sunday Loop (Loop)');
  });

  it('throws when fewer than 2 valid track points are present', () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg><trkpt lat="47.2184" lon="-1.5536"></trkpt></trkseg></trk>
</gpx>`;

    assert.throws(() => parseGpxFileContent(gpx), /fewer than 2/);
  });
});
