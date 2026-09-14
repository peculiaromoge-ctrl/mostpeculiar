# mostpeculiar — deploy instructions (100% free version, v2)

## What changed from the last version
Hugging Face shut down their old free image-generation API in 2025. Big
image models now cost money through their new "Inference Providers"
system, so this version goes back to Pollinations for images (free,
unlimited, no key, no watermark) and keeps chat on Hugging Face's free
router with a small free model.

## Folder structure
```
index.html                            <- the app
netlify.toml                          <- tells Netlify where the functions live
netlify/functions/generate-image.js   <- server-side: creates images (Pollinations, free)
netlify/functions/edit-image.js       <- server-side: same as above (see limitation below)
netlify/functions/chat.js             <- server-side: chat (Hugging Face free router)
```

## Honest limitation: image "editing"
There is currently no free API that can actually see and edit the pixels
of an uploaded photo. When a photo is attached, the app generates a brand
NEW image from the typed description — it does not use the uploaded
photo's actual content. The UI says this plainly so it's never a surprise.

## Cost
$0. Pollinations needs no key at all. Chat needs a free Hugging Face
token (no card required).

## Steps to deploy
1. Get a free Hugging Face token: huggingface.co/settings/tokens -> New
   token -> Role: Read.
2. Push this folder to a GitHub repo, or update your existing one.
3. Netlify -> Site settings -> Environment variables -> HF_API_TOKEN ->
   paste your token.
4. Trigger a redeploy (Deploys tab -> Trigger deploy).
5. Test: Chat -> ask it to create an image.

## Things to know
- Pollinations (images) — genuinely free and unlimited, may occasionally
  be slower during high traffic, but doesn't need a token.
- Hugging Face chat — free tier, occasional slow response or "model
  loading" message on first use after inactivity.
