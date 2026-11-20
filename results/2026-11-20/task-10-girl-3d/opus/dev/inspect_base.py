import numpy as np
V=[]; groups={}; cur=None; F=[]
for line in open('input/base.obj'):
    if line.startswith('v '):
        x,y,z=[float(t) for t in line.split()[1:4]]
        V.append([x*0.1, -z*0.1, (y+8.168)*0.1])
    elif line.startswith('g '):
        cur=line.split()[1]
    elif line.startswith('f '):
        idx=[int(t.split('/')[0])-1 for t in line.split()[1:]]
        groups.setdefault(cur,[]).append(idx); F.append((cur,idx))
V=np.array(V)
for g in ['helper-l-eye','helper-r-eye','helper-upper-teeth','helper-lower-teeth','helper-tongue','helper-hair','helper-l-eyelashes-1','helper-l-eyelashes-2']:
    if g not in groups: print('missing',g); continue
    ids=sorted(set(i for f in groups[g] for i in f))
    c=V[ids]
    print(g, len(ids), 'min', c.min(0).round(4), 'max', c.max(0).round(4), 'center', c.mean(0).round(4))
# body arms
ids=sorted(set(i for f in groups['body'] for i in f))
c=V[ids]
print('body', len(ids), c.min(0).round(3), c.max(0).round(3))
arm=c[(np.abs(c[:,0])>0.25)&(c[:,2]>0.8)]
print('arm region', len(arm), arm.min(0).round(3), arm.max(0).round(3))
