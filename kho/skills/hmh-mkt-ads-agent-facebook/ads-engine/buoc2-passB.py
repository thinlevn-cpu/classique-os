#!/usr/bin/env python3
# PASS B: thay placeholder __CAMP__ bằng record id Chiến dịch thật trong _adsets.json + _content.json.
# (Dùng python thay sed -i vì sed -i làm hỏng/bay file trên path tiếng Việt có dấu cách trong Git Bash.)
import sys
DIR, CAMP = sys.argv[1], sys.argv[2]
for fn in ('_adsets.json', '_content.json'):
    p = DIR + '/' + fn
    s = open(p, encoding='utf-8').read().replace('__CAMP__', CAMP)
    open(p, 'w', encoding='utf-8').write(s)
print("REPLACED")
