// Honest limitation: there is no free API left that can actually see and
// pixel-edit an uploaded photo. This function generates a brand NEW image
// from the text instruction via Pollinations — it does NOT use the pixels
// of the uploaded photo. Kept as "edit-image" so the frontend doesn't need
// restructuring, but functionally it's the same as generate-image right now.

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
  const qualityBoost = 'photorealistic, real photograph, DSLR photo, natural skin texture, realistic lighting and shadows, highly detailed, sharp focus, 8k, professional photography';
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
