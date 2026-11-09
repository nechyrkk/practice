import { writeFile } from 'node:fs/promises';
const urls = {
  2023: 'https://files.mathkang.ru/2023/answers-2023.pdf',
  2024: 'https://files.mathkang.ru/2024/answers-2024.pdf',
  2025: 'https://files.mathkang.ru/2025/answers_2025.pdf',
  2026: 'https://files.mathkang.ru/2026/answers_2026.pdf'
};
for (const [year, url] of Object.entries(urls)) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
    if (!response.ok) throw new Error(String(response.status));
    const data = Buffer.from(await response.arrayBuffer());
    if (data.subarray(0, 4).toString() !== '%PDF') throw new Error('Not PDF');
    await writeFile(new URL(`../data/source-keys/${year}.pdf`, import.meta.url), data);
    console.log(`${year}: ${data.length} bytes`);
  } catch (error) { console.log(`${year}: ${error.message}`); }
}
