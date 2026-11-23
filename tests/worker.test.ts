// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import worker, { type Env, readLimitedBody } from '../apps/worker/src/index';
let env: Env;
const payload = { facts: 'Built a React dashboard.', tone: 'concise', token: 'verified-token' };
function req(
  body: unknown = payload,
  origin = 'https://example.github.io',
  path = '/api/ai/summary',
) {
  return new Request(`https://api.example.com${path}`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1',
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  env = {
    AI: {
      run: vi.fn().mockResolvedValue({
        choices: [
          {
            message: { content: JSON.stringify({ text: 'Built a React dashboard.', notes: [] }) },
          },
        ],
      }),
    },
    AI_ENABLED: 'true',
    AI_MODEL: 'model',
    ALLOWED_ORIGINS: 'https://example.github.io',
    TURNSTILE_HOSTNAMES: 'example.github.io',
    TURNSTILE_SECRET: 'test-only',
    IP_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    SERVICE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, hostname: 'example.github.io', action: 'resume-ai' }),
      ),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('Worker security and failures', () => {
  it('answers health without invoking AI', async () => {
    const r = await worker.fetch(new Request('https://api.example.com/api/health'), env);
    expect(r.status).toBe(200);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('denies an unconfigured origin', async () => {
    const r = await worker.fetch(req(payload, 'https://attacker.example'), env);
    expect(r.status).toBe(403);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('handles preflight for allowed origin', async () => {
    const r = await worker.fetch(
      new Request('https://api.example.com/api/ai/summary', {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.github.io' },
      }),
      env,
    );
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://example.github.io');
  });
  it('fails closed when disabled or missing Turnstile secret', async () => {
    env.AI_ENABLED = 'false';
    expect((await worker.fetch(req(), env)).status).toBe(503);
    env.AI_ENABLED = 'true';
    env.TURNSTILE_SECRET = undefined;
    expect((await worker.fetch(req(), env)).status).toBe(503);
  });
  it('validates request payload limits', async () => {
    expect((await worker.fetch(req({ ...payload, facts: 'x' }), env)).status).toBe(400);
    expect((await worker.fetch(req({ ...payload, facts: 'x'.repeat(6501) }), env)).status).toBe(
      400,
    );
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('rejects unknown fields and unsupported endpoints', async () => {
    expect((await worker.fetch(req({ ...payload, secret: 'x' }), env)).status).toBe(400);
    expect(
      (await worker.fetch(req(payload, 'https://example.github.io', '/api/ai/unknown'), env))
        .status,
    ).toBe(404);
  });
  it('limits actual streamed body bytes', async () => {
    const r = await worker.fetch(req({ ...payload, facts: 'x'.repeat(17000) }), env);
    expect(r.status).toBe(413);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('counts bytes rather than characters', async () => {
    await expect(
      readLimitedBody(
        new Request('https://example.com', { method: 'POST', body: '₹'.repeat(10) }),
        20,
      ),
    ).rejects.toThrow('TOO_LARGE');
  });
  it('applies the IP limit', async () => {
    vi.mocked(env.IP_LIMITER.limit).mockResolvedValue({ success: false });
    const r = await worker.fetch(req(), env);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('60');
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('applies the approximate service limit', async () => {
    vi.mocked(env.SERVICE_LIMITER.limit).mockResolvedValue({ success: false });
    expect((await worker.fetch(req(), env)).status).toBe(429);
  });
  it('requires verification token', async () => {
    expect((await worker.fetch(req({ ...payload, token: '' }), env)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('verifies token hostname and action', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ success: true, hostname: 'other.example', action: 'resume-ai' }),
    );
    expect((await worker.fetch(req(), env)).status).toBe(403);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('rejects expired tokens', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ success: false }));
    expect((await worker.fetch(req(), env)).status).toBe(403);
  });
  it('returns a validated suggestion and bounds output', async () => {
    const r = await worker.fetch(req(), env);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { suggestion: { text: string } }).suggestion.text).toBe(
      'Built a React dashboard.',
    );
    expect(env.AI.run).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ max_completion_tokens: 700 }),
      expect.anything(),
    );
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });
  it('does not expose provider errors or personal content', async () => {
    vi.mocked(env.AI.run).mockRejectedValue(new Error('PRIVATE_DETAILS'));
    const r = await worker.fetch(req(), env);
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain('PRIVATE_DETAILS');
  });
  it('rejects invalid AI content without rewriting input', async () => {
    vi.mocked(env.AI.run).mockResolvedValue({ response: 'invented' });
    expect((await worker.fetch(req(), env)).status).toBe(502);
  });
});
