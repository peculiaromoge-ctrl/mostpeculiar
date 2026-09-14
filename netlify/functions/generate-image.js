// Server-side proxy to Pollinations — free, no key needed, no watermark.
// Kept as a Netlify Function (rather than calling Pollinations directly from
// the browser) so the frontend code doesn't need to change if a provider is
// swapped again later.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let prompt, size;
  try {
    ({ prompt, size } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!prompt || !prompt.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  let width = 1024, height = 1024;
  if (typeof size === 'string' && size.includes('x')) {
    const [w, h] = size.split('x').map(Number);
    if (w && h) { width = w; height = h; }
  }

  // Boost quality automatically — pushes the free model toward its best output
  // regardless of how the prompt was phrased.
  const qualityBoost = 'highly detailed, sharp focus, professional quality, best quality, 4k, realistic lighting';
  const boostedPrompt = `${prompt}, ${qualityBoost}`;

  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(boostedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: 'Image generation failed — try again.' }) };
    }
    const arrayBuffer = await resp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');
    return { statusCode: 200, body: JSON.stringify({ b64 }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected server error' }) };
  }
};
