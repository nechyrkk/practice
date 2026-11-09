from pathlib import Path
from PIL import Image
import pdfplumber

root = Path(__file__).resolve().parents[1]
folder = root / 'tmp/sources'
for source in sorted((root / 'исходники').glob('*.pdf')):
    year = source.stem[-4:]
    with pdfplumber.open(source) as doc:
        for page_index, page in enumerate(doc.pages, 1):
            for side in ['left', 'right']:
                x0, x1 = (0, page.width / 2) if side == 'left' else (page.width / 2, page.width)
                text = page.crop((x0, 0, x1, page.height)).extract_text(layout=False) or ''
                (folder / f'{year}-{page_index}-{side}.txt').write_text(text, encoding='utf-8')
    for page_index in [1, 2]:
        image = Image.open(folder / 'render' / f'{year}-{page_index}.png')
        for side in ['left', 'right']:
            x0, x1 = (0, image.width // 2) if side == 'left' else (image.width // 2, image.width)
            image.crop((x0, 0, x1, image.height)).save(folder / 'render' / f'{year}-{page_index}-{side}.png')
print('Split source text and page images.')
