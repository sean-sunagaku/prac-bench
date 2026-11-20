import math
import struct
import zlib
import sys

def read_png_rgb(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Not PNG'
    w, h, bit_depth, color_type = struct.unpack('>IIBB', data[16:26])
    assert bit_depth == 8 and color_type in (2, 6), f'Unsupported PNG: {bit_depth}/{color_type}'
    bpp = 3 if color_type == 2 else 4
    idat = bytearray()
    pos = 8
    while pos < len(data):
        length, ctype = struct.unpack('>I4s', data[pos:pos+8])
        if ctype == b'IDAT':
            idat.extend(data[pos+8:pos+8+length])
        pos += 12 + length
    raw = zlib.decompress(bytes(idat))
    stride = w * bpp
    recon = bytearray(h * stride)
    for y in range(h):
        ftype = raw[y * (stride + 1)]
        row_start = y * (stride + 1) + 1
        out_start = y * stride
        prev_start = (y - 1) * stride
        if ftype == 0:
            recon[out_start:out_start+stride] = raw[row_start:row_start+stride]
        elif ftype == 1:
            for i in range(stride):
                a = recon[out_start + i - bpp] if i >= bpp else 0
                recon[out_start + i] = (raw[row_start + i] + a) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                b = recon[prev_start + i] if y > 0 else 0
                recon[out_start + i] = (raw[row_start + i] + b) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                a = recon[out_start + i - bpp] if i >= bpp else 0
                b = recon[prev_start + i] if y > 0 else 0
                recon[out_start + i] = (raw[row_start + i] + ((a + b) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                a = recon[out_start + i - bpp] if i >= bpp else 0
                b = recon[prev_start + i] if y > 0 else 0
                c = recon[prev_start + i - bpp] if (y > 0 and i >= bpp) else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                recon[out_start + i] = (raw[row_start + i] + pr) & 0xFF
    return w, h, bpp, recon

def write_png_rgba(path, w, h, rgba_rows):
    def chunk(ctype, payload):
        crc = zlib.crc32(ctype + payload) & 0xFFFFFFFF
        return struct.pack('>I', len(payload)) + ctype + payload + struct.pack('>I', crc)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(rgba_rows), level=6)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))

def main():
    src, dst = sys.argv[1], sys.argv[2]
    w, h, bpp, pixels = read_png_rgb(src)
    cx, cy = w * 0.5, h * 0.5
    max_r = min(w, h) * 0.5
    inner_r = max_r * 0.64
    outer_r = max_r * 0.98
    inv_span = 1.0 / (outer_r - inner_r)

    out = bytearray(h * (1 + w * 4))
    out_pos = 0
    for y in range(h):
        out[out_pos] = 0  # filter 0
        out_pos += 1
        dy = y - cy
        dy2 = dy * dy
        row_in = y * w * bpp
        for x in range(w):
            dx = x - cx
            r = math.sqrt(dx * dx + dy2)
            if r <= inner_r:
                a = 255
            elif r >= outer_r:
                a = 0
            else:
                t = (r - inner_r) * inv_span
                # smoothstep fade
                s = t * t * (3.0 - 2.0 * t)
                a = int(round((1.0 - s) * 255))
            idx = row_in + x * bpp
            out[out_pos] = pixels[idx]
            out[out_pos + 1] = pixels[idx + 1]
            out[out_pos + 2] = pixels[idx + 2]
            out[out_pos + 3] = a
            out_pos += 4

    write_png_rgba(dst, w, h, out)
    print(f'Feathered RGBA PNG written: {dst} ({w}x{h})')

if __name__ == '__main__':
    main()
