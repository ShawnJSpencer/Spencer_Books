# Spencer Library · setup

The app lives at **https://shawnjspencer.github.io/Spencer_Books/**

It uses the **same Firebase project as the food storage app** (`sf-fs-21942`), so there's no new project to make and your existing logins work. Books are kept separately under `libraries/spencer`.

---

## 1. Turn on GitHub Pages (1 min, skip if the link above already opens)
Repo **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → **Save**. Wait a minute.

## 2. Let the book library into your Firebase (2 min)
1. https://console.firebase.google.com → open the **sf-fs** project.
2. **Build → Firestore Database → Rules** tab.
3. Select everything there, delete it, and paste the whole `firestore.rules` file from this repo.
   (It keeps the food storage rules exactly the same and adds a matching block for the books.)
4. Click **Publish**.

That's it for Firebase — sign-in (Email/Password) and the `shawnjspencer.github.io` domain are already set up from the food storage app.

## 3. Sign in on each device
Open the app → gear icon → **Sync** → sign in with the **same email and password you use for the food storage app**.
The dot by the gear turns green and says *synced*. Your wife signs in with her food-storage login too.

## 4. Turn on shelf-photo reading (Claude API key)
Reading book spines from a photo — and filling in age ranges, series and genres — uses Claude.
1. https://console.anthropic.com → sign in → **Settings → API keys → Create key**. Add a few dollars of credit under **Billing** if the account is new.
2. In the app: gear → **Claude** → paste the key → **Test the key** → **Save settings**.
   The key is stored in your private Firebase library, so the iPad and iPhone both get it.

## 5. Put it on the Home Screen
On the iPad and the iPhone: open the link in **Safari → Share → Add to Home Screen**.

---

### How to use it
* **Scan barcode** — same scanner as the food storage app; opens on the Close-up 0.5× lens. Owned books show where they live and who's read them. Tick **Quick add** to scan a stack without stopping, and pick **New books go on** to put them straight into a cube.
* **Photo a shelf** — pick the cube (rows A–D top to bottom, columns 1–4 left to right), take the picture straight on. Spines it isn't sure about flash amber, unreadable ones flash orange; tap one to confirm, pick another match, type the title, or scan its barcode.
* **Shopping list** — wishlist per daughter, the next book in each series they're reading, and series they didn't like.
* **Backup** — gear → Download a backup (books and settings, no photos).

### Files
`index.html` (layout & styles) · `app.js` (everything else) · `scanner.js` (the SF-FS barcode reader) · `config.js` (Firebase + Claude model) · `firestore.rules` · `sw.js` (offline) · `tools/make_icons.py`
