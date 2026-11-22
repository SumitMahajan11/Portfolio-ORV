import urllib.request
import re

html = urllib.request.urlopen('http://localhost:3000').read().decode('utf-8')
ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
print("IDs found in HTML:")
for i in sorted(ids):
    print(f"  #{i}")

