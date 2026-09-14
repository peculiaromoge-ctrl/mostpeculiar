// Server-side only. Uses Hugging Face's free router API for chat.
// When the model decides the user wants an image made, it embeds a marker:
//   [[GENERATE_IMAGE: a short rich prompt describing the image]]
// The frontend strips that marker and calls generate-image.js (Pollinations).

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

  const systemPrompt = {
    role: 'system',
    content:
      "You are the assistant inside mostpeculiar, a friendly AI creative app. Chat naturally and warmly. " +
      "If, and only if, the user is clearly asking you to create, generate, draw, make, or edit an image, " +
      "reply with a short friendly line AND include this exact marker on its own at the end: " +
      "[[GENERATE_IMAGE: <a short, rich, detailed prompt describing exactly what to create>]]. " +
      "Default to a photorealistic, real-photo style for the image prompt unless the user specifically asks for " +
      "a different look (anime, cartoon, illustration, 3D, painting, etc.) — never default to anime or illustrated style. " +
      "Do not include the marker unless an image was actually requested. Never mention the marker syntax to the user.",
  };

  try {
    // New Hugging Face router, OpenAI-compatible chat endpoint.
    // ":hf-inference" pins it to Hugging Face's own free serverless provider
    // instead of a paid third-party provider.
    const hfResp = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: [systemPrompt, ...messages],
        temperature: 0.8,
      }),
    });

    const data = await hfResp.json();
    if (!hfResp.ok) {
      return {
        statusCode: hfResp.status,
        body: JSON.stringify({ error: data.error?.message || data.error || 'Hugging Face request failed' }),
      };
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Hugging Face returned no reply' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ reply: reply.trim() }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (err.message || 'Unexpected server error') + (err.cause ? ' — ' + err.cause : '') }),
    };
  }
};
