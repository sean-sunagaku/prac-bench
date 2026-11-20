"""ec_orders.xlsx を標準ライブラリだけで読み、セル型つきで全行を出力する（原本は読み取りのみ）。"""
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_rows(path):
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
        root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in root.find("m:sheetData", NS).findall("m:row", NS):
            cells = []
            for c in row.findall("m:c", NS):
                t = c.get("t", "n")
                if t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t"))
                elif t == "s":
                    val = shared[int(c.find("m:v", NS).text)]
                else:
                    v = c.find("m:v", NS)
                    val = v.text if v is not None else ""
                cells.append((c.get("r"), t, val, c.get("s")))
            rows.append((row.get("r"), row.get("hidden"), cells))
        return rows


if __name__ == "__main__":
    for r, hidden, cells in read_rows(sys.argv[1]):
        print(r, "HIDDEN" if hidden else "", "\t".join(f"{t}:{v}" for _, t, v, _ in cells), sep="\t")
