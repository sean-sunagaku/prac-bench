"""Estimate relative depth for the painted plates used by the virtual camera."""
import os
from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "artwork" / "depth"
output.mkdir(exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 4
model = ort.InferenceSession(os.environ.get("TIDE_DEPTH_MODEL", "/tmp/umi-astra-depth.onnx"),
                             sess_options=options, providers=["CPUExecutionProvider"])
for file in sorted((ROOT/"artwork").glob("*.png")):
    out = output / file.name
    if file.stem in {"swimmer","calf"} or out.exists(): continue
    image = cv2.cvtColor(cv2.imread(str(file)), cv2.COLOR_BGR2RGB)
    # The transformer's patches are 14 x 14; retain a widescreen camera geometry.
    im = cv2.resize(image, (672,378), interpolation=cv2.INTER_AREA).astype("float32")/255
    arr = (im - np.array([.485,.456,.406],dtype="float32")) / np.array([.229,.224,.225],dtype="float32")
    estimate = model.run(None, {"pixel_values": np.ascontiguousarray(arr.transpose(2,0,1)[None])})[0][0]
    low, high = np.percentile(estimate,[1,99])
    d = np.clip((estimate-low)/max(high-low,1e-6),0,1)
    cv2.imwrite(str(out), np.rint(d*255).astype("uint8"))
    print(file.stem, flush=True)
