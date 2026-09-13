# mostpeculiar — deploy instructions (100% free version)

## Folder structure
```
index.html                            <- the app
netlify.toml                          <- tells Netlify where the functions live
netlify/functions/generate-image.js   <- server-side: text-to-image (Hugging Face, free)
netlify/functions/edit-image.js       <- server-side: image editing (Hugging Face, free)
netlify/functions/chat.js             <- server-side: chat (Hugging Face, free)
```

## Cost
Nothing. Everything runs on Hugging Face's free Inference API. There is no
billing setup, no card required for a basic Hugging Face account.

## Steps to deploy

1. Create a free Hugging Face account: huggingface.co/join

2. Get a free API token: huggingface.co/settings/tokens
   -> "New token" -> Role: "Read" is enough -> Copy it.

3. Push this whole folder to a GitHub repo (functions only work through
   Netlify's Git-based deploys, not drag-and-drop Netlify Drop).

4. On netlify.com -> Add new site -> Import from Git -> pick this repo.

5. Go to: Site settings -> Environment variables -> Add a variable
   Key:   HF_API_TOKEN
   Value: (paste your Hugging Face token)

6. Redeploy the site (Deploys tab -> Trigger deploy) so the functions pick
   up the new environment variable.

7. Test: open the site, go to Chat, ask it to create an image, then try
   attaching a photo with an edit instruction.

## Things to know about the free tier
- First request after a while of inactivity can be slow ("model is waking
  up") — this is Hugging Face's free hosting spinning the model back up,
  not a bug. Retrying after the suggested wait fixes it.
- Image editing (InstructPix2Pix) reinterprets the photo based on your
  instruction rather than doing pixel-perfect edits like a paid tool would.
- No watermark, no branding added to any image — completely clean output.

## Why Netlify Drop won't work
Netlify Drop only accepts a single HTML/zip and doesn't run serverless
functions. These functions need a Git-connected Netlify site + the
HF_API_TOKEN environment variable to work.
