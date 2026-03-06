# Gospel Harmony (Netlify-ready)

## 1) Install
npm install

## 2) KJV data (local)
Put your KJV verse JSON at:
source/kjv.json

Expected format:
[
  { "book":"Matthew", "chapter":1, "verse":1, "text":"..." },
  ...
]

Then run:
npm run build:kjv

This generates:
public/data/kjv/<Book>/<Chapter>.json

## 3) Run locally
npm run dev

## 4) Deploy to Netlify
- Push to GitHub
- Netlify: "New site from Git"
- Build command: npm run build
- Publish directory: dist

## 5) Optional ESV
- Create an ESV API key (Crossway)
- In Netlify > Site settings > Environment variables:
  ESV_API_KEY = <your key>
- Then select ESV in the app

## Notes
- Harmony data is in public/data/harmony.json
- Expand pericopes/passages to add more stories.