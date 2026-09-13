// Server-side only. Uses Hugging Face's free Inference API
// (timbrooks/instruct-pix2pix) instead of OpenAI. Free, but note: this model
// reinterprets the photo based on the instruction — it's not pixel-perfect
// editing like a paid tool, more "guided reimagining" of the uploaded photo.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing HF_API_TOKEN' }) };
  }

  let prompt, imageBase64;
  try {
    ({ prompt, imageBase64 } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!prompt || !prompt.trim() || !imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt or image' }) };
  }

  try {
    const hfResp = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: imageBase64,
        parameters: { prompt },
      }),
    });

    if (!hfResp.ok) {
      let errMsg = 'Hugging Face request failed';
      try {
        const errData = await hfResp.json();
        if (errData.error) {
          errMsg = errData.estimated_time
            ? `Model is waking up — try again in about ${Math.ceil(errData.estimated_time)}s.`
            : errData.error;
        }
      } catch (e) {}
      return { statusCode: hfResp.status, body: JSON.stringify({ error: errMsg }) };
    }

    const arrayBuffer = await hfResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');

    return { statusCode: 200, body: JSON.stringify({ b64 }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected server error' }) };
  }
};
