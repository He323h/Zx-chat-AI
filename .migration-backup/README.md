<<<<<<< HEAD
# EngliFly — Vercel Deployment Guide


## Vercel pe deploy kaise karein (FREE, lifetime)

### Step 1: GitHub account banayein
https://github.com → Sign up (free)

### Step 2: New Repository banayein
1. github.com/new pe jaayein
2. Repository name: `englifly`
3. Private ya Public — koi bhi chalega
4. "Create repository" dabayein

### Step 3: Files upload karein
1. "uploading an existing file" link pe click karein
2. Is folder ke SAARE files select karein → drag & drop karein
3. "Commit changes" dabayein

### Step 4: Vercel pe deploy karein
1. https://vercel.com → Sign up with GitHub
2. "New Project" → apna `englifly` repo select karein
3. Framework: **Vite** select karein
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. **Environment Variables** mein add karein:
   - Key: `VITE_OPENAI_API_KEY`
   - Value: apni OpenAI API key (platform.openai.com se)
7. "Deploy" dabayein!

### Step 5: URL milegi!
Kuch minutes mein aapko milega:
`https://englifly-yourname.vercel.app`

Yahi URL Android app mein daalein!

---

## Android App mein URL kaise daalein
`englifly_android` project mein:
```
app/src/main/kotlin/com/englifly/app/MainActivity.kt
```
Yeh line badlein:
```kotlin
private val APP_URL = "https://englifly-yourname.vercel.app"
```

---

## Future mein kuch bhi badlna ho:
1. GitHub pe file edit karein
2. Vercel apne aap deploy kar dega — 1-2 min mein
3. Android app apne aap update ho jaayega — kuch nahi karna!
=======
# Zx-chat-AI
>>>>>>> be9f650d8563b45224c5d93acce76f87e46f1d4a
