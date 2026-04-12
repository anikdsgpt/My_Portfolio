# My Portfolio

Portfolio website for Anik Dasgupta.

## Project Structure

- `anik-portfolio/` - main static website files (`index.html`, `styles.css`, `scripts.js`)
- `index.html` - root redirect used for GitHub Pages

## Run Locally

From repo root:

```powershell
cd anik-portfolio
python -m http.server 5500
```

Open:

- `http://127.0.0.1:5500/index.html`

## Deploy to GitHub Pages

1. Open repository settings on GitHub.
2. Go to **Pages**.
3. Under **Build and deployment**:
	- Source: **Deploy from a branch**
	- Branch: **main**
	- Folder: **/(root)**
4. Save.

After deployment, site URL will be:

- `https://anikdsgpt.github.io/My_Portfolio/`

