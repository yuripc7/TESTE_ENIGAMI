import os
import re

ROOT = '.'
EXTENSIONS = ('.tsx', '.ts')
SKIP = ('node_modules', '.git', 'dist')

# Correct UTF-8 bytes for AÇÕES and AÇÃO
ACOES_UTF8 = 'AÇÕES'.encode('utf-8')   # 41 C3 87 C3 95 45 53
ACAO_UTF8  = 'AÇÃO'.encode('utf-8')    # 41 C3 87 C3 95

# Read each file in binary, look for any sequence that looks like A + non-ascii + E/S
total_fixed = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP]
    for fname in filenames:
        if not fname.endswith(EXTENSIONS):
            continue
        fpath = os.path.join(dirpath, fname)
        try:
            raw = open(fpath, 'rb').read()
        except Exception as e:
            print(f"Could not read {fpath}: {e}")
            continue

        # Decode with errors=replace to see garbled chars
        text = raw.decode('utf-8', errors='replace')

        # Find garbled variants - look for A followed by replacement chars (U+FFFD) before ES
        # Also handle Windows-1252 double-encoding patterns
        changed = False

        # Pattern 1: A\uFFFD+ES  (replacement character sequences)
        new_text = re.sub(r'A\uFFFD+ES', 'AÇÕES', text)
        new_text = re.sub(r'A\uFFFD+ES', 'AÇÕES', new_text)
        new_text = re.sub(r'A\uFFFD+EO', 'AÇÃO', new_text)

        # Pattern 2: AÃ‡ÃES, AÃ‡Ã•ES (double-encoded patterns)
        new_text = new_text.replace('AÃ\u0087Ã\u0095ES', 'AÇÕES')
        new_text = new_text.replace('AÃ§Ã\u00b5ES', 'AÇÕES')

        # Pattern 3: AÀTÀ·ES and similar visible corrupt forms
        new_text = re.sub(r'A[\u00c0-\u00ff][\u0040-\u00ff][\u00c0-\u00ff][\u00b0-\u00ff]ES', 'AÇÕES', new_text)
        new_text = re.sub(r'A[\u00c0-\u00ff][\u0040-\u00ff][\u00c0-\u00ff][\u00b0-\u00ff]EO', 'AÇÃO', new_text)

        # Pattern 4: Any A + 2-6 non-ASCII chars + ES (broad catch-all)
        new_text = re.sub(r'A[^\x00-\x7F]{2,6}ES\b', 'AÇÕES', new_text)
        new_text = re.sub(r'A[^\x00-\x7F]{2,6}EO\b', 'AÇÃO', new_text)

        if new_text != text:
            open(fpath, 'w', encoding='utf-8').write(new_text)
            print(f"FIXED: {fpath}")
            total_fixed += 1

print(f"\nTotal files fixed: {total_fixed}")
