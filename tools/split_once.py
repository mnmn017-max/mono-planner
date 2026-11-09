# index.html의 큰 인라인 CSS/JS를 app/ 아래 파일로 꺼냄 (한 번만 실행)
import re,hashlib
s=open('index.html').read()
def h(b): return hashlib.md5(b.encode()).hexdigest()[:10]
# 1) style (단 하나, head 안)
m=re.search(r'<style>(.*?)</style>',s,re.S); css=m.group(1)
open('app/style.css','w').write(css)
s=s[:m.start()]+'<link rel="stylesheet" href="/app/style.css?v=%s">'%h(css)+s[m.end():]
# 2) 큰 일반 스크립트(boot)
ms=[x for x in re.finditer(r'<script>(.*?)</script>',s,re.S) if len(x.group(1))>50000]
assert len(ms)==1; x=ms[0]; js=x.group(1)
open('app/boot.js','w').write(js)
s=s[:x.start()]+'<script src="/app/boot.js?v=%s"></script>'%h(js)+s[x.end():]
# 3) 모듈 스크립트(main)
x=re.search(r'<script type="module">(.*?)</script>',s,re.S); js=x.group(1)
open('app/main.js','w').write(js)
s=s[:x.start()]+'<script type="module" src="/app/main.js?v=%s"></script>'%h(js)+s[x.end():]
# modulepreload: head 끝에서 미리 받기 시작
s=s.replace('</head>','<link rel="modulepreload" href="/app/main.js?v=%s">\n</head>'%h(js),1)
open('index.html','w').write(s)
print(len(s.encode()))
