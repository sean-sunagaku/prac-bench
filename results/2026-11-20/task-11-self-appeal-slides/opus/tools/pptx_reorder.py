# PPTX の複製を作り、指定した番号のスライドを先頭に並べ替える（QuickLook のサムネイルは先頭のスライドしか描かないため）。
# 使い方: python3 -I tools/pptx_reorder.py in.pptx out.pptx 8
import sys, zipfile, re
src, dst, want = sys.argv[1], sys.argv[2], int(sys.argv[3])
zin = zipfile.ZipFile(src)
rels = zin.read('ppt/_rels/presentation.xml.rels').decode()
rid_to_slide = {m.group(1): m.group(2) for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="slides/(slide\d+)\.xml"', rels)}
rid_to_slide.update({m.group(2): m.group(1) for m in re.finditer(r'Target="slides/(slide\d+)\.xml"[^>]*Id="(rId\d+)"', rels)})
pres = zin.read('ppt/presentation.xml').decode()
lst = re.search(r'<p:sldIdLst>(.*?)</p:sldIdLst>', pres, re.S)
items = re.findall(r'<p:sldId [^>]*/>', lst.group(1))
target = f'slide{want}'
pick = [i for i in items if rid_to_slide.get(re.search(r'r:id="(rId\d+)"', i).group(1)) == target]
rest = [i for i in items if i not in pick]
pres2 = pres.replace(lst.group(0), '<p:sldIdLst>' + ''.join(pick + rest) + '</p:sldIdLst>')
zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    data = pres2.encode() if it.filename == 'ppt/presentation.xml' else zin.read(it.filename)
    zout.writestr(it, data)
zout.close()
print('ok', target, 'found' if pick else 'NOT FOUND')
