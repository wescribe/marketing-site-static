# WeScribe Static Site

This repository contains a static snapshot of the pages listed in the WeScribe page sitemap, along with their referenced stylesheets, scripts, fonts, images, and other page assets.

Open `index.html` to view the site. The sitemap pages are available at:

- `/pricing/`
- `/sitemap/`
- `/cookie-policy/`
- `/privacy-policy/`
- `/terms-of-use/`
- `/demo/`
- `/about/`
- `/preview/`

To refresh the snapshot from the live site, run `node scripts/mirror-site.mjs` from the repository root. The script uses only Node.js built-in modules.

Two CSS sprite files referenced by the live theme currently return 404 and are skipped during mirroring.