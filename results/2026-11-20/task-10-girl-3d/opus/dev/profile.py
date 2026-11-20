import numpy as np
V=[]
for line in open('input/upper-body.obj'):
    if line.startswith('v '):
        V.append([float(t) for t in line.split()[1:4]])
V=np.array(V)
mid=V[np.abs(V[:,0])<0.0015]
print('midline front profile (z, y_front, y_back)')
for z in np.arange(1.40,1.68,0.01):
    s=mid[np.abs(mid[:,2]-z)<0.005]
    if len(s): print(round(z,3), round(s[:,1].min(),4), round(s[:,1].max(),4))
print('width profile (z, max|x|, y at max)')
for z in np.arange(1.38,1.68,0.01):
    s=V[np.abs(V[:,2]-z)<0.004]
    s=s[s[:,1]<0.06]
    if len(s):
        i=np.argmax(np.abs(s[:,0])); print(round(z,3), round(abs(s[i,0]),4), round(s[i,1],4))
# face width at front: for each z, max |x| among verts with y < -0.09
print('front face width (y<-0.10)')
for z in np.arange(1.40,1.62,0.01):
    s=V[(np.abs(V[:,2]-z)<0.004)&(V[:,1]<-0.10)]
    if len(s): print(round(z,3), round(np.abs(s[:,0]).max(),4))
# mouth corners: vertices near z 1.46-1.48 forming crease: find verts with y<-0.13 and |x| max in 1.455-1.485
s=V[(V[:,2]>1.45)&(V[:,2]<1.49)&(V[:,1]<-0.125)]
print('mouth region lateral', np.abs(s[:,0]).max())
# ears
s=V[(np.abs(V[:,0])>0.07)&(V[:,2]>1.45)&(V[:,2]<1.6)]
print('ear region bounds', s.min(0), s.max(0))
