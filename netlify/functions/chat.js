// Server-side only. Uses Hugging Face's free Inference API for chat instead
// of OpenAI, so conversation costs nothing. When the model decides the user
// wants an image made, it embeds a marker in its reply:
//   [[GENERATE_IMAGE: a short rich prompt describing the image]]
// The frontend looks for that marker, strips it from the displayed text, and
// calls generate-image.js (or edit-image.js if a photo was attached).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing HF_API_TOKEN' }) };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages' }) };
  }

  const systemPrompt =
    "You are the assistant inside mostpeculiar, a friendly AI creative app. Chat naturally and warmly. " +
    "If, and only if, the user is clearly asking you to create, generate, draw, make, or edit an image, " +
    "reply with a short friendly line AND include this exact marker on its own at the end: " +
    "[[GENERATE_IMAGE: <a short, rich, detailed prompt describing exactly what to create>]]. " +
    "Do not include the marker unless an image was actually requested. Never mention the marker syntax to the user.";

  // Build a single chat-formatted prompt for the HF text-generation model.
  const formatted = [
    `<|system|>\n${systemPrompt}</s>`,
    ...messages.map(m => `<|${m.role === 'user' ? 'user' : 'assistant'}|>\n${m.content}</s>`),
    '<|assistant|>',
  ].join('\n');

  try {
    const hfResp = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: formatted,
        parameters: { max_new_tokens: 400, temperature: 0.8, return_full_text: false },
      }),
    });

    const data = await hfResp.json();

    if (!hfResp.ok) {
      const errMsg = data.error
        ? (data.estimated_time ? `Model is waking up — try again in about ${Math.ceil(data.estimated_time)}s.` : data.error)
        : 'Hugging Face request failed';
      return { statusCode: hfResp.status, body: JSON.stringify({ error: errMsg }) };
    }

    const reply = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
    if (!reply) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Hugging Face returned no reply' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ reply: reply.trim() }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected server error' }) };
  }
};
