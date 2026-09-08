from pathlib import Path

LIVE = 'https://live.playgarba.com'
APEX = 'https://playgarba.com'

# Main player: make the configured GitHub Pages origin canonical and make Explore real source markup.
p = Path('index.html')
html = p.read_text().replace(APEX, LIVE)
old_button = '''          <button class="browse-button" id="browseButton" type="button" aria-expanded="false" aria-controls="songSheet">
            <span>Browse songs</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"></path></svg>
          </button>'''
new_link = '''          <a class="browse-button" id="browseButton" href="./catalogue/" aria-label="Explore PlayGarba catalogue" style="text-decoration:none">
            <span>Explore</span>
          </a>'''
if old_button not in html:
    raise SystemExit('Could not locate source Browse songs button.')
p.write_text(html.replace(old_button, new_link, 1))

# app.js: Explore is navigation, not the legacy in-player song sheet.
p = Path('app.js')
js = p.read_text()
old = "  els.browseButton.setAttribute('aria-expanded', String(open));"
new = "  if (els.browseButton?.hasAttribute('aria-controls')) els.browseButton.setAttribute('aria-expanded', String(open));"
if old not in js:
    raise SystemExit('Could not locate browse aria-expanded sync.')
js = js.replace(old, new, 1)
old = '''  els.browseButton.addEventListener('click', () => {
    if (state.sheetSnap === 'closed' || state.sheetSnap === 'collapsed') openSheet('all', { trigger: els.browseButton });
    else closeSheet();
  });'''
new = '''  if (els.browseButton?.tagName !== 'A') {
    els.browseButton?.addEventListener('click', () => {
      if (state.sheetSnap === 'closed' || state.sheetSnap === 'collapsed') openSheet('all', { trigger: els.browseButton });
      else closeSheet();
    });
  }'''
if old not in js:
    raise SystemExit('Could not locate Browse click handler.')
p.write_text(js.replace(old, new, 1))

# Crawlable player surfaces belong to live.playgarba.com.
Path('CNAME').write_text('live.playgarba.com\n')
for path in ['robots.txt', 'sitemap.xml', 'src/catalogue/index.html', 'scripts/lib/inject-social-preview.mjs']:
    p = Path(path)
    p.write_text(p.read_text().replace(APEX, LIVE))

# Deployment packages source directly. It no longer rewrites product behavior or hostname ownership.
p = Path('.github/workflows/pages.yml')
pages = p.read_text()
start = pages.index('          # Explore is a real navigation surface.')
end = pages.index('          cat \\\n', start)
explore_checks = '''          # Explore is source-native navigation; deployment must preserve it.
          grep -q 'href="./catalogue/"' _site/index.html || { echo 'Homepage Explore link missing'; exit 1; }
          grep -q '<span>Explore</span>' _site/index.html || { echo 'Homepage Explore label missing'; exit 1; }
          ! grep -q 'id="browseButton"[^>]*aria-controls' _site/index.html || { echo 'Explore must not retain song-sheet semantics'; exit 1; }

'''
pages = pages[:start] + explore_checks + pages[end:]

start = pages.index('          # Emergency rollback:')
end = pages.index('          for src in ', start)
domain_checks = '''          # GitHub Pages owns the listening origin directly.
          test "$(tr -d '\\r\\n' < _site/CNAME)" = 'live.playgarba.com' || { echo 'CNAME must be live.playgarba.com'; exit 1; }
          grep -q '^Sitemap: https://live.playgarba.com/sitemap.xml$' _site/robots.txt || { echo 'robots.txt missing live sitemap'; exit 1; }
          grep -q '<loc>https://live.playgarba.com/</loc>' _site/sitemap.xml || { echo 'sitemap.xml missing live root'; exit 1; }
          grep -q '<loc>https://live.playgarba.com/catalogue/</loc>' _site/sitemap.xml || { echo 'sitemap.xml missing live catalogue'; exit 1; }

'''
pages = pages[:start] + domain_checks + pages[end:]
pages = pages.replace(APEX, LIVE)

marker = '          # Keep the deploy artifact on the apex until the live-subdomain infrastructure'
start = pages.index(marker)
end = pages.index('          touch _site/.nojekyll', start)
final_checks = '''          # Production artifact and metadata must stay on the configured live origin.
          grep -q '<link rel="canonical" href="https://live.playgarba.com/"' _site/index.html || { echo 'Player canonical must use live host'; exit 1; }
          grep -q '<link rel="canonical" href="https://live.playgarba.com/catalogue/"' _site/catalogue/index.html || { echo 'Catalogue canonical must use live host'; exit 1; }
          grep -q 'https://live.playgarba.com/assets/social/garba-og-card.png' _site/index.html || { echo 'Player social preview must use live host'; exit 1; }

'''
pages = pages[:start] + final_checks + pages[end:]
p.write_text(pages)

# Update regression guards to the real listening origin.
p = Path('scripts/validate-runtime-packaging.mjs')
p.write_text(p.read_text().replace(APEX, LIVE))
