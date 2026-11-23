import sys
import urllib.request
import urllib.error

routes = sys.argv[1:]
for r in routes:
    url = f"http://localhost:3000{r}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            print(f"{r}: {resp.status} {resp.reason}")
    except urllib.error.HTTPError as e:
        print(f"{r}: {e.code} {e.reason}")
    except Exception as e:
        print(f"{r}: ERROR {e}")

