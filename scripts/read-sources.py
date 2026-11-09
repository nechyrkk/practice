import json
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp' / 'sources'
OUT.mkdir(parents=True, exist_ok=True)
summary = []
for source in sorted((ROOT / 'исходники').glob('*.pdf')):
    pages = []
    with pdfplumber.open(source) as pdf:
        for index, page in enumerate(pdf.pages):
            pages.append({
                'page': index + 1, 'width': float(page.width), 'height': float(page.height),
                'text': page.extract_text(layout=True) or '',
                'words': page.extract_words(x_tolerance=2, y_tolerance=3),
            })
    (OUT / (source.stem + '.json')).write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / (source.stem + '.txt')).write_text('\n\n'.join('=== PAGE %s ===\n%s' % (page['page'], page['text']) for page in pages), encoding='utf-8')
    summary.append({'file': source.name, 'pages': len(pages), 'dimensions': [(p['width'], p['height']) for p in pages], 'characters': [len(p['text'].strip()) for p in pages]})
print(json.dumps(summary, ensure_ascii=False, indent=2))
