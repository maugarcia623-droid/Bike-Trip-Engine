import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

describe('Universal Links (AASA + vercel.json)', () => {
  it('defines valid public/.well-known/apple-app-site-association with expected appIDs and paths', () => {
    const aasaPath = resolve(cwd(), 'public/.well-known/apple-app-site-association');
    const raw = readFileSync(aasaPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      applinks?: {
        details?: Array<{
          appIDs?: string[];
          components?: Array<{ '/'?: string; comment?: string }>;
        }>;
      };
    };

    const details = parsed.applinks?.details;
    assert.ok(Array.isArray(details) && details.length > 0);
    const entry = details[0];
    assert.ok(Array.isArray(entry.appIDs));
    assert.ok(entry.appIDs.includes('TEAM_ID.cc.ridecadence.app'));

    const paths = (entry.components ?? []).map((c) => c['/']);
    assert.ok(paths.includes('/p/*'));
    assert.ok(paths.includes('/tools'));
    assert.ok(paths.includes('/tools/*'));
    assert.ok(paths.includes('/oauth/*'));
  });

  it('configures vercel.json Content-Type: application/json header and excludes .well-known from SPA rewrite', () => {
    const vercelPath = resolve(cwd(), 'vercel.json');
    const raw = readFileSync(vercelPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      headers?: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    const aasaHeaderRule = parsed.headers?.find(
      (h) => h.source === '/.well-known/apple-app-site-association'
    );
    assert.ok(aasaHeaderRule, 'Missing headers rule for /.well-known/apple-app-site-association');
    assert.ok(
      aasaHeaderRule.headers.some(
        (hdr) =>
          hdr.key.toLowerCase() === 'content-type' && hdr.value === 'application/json'
      ),
      'Missing Content-Type: application/json header on AASA route'
    );

    const rewrites = parsed.rewrites ?? [];
    assert.ok(rewrites.some((r) => r.source === '/p/:code' && r.destination === '/api/p?code=:code'));
    assert.ok(rewrites.some((r) => r.source === '/tools' && r.destination === '/api/tools'));
    assert.ok(rewrites.some((r) => r.source === '/tools/:slug' && r.destination === '/api/tools?slug=:slug'));

    const spaCatchAll = rewrites.find((r) => r.destination === '/index.html');
    assert.ok(spaCatchAll, 'Missing SPA catch-all rewrite');
    assert.ok(spaCatchAll.source.includes('\\.well-known/'));

    const spaRegex = new RegExp(`^${spaCatchAll.source}$`);
    assert.equal(spaRegex.test('/.well-known/apple-app-site-association'), false);
    assert.equal(spaRegex.test('/plan'), true);
    assert.equal(spaRegex.test('/oauth/callback'), true);
  });
});
