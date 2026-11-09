# 배포 전에 실행: app/ 와 루트 js·css 파일 내용의 해시로 index.html의 ?v= 값을 갱신
# (파일을 고치고 이 스크립트를 돌리면 휴대폰이 새 파일을 받음)
import re,hashlib,os
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/..')
s=open('index.html').read()
def rep(m):
    path=m.group(1)
    f=path.lstrip('/')
    if not os.path.exists(f): return m.group(0)
    h=hashlib.md5(open(f,'rb').read()).hexdigest()[:10]
    return path+'?v='+h
s2=re.sub(r'(/(?:app/)?[\w.-]+\.(?:js|css))\?v=[\w.-]+',rep,s)
open('index.html','w').write(s2)
print('\n'.join(re.findall(r'/(?:app/)?[\w.-]+\.(?:js|css)\?v=[\w.-]+',s2)))
