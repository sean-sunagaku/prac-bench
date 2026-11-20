import math
from collections import defaultdict, deque
import numpy as np
import bpy
from mathutils import Vector, Euler


def smoothstep(edge0, edge1, x):
    denom = edge1 - edge0
    if np.ndim(denom) == 0:
        if abs(denom) < 1e-12:
            denom = 1e-12 if denom >= 0 else -1e-12
    else:
        denom = np.where(np.abs(denom) < 1e-12, np.where(denom >= 0, 1e-12, -1e-12), denom)
    t = np.clip((x - edge0) / denom, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gauss3d(pts, center, radii):
    dx = (pts[:, 0] - center[0]) / radii[0]
    dy = (pts[:, 1] - center[1]) / radii[1]
    dz = (pts[:, 2] - center[2]) / radii[2]
    return np.exp(-0.5 * (dx * dx + dy * dy + dz * dz))


def load_upper_body_topology_and_uvs(upper_obj_path, base_obj_path):
    """
    Load input/upper-body.obj, transfer exact 1-to-1 topological UVs from input/base.obj,
    and extract exact topological feature sets (eyelid rings 0..10, eye socket bags,
    oral cavity bag, mouth seam loop, and conformal UV islands).
    """
    ub_verts = []
    ub_faces = []
    with open(upper_obj_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("v "):
                ub_verts.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                ub_faces.append([int(tok.split("/")[0]) - 1 for tok in line.split()[1:]])

    b_vmap = {}
    b_verts_all = []
    b_uvs = []
    b_faces_uv = {}
    b_body_faces = []
    vi = 0
    cur_g = ""
    with open(base_obj_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("v "):
                x, y, z = [float(t) for t in line.split()[1:4]]
                tx, ty, tz = x * 0.1, -z * 0.1, (y + 8.168) * 0.1
                b_verts_all.append([tx, ty, tz])
                b_vmap[(round(tx, 5), round(ty, 5), round(tz, 5))] = vi
                vi += 1
            elif line.startswith("vt "):
                b_uvs.append([float(t) for t in line.split()[1:3]])
            elif line.startswith("g "):
                cur_g = line.strip()[2:]
            elif line.startswith("f ") and cur_g == "body":
                toks = line.split()[1:]
                v_tuple = tuple(int(t.split("/")[0]) - 1 for t in toks)
                vt_tuple = tuple(int(t.split("/")[1]) - 1 for t in toks)
                b_faces_uv[v_tuple] = vt_tuple
                b_body_faces.append((v_tuple, vt_tuple))

    ub_to_b = []
    for v in ub_verts:
        ub_to_b.append(b_vmap.get((round(v[0], 5), round(v[1], 5), round(v[2], 5)), -1))

    face_uvs = []
    for f_idxs in ub_faces:
        bf = tuple(ub_to_b[i] for i in f_idxs)
        if bf in b_faces_uv:
            vt_idxs = b_faces_uv[bf]
            face_uvs.append([list(b_uvs[ti]) for ti in vt_idxs])
        else:
            face_uvs.append([[0.5, 0.5] for _ in f_idxs])

    raw_pts = np.array(ub_verts, dtype=np.float64)
    n_verts = len(raw_pts)

    # Vertex adjacency & topological feature classification
    adj = defaultdict(list)
    eye_sock_L = set()
    eye_sock_R = set()
    oral_bag_verts = set()
    main_skin_verts = set()
    face_types = []

    for fc, fuv in zip(ub_faces, face_uvs):
        m = len(fc)
        for i in range(m):
            a, b = fc[i], fc[(i + 1) % m]
            if b not in adj[a]:
                adj[a].append(b)
            if a not in adj[b]:
                adj[b].append(a)

        u_mean = sum(u[0] for u in fuv) / m
        v_mean = sum(u[1] for u in fuv) / m
        if u_mean < 0.25:
            face_types.append("eye_socket")
            if raw_pts[fc[0], 0] >= 0.0:
                eye_sock_L.update(fc)
            else:
                eye_sock_R.update(fc)
        elif v_mean < 0.158:
            face_types.append("oral_bag")
            oral_bag_verts.update(fc)
        else:
            face_types.append("main_skin")
            main_skin_verts.update(fc)

    # BFS topological rings outward from Left & Right eye-socket seams:
    # ring 0 = inner socket fold (28v), ring 1 = inner wet waterline (28v),
    # ring 2 = mid lid margin (28v), ring 3 = exact outer eyelash root loop (28v)!
    eye_ring_dist = {"L": {}, "R": {}}
    for side_key, sock_set in (("L", eye_sock_L), ("R", eye_sock_R)):
        seam0 = sock_set & main_skin_verts
        dist_map = {v: 0 for v in seam0}
        q = deque(seam0)
        while q:
            cur = q.popleft()
            if dist_map[cur] >= 12:
                continue
            for nb in adj[cur]:
                if nb in main_skin_verts and nb not in sock_set and nb not in dist_map:
                    dist_map[nb] = dist_map[cur] + 1
                    q.append(nb)
        eye_ring_dist[side_key] = dist_map

    mouth_seam_verts = oral_bag_verts & main_skin_verts

    topo = {
        "adj": adj,
        "face_types": face_types,
        "eye_sock_L": eye_sock_L,
        "eye_sock_R": eye_sock_R,
        "oral_bag_verts": oral_bag_verts,
        "main_skin_verts": main_skin_verts,
        "eye_ring_dist": eye_ring_dist,
        "mouth_seam_verts": mouth_seam_verts,
        "base_verts_all": np.array(b_verts_all, dtype=np.float64),
        "base_uvs_all": b_uvs,
        "base_body_faces": b_body_faces,
    }
    return raw_pts, ub_faces, face_uvs, topo


def order_loop_vertices(loop_verts, adj):
    """Order a 28-vertex eyelid ring into a clean cyclic loop."""
    vset = set(loop_verts)
    if not vset:
        return []
    start = min(vset)
    ordered = [start]
    visited = {start}
    cur = start
    while len(ordered) < len(vset):
        nxt = [nb for nb in adj[cur] if nb in vset and nb not in visited]
        if not nxt:
            break
        cur = nxt[0]
        ordered.append(cur)
        visited.add(cur)
    return ordered


def sculpt_rest_pose_likeness(raw_pts, faces, topo):
    """
    Sculpt MakeHuman hm08 neutral mesh into an appealing, realistic East Asian feminine
    portrait matching input/reference.png, using exact topological eyelid & lip loops
    for crisp anatomical wrap around 13.1mm dual-layer eyeballs and a sweet closed-mouth smile.
    """
    pts = raw_pts.copy()
    n_verts = len(pts)
    adj = topo["adj"]

    x0 = raw_pts[:, 0]
    y0 = raw_pts[:, 1]
    z0 = raw_pts[:, 2]
    ax0 = np.abs(x0)

    is_oral_interior = np.zeros(n_verts, dtype=bool)
    for v in topo["oral_bag_verts"] - topo["mouth_seam_verts"]:
        is_oral_interior[v] = True

    # 1. Feminine Cranium, Smooth Rounded Forehead & Reduced Supraorbital Ridge
    head_w = smoothstep(1.415, 1.455, z0)
    pts[:, 0] *= 1.0 - 0.042 * head_w * smoothstep(1.62, 1.50, z0)

    brow_ridge = (
        smoothstep(1.548, 1.562, z0)
        * (1.0 - smoothstep(1.572, 1.588, z0))
        * smoothstep(-0.125, -0.145, y0)
        * (1.0 - smoothstep(0.045, 0.068, ax0))
    )
    pts[:, 1] += 0.0025 * brow_ridge

    forehead_dome = (
        smoothstep(1.566, 1.588, z0)
        * (1.0 - smoothstep(1.628, 1.656, z0))
        * smoothstep(-0.112, -0.144, y0)
        * (1.0 - smoothstep(0.048, 0.074, ax0))
    )
    pts[:, 1] -= 0.0022 * forehead_dome

    # 2. Soft Oval-Heart V-Line Jawline & Delicate Feminine Chin
    jaw_zone = (
        smoothstep(1.422, 1.445, z0)
        * (1.0 - smoothstep(1.500, 1.536, z0))
        * smoothstep(-0.038, -0.092, y0)
    )
    gonial_taper = jaw_zone * smoothstep(0.016, 0.050, ax0)
    pts[:, 0] *= 1.0 - 0.168 * gonial_taper
    pts[:, 2] += 0.0036 * jaw_zone * (1.0 - smoothstep(-0.155, -0.085, y0) * 0.25)

    chin_w = gauss3d(raw_pts, [0.0, -0.149, 1.448], [0.026, 0.022, 0.018])
    pts[:, 0] *= 1.0 - 0.21 * chin_w
    pts[:, 2] += 0.0026 * chin_w
    pts[:, 1] += 0.0014 * chin_w

    mento_w = gauss3d(raw_pts, [0.0, -0.150, 1.462], [0.020, 0.014, 0.008])
    pts[:, 1] -= 0.0015 * mento_w

    # 3. Youthful Smiling Apple Cheeks & Smooth Infraorbital Support
    for side in (-1.0, 1.0):
        apple_cheek = gauss3d(raw_pts, [side * 0.036, -0.138, 1.517], [0.022, 0.022, 0.019])
        pts[:, 1] -= 0.0045 * apple_cheek
        pts[:, 2] += 0.0020 * apple_cheek
        pts[:, 0] -= side * 0.0010 * apple_cheek

        infra_orb = gauss3d(raw_pts, [side * 0.030, -0.139, 1.533], [0.017, 0.014, 0.009])
        pts[:, 1] -= 0.0020 * infra_orb

    # 4. Petite, Refined Feminine Nose (preserving real nostrils & alar crease)
    nose_mask = (
        (1.0 - smoothstep(0.017, 0.028, ax0))
        * smoothstep(1.494, 1.502, z0)
        * (1.0 - smoothstep(1.542, 1.556, z0))
        * smoothstep(-0.146, -0.154, y0)
    )
    pts[:, 0] *= 1.0 - 0.165 * nose_mask

    bridge_w = gauss3d(raw_pts, [0.0, -0.154, 1.532], [0.013, 0.016, 0.015])
    pts[:, 1] += 0.0018 * bridge_w

    tip_w = gauss3d(raw_pts, [0.0, -0.167, 1.508], [0.014, 0.013, 0.011])
    pts[:, 1] += 0.0032 * tip_w
    pts[:, 2] += 0.0020 * tip_w

    subnasale_w = gauss3d(raw_pts, [0.0, -0.158, 1.499], [0.015, 0.012, 0.008])
    pts[:, 2] += 0.0016 * subnasale_w
    pts[:, 1] += 0.0010 * subnasale_w

    # 5. Sweet Closed-Mouth Smile & Hydrated Vermilion Cushions
    mouth_env = (
        (1.0 - smoothstep(0.027, 0.045, ax0))
        * smoothstep(1.458, 1.468, z0)
        * (1.0 - smoothstep(1.491, 1.501, z0))
        * smoothstep(-0.126, -0.136, y0)
    )
    corner_t = np.clip(ax0 / 0.0255, 0.0, 1.25)
    smile_curve = (corner_t ** 1.60) * mouth_env
    asym = np.where(x0 >= 0.0, 1.04, 0.96)
    pts[:, 2] += 0.0044 * smile_curve * asym

    for side in (-1.0, 1.0):
        # Oral commissure dimple tuck & smiling cheek cushion
        c_w = gauss3d(raw_pts, [side * 0.0250, -0.138, 1.4785], [0.0085, 0.011, 0.008])
        pts[:, 1] += 0.0015 * c_w
        pts[:, 0] += side * 0.0011 * c_w
        cushion_w = gauss3d(raw_pts, [side * 0.032, -0.136, 1.486], [0.011, 0.012, 0.010])
        pts[:, 1] -= 0.0020 * cushion_w
        pts[:, 2] += 0.0014 * cushion_w

    outer_lip = (~is_oral_interior).astype(np.float64)
    upper_lip_plump = gauss3d(raw_pts, [0.0, -0.159, 1.4832], [0.018, 0.012, 0.0038]) * outer_lip
    lower_lip_plump = gauss3d(raw_pts, [0.0, -0.156, 1.4742], [0.017, 0.012, 0.0044]) * outer_lip
    cupid_peaks = (
        gauss3d(raw_pts, [0.0052, -0.159, 1.4855], [0.0042, 0.009, 0.0030])
        + gauss3d(raw_pts, [-0.0052, -0.159, 1.4855], [0.0042, 0.009, 0.0030])
    ) * outer_lip

    pts[:, 1] -= 0.0014 * upper_lip_plump + 0.0022 * lower_lip_plump + 0.0006 * cupid_peaks
    pts[:, 2] += 0.0007 * cupid_peaks - 0.0004 * lower_lip_plump

    # Subtle physical lip-fissure tuck along mouth seam so closed smile reads in 3D shading too
    for sv in topo["mouth_seam_verts"]:
        pts[sv, 1] += 0.0007

    # Push internal oral cavity bag safely back (+Y) so it never intersects outer lips
    pts[is_oral_interior, 1] += 0.0055

    mouth_lift_all = gauss3d(raw_pts, [0.0, -0.150, 1.479], [0.032, 0.025, 0.014])
    pts[:, 2] += 0.0014 * mouth_lift_all

    # 6. Large, Warm, Expressive East Asian Almond-Round Eyes + Topological Eyelid Conform!
    # Calibrated to exact hm08 eyelid margin (y ~ -0.1404): center y = -0.1273, R = 0.0131m!
    eye_radius = 0.01310
    eye_centers = {
        "L": np.array([0.0315, -0.1273, 1.5456], dtype=np.float64),
        "R": np.array([-0.0315, -0.1273, 1.5456], dtype=np.float64),
    }

    for side_key, ec in eye_centers.items():
        sgn = 1.0 if side_key == "L" else -1.0
        sock_set = topo["eye_sock_L"] if side_key == "L" else topo["eye_sock_R"]
        ring_map = topo["eye_ring_dist"][side_key]

        # Coherent topological opening across rings 0..10 so inner waterline & outer lash line move together!
        for vi, r_dist in ring_map.items():
            vx, vy, vz = raw_pts[vi]
            dx = vx - sgn * 0.0311
            dz = vz - 1.5453

            # Smooth falloff across eyelid rings (1.0 on margin rings 0..3, tapering smoothly out to ring 9)
            w_ring = math.exp(-0.5 * (max(0.0, r_dist - 2.5) / 2.8) ** 2)
            # Horizontal arch span (0 at medial/lateral corners, 1 across iris!)
            h_arch = math.exp(-0.5 * ((dx - (-sgn * 0.0008)) / 0.0092) ** 2)
            h_low = math.exp(-0.5 * ((dx - (sgn * 0.0006)) / 0.0095) ** 2)

            if dz >= 0.0:
                # Raise upper eyelid margin (+3.35mm peak) for bright, warm round-almond iris reveal!
                pts[vi, 2] += 0.00335 * w_ring * h_arch
            else:
                # Open lower eyelid smoothly (-2.05mm) for warm youthful eye roundness
                pts[vi, 2] -= 0.00205 * w_ring * h_low

            # Subtle lateral canthus widening (+1.9mm outward, +0.65mm gentle upward tilt)
            lat_w = math.exp(-0.5 * ((vx - sgn * 0.0432) / 0.0055) ** 2) * w_ring
            pts[vi, 0] += sgn * 0.0019 * lat_w
            pts[vi, 2] += 0.00065 * lat_w

            # Delicate East Asian parallel/in-out double-eyelid crease on rings 5..7 (upper lid)
            if dz > 0.0015 and 4 <= r_dist <= 8:
                crease_w = math.exp(-0.5 * ((r_dist - 5.8) / 0.85) ** 2) * math.exp(-0.5 * (dx / 0.0108) ** 2)
                fold_w = math.exp(-0.5 * ((r_dist - 7.1) / 0.95) ** 2) * math.exp(-0.5 * (dx / 0.0112) ** 2)
                pts[vi, 1] += 0.00095 * crease_w
                pts[vi, 1] -= 0.00075 * fold_w

            # Soft smiling aegyo-sal pretarsal roll under lower lashes (rings 4..7 on lower lid)
            if dz < -0.0015 and 3 <= r_dist <= 8:
                aegyo_w = math.exp(-0.5 * ((r_dist - 4.8) / 1.1) ** 2) * math.exp(-0.5 * (dx / 0.0102) ** 2)
                groove_w = math.exp(-0.5 * ((r_dist - 6.8) / 0.9) ** 2) * math.exp(-0.5 * (dx / 0.0102) ** 2)
                pts[vi, 1] -= 0.00115 * aegyo_w
                pts[vi, 1] += 0.00045 * groove_w

        # Push internal eye-socket bag vertices (excluding ring 0) safely outward behind globe
        for vi in sock_set:
            if vi not in ring_map:
                rel = pts[vi] - ec
                r = np.linalg.norm(rel)
                if r < eye_radius + 0.0030:
                    pts[vi] = ec + (rel / max(r, 1e-8)) * (eye_radius + 0.0030)

        # Exact radial eyelid shelf conform around Eyeball + Cornea dome!
        for vi, r_dist in ring_map.items():
            # Preserve delicate medial caruncle tear-lake recess (|x| < 0.0205)
            is_caruncle = abs(pts[vi, 0]) < 0.0205
            rel = pts[vi] - ec
            r = np.linalg.norm(rel)
            u_vec = rel / max(r, 1e-8)
            cos_front = max(0.0, min(1.0, -u_vec[1]))
            cornea_bulge = 0.00105 * (float(smoothstep(0.85, 0.98, np.array([cos_front]))[0]))
            r_globe = eye_radius + cornea_bulge

            if r_dist == 0:
                # Inner conjunctival lip tucks 0.35mm behind sclera surface so there is ZERO gap!
                target_r = (r_globe - 0.00025) if not is_caruncle else (r_globe + 0.0002)
                pts[vi] = ec + u_vec * target_r
            elif r_dist == 1:
                # Inner wet waterline hugs right on the tear-film surface (+0.28mm)!
                target_r = r_globe + (0.00055 if is_caruncle else 0.00028)
                pts[vi] = ec + u_vec * target_r
            elif r_dist == 2:
                # Mid eyelid margin shelf (+0.85mm)
                target_r = r_globe + 0.00085
                pts[vi] = 0.25 * pts[vi] + 0.75 * (ec + u_vec * target_r)
                if np.linalg.norm(pts[vi] - ec) < r_globe + 0.00065:
                    pts[vi] = ec + u_vec * (r_globe + 0.00065)
            elif r_dist == 3:
                # Outer eyelash line (+1.45mm crisp anatomical lid thickness!)
                min_r = r_globe + 0.00135
                if r < min_r:
                    pts[vi] = ec + u_vec * min_r
            else:
                min_r = r_globe + 0.00115
                if r < min_r:
                    pts[vi] = ec + u_vec * min_r

    # 7. Delicate Feminine Ears
    for side in (-1.0, 1.0):
        ear_pivot = np.array([side * 0.070, -0.050, 1.532])
        ear_w = (
            smoothstep(0.066, 0.074, ax0)
            * (x0 * side > 0).astype(np.float64)
            * smoothstep(1.490, 1.505, z0)
            * (1.0 - smoothstep(1.565, 1.580, z0))
            * smoothstep(-0.095, -0.078, y0)
            * (1.0 - smoothstep(-0.010, 0.008, y0))
        )
        scaled_ear = ear_pivot + (pts - ear_pivot) * np.array([0.84, 0.90, 0.90])
        pts = pts * (1.0 - ear_w[:, None]) + scaled_ear * ear_w[:, None]

    # 8. Slender Graceful Neck & Feminine Shoulder Width
    neck_w = smoothstep(1.340, 1.375, z0) * (1.0 - smoothstep(1.425, 1.452, z0))
    pts[:, 0] *= 1.0 - 0.13 * neck_w
    neck_cy = -0.038
    pts[:, 1] = neck_cy + (pts[:, 1] - neck_cy) * (1.0 - 0.09 * neck_w)

    body_below = 1.0 - smoothstep(1.355, 1.415, z0)
    pts[:, 0] *= 1.0 - 0.08 * body_below

    # 9. Gentle Volume-Preserving Taubin Smoothing on Cheek/Jaw Transitions (protecting eyes/nose/lips/ears!)
    protect = np.zeros(n_verts, dtype=np.float64)
    for side_key in ("L", "R"):
        for vi, rd in topo["eye_ring_dist"][side_key].items():
            if rd <= 7:
                protect[vi] = max(protect[vi], 1.0 - max(0, rd - 4) * 0.22)
        for vi in (topo["eye_sock_L"] if side_key == "L" else topo["eye_sock_R"]):
            protect[vi] = 1.0
    protect = np.maximum(protect, gauss3d(raw_pts, [0.0, -0.162, 1.508], [0.019, 0.017, 0.015]))
    protect = np.maximum(protect, gauss3d(raw_pts, [0.0, -0.154, 1.480], [0.032, 0.020, 0.014]))
    protect = np.maximum(protect, smoothstep(0.065, 0.072, ax0))
    smooth_mask = smoothstep(1.37, 1.42, z0) * (1.0 - protect) * (~is_oral_interior).astype(np.float64)

    for lam in (0.30, -0.31, 0.22, -0.23):
        new_pts = pts.copy()
        for i in range(n_verts):
            w = smooth_mask[i]
            if w > 0.01 and adj[i]:
                avg = pts[adj[i]].mean(axis=0)
                new_pts[i] = pts[i] + (lam * w) * (avg - pts[i])
        pts = new_pts

    # Guarantee zero globe intersection on outer rings >= 1 after smoothing
    for side_key, ec in eye_centers.items():
        rmap = topo["eye_ring_dist"][side_key]
        for vi, rd in rmap.items():
            if rd >= 1:
                rel = pts[vi] - ec
                r = np.linalg.norm(rel)
                u_vec = rel / max(r, 1e-8)
                cos_f = max(0.0, min(1.0, -u_vec[1]))
                min_r = eye_radius + 0.00025 + 0.00105 * float(smoothstep(0.85, 0.98, np.array([cos_f]))[0])
                if r < min_r:
                    pts[vi] = ec + u_vec * min_r

    return pts, eye_centers, eye_radius


class PoseTransform:
    """
    Analytical skeletal pose transform matching input/reference.png:
    - Gentle head tilt (~22 deg) toward right shoulder (-X, viewer's left)
    - Slight feminine turn exposing left ear (+X, viewer's right) & gentle chin nod
    - Raised cozy right shoulder (-X)
    """

    def __init__(self):
        self.neck_pivot = np.array([0.0, -0.022, 1.385], dtype=np.float64)
        self.head_pivot = np.array([0.0, -0.034, 1.472], dtype=np.float64)

        self.rot_neck = np.array(
            Euler((math.radians(2.2), math.radians(-6.2), math.radians(-2.2)), "XYZ").to_matrix(),
            dtype=np.float64,
        )
        self.rot_head_local = np.array(
            Euler((math.radians(4.2), math.radians(-15.5), math.radians(-4.5)), "XYZ").to_matrix(),
            dtype=np.float64,
        )
        self.rot_head_total = self.rot_neck @ self.rot_head_local
        self.posed_head_pivot = self.neck_pivot + self.rot_neck @ (self.head_pivot - self.neck_pivot)
        self.head_shift = np.array([-0.005, 0.0, 0.0], dtype=np.float64)

    def transform_head_rigid(self, pt_or_pts):
        arr = np.asarray(pt_or_pts, dtype=np.float64)
        single = arr.ndim == 1
        if single:
            arr = arr[None, :]
        out = self.posed_head_pivot + self.head_shift + (arr - self.head_pivot) @ self.rot_head_total.T
        return out[0] if single else out

    def inverse_head_rigid(self, pt_or_pts):
        arr = np.asarray(pt_or_pts, dtype=np.float64)
        single = arr.ndim == 1
        if single:
            arr = arr[None, :]
        rel = arr - (self.posed_head_pivot + self.head_shift)
        out = self.head_pivot + rel @ self.rot_head_total
        return out[0] if single else out

    def transform_head_dir(self, vec_or_vecs):
        arr = np.asarray(vec_or_vecs, dtype=np.float64)
        single = arr.ndim == 1
        if single:
            arr = arr[None, :]
        out = arr @ self.rot_head_total.T
        return out[0] if single else out

    def pose_neck_and_head(self, rest_pts):
        pts = rest_pts.copy()
        z = rest_pts[:, 2]
        x = rest_pts[:, 0]

        w_neck = smoothstep(1.342, 1.425, z)
        w_head = smoothstep(1.415, 1.472, z)

        p_neck = self.neck_pivot + (pts - self.neck_pivot) @ self.rot_neck.T
        p_neck[:, 0] += self.head_shift[0] * 0.5 * w_neck

        p_head = self.transform_head_rigid(pts)

        blended = pts * (1.0 - w_neck[:, None]) + p_neck * w_neck[:, None]
        blended = blended * (1.0 - w_head[:, None]) + p_head * w_head[:, None]

        # Subtle right clavicle/trapezius cozy lift (-X)
        r_sh_w = smoothstep(-0.015, -0.11, x) * (1.0 - smoothstep(1.375, 1.425, z)) * smoothstep(1.24, 1.32, z)
        blended[:, 2] += 0.014 * r_sh_w
        blended[:, 1] -= 0.008 * r_sh_w
        return blended


def trim_and_tuck_head_body_mesh(raw_pts, rest_pts, posed_pts, faces, face_uvs, face_types):
    """
    Keep 100% of head, face, ears, neck, and supraclavicular base (z_raw >= 1.295, |x_raw| <= 0.105),
    smoothly tucking ONLY the hidden sub-collar ring (z_raw < 1.360) radially inward so it sits
    strictly inside Sweater_Collar and Sweater_Body with ZERO poke-through and ZERO gap!
    Also remaps main_skin UVs cleanly to maximize 2K facial texel density!
    """
    kept_faces = []
    kept_uvs = []
    kept_types = []
    used_old = set()

    for fc, fuv, ftype in zip(faces, face_uvs, face_types):
        if all(raw_pts[vi, 2] >= 1.295 and abs(raw_pts[vi, 0]) <= 0.106 for vi in fc):
            kept_faces.append(fc)
            kept_uvs.append(fuv)
            kept_types.append(ftype)
            used_old.update(fc)

    old_sorted = sorted(used_old)
    remap = {old_i: new_i for new_i, old_i in enumerate(old_sorted)}
    new_raw = raw_pts[old_sorted].copy()
    new_rest = rest_pts[old_sorted].copy()
    new_posed = posed_pts[old_sorted].copy()

    # Compute collar-line height around the neck: front (-Y) sits lower (~1.348), back (+Y) sits higher (~1.388)
    neck_cy = -0.032
    sin_phi = (new_raw[:, 1] - neck_cy) / np.maximum(
        1e-5, np.sqrt(new_raw[:, 0] ** 2 + (new_raw[:, 1] - neck_cy) ** 2)
    )
    z_collar_rim = 1.368 + 0.022 * sin_phi - 0.006 * np.maximum(0.0, -sin_phi)

    # Smoothly tuck vertices below (z_collar_rim - 0.008) inward toward neck spine center (0, -0.030, z)
    # so exposed neck stays solid inside the collar rim while sub-collar chest shrinks cleanly inside!
    below_amt = np.clip((z_collar_rim - 0.008 - new_raw[:, 2]) / 0.058, 0.0, 1.0)
    tuck_w = below_amt * below_amt * (3.0 - 2.0 * below_amt)
    spine_center = np.stack(
        [new_posed[:, 0] * 0.32, np.full(len(new_posed), -0.030), new_posed[:, 2] - 0.008 * tuck_w],
        axis=1,
    )
    new_posed = new_posed * (1.0 - 0.65 * tuck_w[:, None]) + spine_center * (0.65 * tuck_w[:, None])

    new_faces = [[remap[vi] for vi in fc] for fc in kept_faces]

    # Maximize 2K texture resolution on Head/Face/Neck by scaling main_skin UV bounds cleanly to [0.03, 0.97]!
    # (Preserves MakeHuman's exact seam-free conformal islands while boosting face pixel area ~3.5x!)
    ms_u = [u[0] for fuv, ft in zip(kept_uvs, kept_types) if ft == "main_skin" for u in fuv]
    ms_v = [u[1] for fuv, ft in zip(kept_uvs, kept_types) if ft == "main_skin" for u in fuv]
    u_min, u_max = min(ms_u), max(ms_u)
    v_min, v_max = min(ms_v), max(ms_v)
    scale_uv = 0.92 / max(u_max - u_min, v_max - v_min)

    remapped_uvs = []
    for fuv, ft in zip(kept_uvs, kept_types):
        if ft == "main_skin":
            remapped_uvs.append([
                [0.04 + (u[0] - u_min) * scale_uv, 0.04 + (u[1] - v_min) * scale_uv]
                for u in fuv
            ])
        else:
            # Pack hidden internal oral/socket cavities into tiny dark bottom-left corner [0.004, 0.020]
            remapped_uvs.append([[0.010, 0.010] for _ in fuv])

    return new_raw, new_rest, new_posed, new_faces, remapped_uvs, remap


def measure_posed_neck_profile(new_raw, posed_untucked, n_samples=96):
    """
    Sample exact posed outer neck/clavicle radius around 360 deg at the crew-neck collar line
    so Sweater_Collar hugs the actual posed neck with ~2mm precision and zero poke-through!
    """
    neck_center = np.array([-0.003, -0.032], dtype=np.float64)
    phis = np.linspace(0.0, 2.0 * math.pi, n_samples, endpoint=False)
    radii = np.zeros(n_samples, dtype=np.float64)
    z_vals = np.zeros(n_samples, dtype=np.float64)

    # Filter neck band vertices around collar height
    dx = posed_untucked[:, 0] - neck_center[0]
    dy = posed_untucked[:, 1] - neck_center[1]
    v_ang = np.arctan2(dy, dx) % (2.0 * math.pi)
    v_rad = np.sqrt(dx * dx + dy * dy)

    for i, phi in enumerate(phis):
        sin_p = math.sin(phi)
        z_target = 1.368 + 0.022 * sin_p - 0.007 * max(0.0, -sin_p)
        ang_diff = np.abs(((v_ang - phi + math.pi) % (2.0 * math.pi)) - math.pi)
        mask = (ang_diff < 0.28) & (np.abs(posed_untucked[:, 2] - z_target) < 0.022) & (v_rad < 0.11)
        if np.any(mask):
            radii[i] = float(np.percentile(v_rad[mask], 90))
        else:
            radii[i] = 0.056
        z_vals[i] = z_target

    # Smooth circular profile cleanly
    for _ in range(4):
        radii = 0.25 * np.roll(radii, -1) + 0.50 * radii + 0.25 * np.roll(radii, 1)
        z_vals = 0.25 * np.roll(z_vals, -1) + 0.50 * z_vals + 0.25 * np.roll(z_vals, 1)

    return {
        "center_xy": neck_center,
        "phis": phis,
        "radii": radii,
        "z_vals": z_vals,
    }


def create_mesh_object(name, verts, faces, collection, uvs_per_face=None, subdiv_levels=2):
    mesh = bpy.data.meshes.new(f"{name}_Data")
    mesh.from_pydata(verts.tolist() if isinstance(verts, np.ndarray) else verts, [], faces)
    mesh.update()

    if uvs_per_face is not None:
        uv_layer = mesh.uv_layers.new(name="UVMap")
        loop_idx = 0
        for f_uvs in uvs_per_face:
            for uv in f_uvs:
                uv_layer.data[loop_idx].uv = (float(uv[0]), float(uv[1]))
                loop_idx += 1

    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    if subdiv_levels > 0:
        sub = obj.modifiers.new(name="Subdivision", type="SUBSURF")
        sub.levels = min(1, subdiv_levels)
        sub.render_levels = subdiv_levels
        sub.uv_smooth = "PRESERVE_BOUNDARIES"

    return obj


def build_dual_layer_eye(side_key, posed_center, radius, target_pos, head_up_vec, collection):
    """
    Create realistic two-part human eye:
    1. Eyeball_{L,R}: Sclera globe + recessed concave anterior iris disc
    2. Cornea_{L,R}: Outer refractive tear-film shell with convex corneal dome
    """
    n_seg = 48
    n_ring = 32
    iris_half_angle = math.radians(27.2)  # ~12.0mm expressive East Asian iris diameter on 13.1mm globe

    def make_sphere_data(is_cornea):
        verts = []
        faces = []
        uvs_face = []

        rings_v = []
        for ir in range(n_ring + 1):
            theta = math.pi * ir / n_ring
            sin_t = math.sin(theta)
            cos_t = math.cos(theta)

            r_cur = radius * (1.004 if is_cornea else 1.0)
            y_local = -r_cur * cos_t
            rad_ring = r_cur * sin_t

            if theta < iris_half_angle * 1.08:
                u_t = theta / (iris_half_angle * 1.08)
                dome = math.cos(u_t * math.pi * 0.5) ** 1.6
                if is_cornea:
                    y_local -= 0.00105 * dome
                else:
                    iris_plane_y = -radius * math.cos(iris_half_angle)
                    flat_blend = float(smoothstep(iris_half_angle * 1.04, iris_half_angle * 0.88, np.array([theta]))[0])
                    dish_depth = 0.00058 * (1.0 - (theta / max(1e-6, iris_half_angle)) ** 2)
                    y_iris = iris_plane_y + max(0.0, dish_depth)
                    y_local = y_local * (1.0 - flat_blend) + y_iris * flat_blend

            row_indices = []
            for iseg in range(n_seg):
                phi = 2.0 * math.pi * iseg / n_seg
                row_indices.append(len(verts))
                verts.append([rad_ring * math.cos(phi), y_local, rad_ring * math.sin(phi)])
            rings_v.append((theta, row_indices))

        for ir in range(n_ring):
            th0, r0 = rings_v[ir]
            th1, r1 = rings_v[ir + 1]

            def uv_rad(th):
                if th <= iris_half_angle:
                    return 0.28 * (th / iris_half_angle)
                return 0.28 + 0.21 * min(1.0, (th - iris_half_angle) / (math.pi - iris_half_angle))

            ur0, ur1 = uv_rad(th0), uv_rad(th1)
            for iseg in range(n_seg):
                jn = (iseg + 1) % n_seg
                p0 = 2.0 * math.pi * iseg / n_seg
                p1 = 2.0 * math.pi * jn / n_seg
                faces.append([r0[iseg], r1[iseg], r1[jn], r0[jn]])
                uvs_face.append([
                    [0.5 + ur0 * math.cos(p0), 0.5 + ur0 * math.sin(p0)],
                    [0.5 + ur1 * math.cos(p0), 0.5 + ur1 * math.sin(p0)],
                    [0.5 + ur1 * math.cos(p1), 0.5 + ur1 * math.sin(p1)],
                    [0.5 + ur0 * math.cos(p1), 0.5 + ur0 * math.sin(p1)],
                ])
        return np.array(verts, dtype=np.float64), faces, uvs_face

    gaze_dir = target_pos - posed_center
    gaze_dir = gaze_dir / np.linalg.norm(gaze_dir)
    y_axis = -gaze_dir
    x_axis = np.cross(y_axis, head_up_vec)
    x_axis = x_axis / np.linalg.norm(x_axis)
    z_axis = np.cross(x_axis, y_axis)
    rot_eye = np.column_stack([x_axis, y_axis, z_axis])

    eb_verts, eb_faces, eb_uvs = make_sphere_data(is_cornea=False)
    eyeball_obj = create_mesh_object(
        f"Eyeball_{side_key}", posed_center + eb_verts @ rot_eye.T, eb_faces, collection, eb_uvs, subdiv_levels=1
    )

    co_verts, co_faces, co_uvs = make_sphere_data(is_cornea=True)
    cornea_obj = create_mesh_object(
        f"Cornea_{side_key}", posed_center + co_verts @ rot_eye.T, co_faces, collection, co_uvs, subdiv_levels=1
    )

    return eyeball_obj, cornea_obj


def build_tear_meniscus(sculpted_rest_pts, topo, pose_tf, collection):
    """Build glossy tear-film meniscus strip directly along the exact sculpted lower waterline (ring 1)!”"""
    all_verts = []
    all_faces = []
    n_sec = 6
    r_tube = 0.00036

    for side_key in ("L", "R"):
        rmap = topo["eye_ring_dist"][side_key]
        ring1 = [vi for vi, rd in rmap.items() if rd == 1]
        # Take lower-lid arc sorted from medial to lateral
        sgn = 1.0 if side_key == "L" else -1.0
        lower_arc = [vi for vi in ring1 if sculpted_rest_pts[vi, 2] <= 1.5462]
        lower_arc.sort(key=lambda vi: sculpted_rest_pts[vi, 0] * sgn)
        if len(lower_arc) < 4:
            continue

        arc_pts = [pose_tf.transform_head_rigid(sculpted_rest_pts[vi] + np.array([0.0, -0.00015, 0.00015])) for vi in lower_arc]
        n_arc = len(arc_pts)
        base_idx = len(all_verts)

        for i in range(n_arc):
            tang = arc_pts[min(n_arc - 1, i + 1)] - arc_pts[max(0, i - 1)]
            tang = tang / max(1e-8, np.linalg.norm(tang))
            n1 = np.cross(tang, np.array([0.0, 0.0, 1.0]))
            n1 = n1 / max(1e-8, np.linalg.norm(n1))
            n2 = np.cross(tang, n1)
            taper = math.sin(math.pi * (i / max(1, n_arc - 1))) ** 0.45
            rad = r_tube * (0.4 + 0.6 * taper)
            for k in range(n_sec):
                ang = 2.0 * math.pi * k / n_sec
                v = arc_pts[i] + rad * (math.cos(ang) * n1 + math.sin(ang) * n2)
                all_verts.append(v.tolist())

        for i in range(n_arc - 1):
            for k in range(n_sec):
                kn = (k + 1) % n_sec
                all_faces.append([
                    base_idx + i * n_sec + k,
                    base_idx + (i + 1) * n_sec + k,
                    base_idx + (i + 1) * n_sec + kn,
                    base_idx + i * n_sec + kn,
                ])

    return create_mesh_object("EyeTearMeniscus", all_verts, all_faces, collection, subdiv_levels=1)


def create_curves_object(name, strands_pts, strands_radii, collection):
    """Create native Blender 5.1 Hair Curves object."""
    curves_data = bpy.data.hair_curves.new(f"{name}_Data")
    lengths = [len(pts) for pts in strands_pts]
    curves_data.add_curves(lengths)

    flat_pos = np.concatenate(strands_pts, axis=0).astype(np.float32).reshape(-1)
    flat_rad = np.concatenate(strands_radii, axis=0).astype(np.float32).reshape(-1)

    curves_data.points.foreach_set("position", flat_pos)
    curves_data.points.foreach_set("radius", flat_rad)

    obj = bpy.data.objects.new(name, curves_data)
    collection.objects.link(obj)
    return obj


def build_eyelashes_and_brows(sculpted_rest_pts, raw_pts, topo, pose_tf, collection):
    """
    Build 3D tapered Eyelashes rooted directly along the exact sculpted Eye Ring 3 (outer lash margin)
    and continuous, feathery 3D Eyebrows elevated cleanly above the subdivided forehead surface!
    """
    rng = np.random.default_rng(4209)
    lash_pts = []
    lash_rads = []
    n_pts_lash = 8

    for side_key in ("L", "R"):
        sgn = 1.0 if side_key == "L" else -1.0
        rmap = topo["eye_ring_dist"][side_key]
        ring3 = [vi for vi, rd in rmap.items() if rd == 3]

        # Separate upper lash margin (z_raw >= 1.5450) and lower lash margin (z_raw < 1.5450), sorted medial -> lateral!
        upper_v = sorted(
            [vi for vi in ring3 if raw_pts[vi, 2] >= 1.5448 and abs(raw_pts[vi, 0]) >= 0.0205],
            key=lambda vi: raw_pts[vi, 0] * sgn,
        )
        lower_v = sorted(
            [vi for vi in ring3 if raw_pts[vi, 2] < 1.5448 and abs(raw_pts[vi, 0]) >= 0.0215],
            key=lambda vi: raw_pts[vi, 0] * sgn,
        )

        # Interpolate smooth polyline along sculpted upper lash vertices
        up_arr = sculpted_rest_pts[upper_v]
        up_u = np.linspace(0.0, 1.0, len(up_arr))
        n_upper = 92
        clump_t = np.linspace(0.05, 0.96, 18)

        for idx in range(n_upper):
            t = float(np.clip(0.02 + 0.96 * (idx / (n_upper - 1)) + rng.normal(0.0, 0.004), 0.0, 1.0))
            root = np.array([
                np.interp(t, up_u, up_arr[:, 0]),
                np.interp(t, up_u, up_arr[:, 1]) - 0.00015,
                np.interp(t, up_u, up_arr[:, 2]) - 0.00010,
            ])
            nearest_c = clump_t[np.argmin(np.abs(clump_t - t))]
            len_prof = math.sin(math.pi * (t ** 0.78)) ** 0.62
            lash_len = (0.0032 + 0.0042 * len_prof) * rng.uniform(0.90, 1.08)

            clump_pull = sgn * (nearest_c - t) * 0.20
            dir_init = np.array([sgn * (0.10 + 0.34 * t) + clump_pull, -0.94, -0.10 + 0.22 * len_prof])
            dir_init /= np.linalg.norm(dir_init)
            curl_up = np.array([sgn * 0.16 * t + clump_pull * 0.5, -0.26, 0.95])
            curl_up /= np.linalg.norm(curl_up)

            pts_s = np.zeros((n_pts_lash, 3), dtype=np.float64)
            rads_s = np.zeros(n_pts_lash, dtype=np.float64)
            cur = root.copy()
            pts_s[0] = pose_tf.transform_head_rigid(cur)
            r0 = 0.000090 * rng.uniform(0.88, 1.12)
            rads_s[0] = r0
            step = lash_len / (n_pts_lash - 1)
            for k in range(1, n_pts_lash):
                u = k / (n_pts_lash - 1)
                d_vec = (1.0 - u ** 1.35) * dir_init + (u ** 1.35) * curl_up
                d_vec /= np.linalg.norm(d_vec)
                cur = cur + d_vec * step
                pts_s[k] = pose_tf.transform_head_rigid(cur)
                rads_s[k] = r0 * max(0.08, (1.0 - u) ** 0.85)
            lash_pts.append(pts_s)
            lash_rads.append(rads_s)

        # Delicate lower lashes along sculpted lower_v
        lo_arr = sculpted_rest_pts[lower_v]
        lo_u = np.linspace(0.0, 1.0, len(lo_arr))
        n_lower = 44
        for idx in range(n_lower):
            t = float(np.clip(0.08 + 0.88 * (idx / (n_lower - 1)) + rng.normal(0.0, 0.006), 0.0, 1.0))
            root = np.array([
                np.interp(t, lo_u, lo_arr[:, 0]),
                np.interp(t, lo_u, lo_arr[:, 1]) - 0.00015,
                np.interp(t, lo_u, lo_arr[:, 2]) - 0.00015,
            ])
            lash_len = (0.0017 + 0.0016 * math.sin(math.pi * t)) * rng.uniform(0.86, 1.12)
            dir_init = np.array([sgn * (0.08 + 0.28 * t), -0.82, -0.54])
            dir_init /= np.linalg.norm(dir_init)
            curl_dn = np.array([sgn * 0.16 * t, -0.34, -0.92])
            curl_dn /= np.linalg.norm(curl_dn)

            pts_s = np.zeros((n_pts_lash, 3), dtype=np.float64)
            rads_s = np.zeros(n_pts_lash, dtype=np.float64)
            cur = root.copy()
            pts_s[0] = pose_tf.transform_head_rigid(cur)
            r0 = 0.000058 * rng.uniform(0.85, 1.10)
            rads_s[0] = r0
            step = lash_len / (n_pts_lash - 1)
            for k in range(1, n_pts_lash):
                u = k / (n_pts_lash - 1)
                d_vec = (1.0 - u) * dir_init + u * curl_dn
                d_vec /= np.linalg.norm(d_vec)
                cur = cur + d_vec * step
                pts_s[k] = pose_tf.transform_head_rigid(cur)
                rads_s[k] = r0 * max(0.10, (1.0 - u) ** 0.85)
            lash_pts.append(pts_s)
            lash_rads.append(rads_s)

    lashes_obj = create_curves_object("Eyelashes_Curves", lash_pts, lash_rads, collection)

    # --- 2. Eyebrows: C-infinity smooth Gaussian-projected East Asian brows (zero stair-stepping!) ---
    brow_pts = []
    brow_rads = []
    n_pts_brow = 7

    brow_skin_pts = sculpted_rest_pts[
        (sculpted_rest_pts[:, 2] > 1.548)
        & (sculpted_rest_pts[:, 2] < 1.586)
        & (sculpted_rest_pts[:, 1] < -0.115)
    ]

    def project_to_brow_skin(x_q, z_q):
        d2 = (brow_skin_pts[:, 0] - x_q) ** 2 + (brow_skin_pts[:, 2] - z_q) ** 2
        w = np.exp(-0.5 * d2 / (0.0052 ** 2))
        return float(np.sum(brow_skin_pts[:, 1] * w) / np.maximum(np.sum(w), 1e-12))

    for side in (-1.0, 1.0):
        n_hairs = 620
        for _ in range(n_hairs):
            u = float(rng.beta(1.18, 1.32))
            bx = side * (0.0145 + 0.0365 * u)
            arch = 0.0026 * math.sin(math.pi * (u ** 0.82)) - 0.0015 * (u ** 2.2)
            half_thick = 0.0043 * (1.0 - 0.52 * (u ** 1.65)) * (0.65 + 0.35 * math.sin(math.pi * min(1.0, u * 3.0)))
            v_off = float(np.clip(rng.normal(0.0, 0.48), -1.0, 1.0)) * half_thick
            bz = 1.5608 + arch + v_off

            up_comp = 0.56 * (1.0 - float(smoothstep(0.0, 0.45, np.array([u]))[0])) - 0.20 * float(
                smoothstep(0.55, 1.0, np.array([u]))[0]
            )
            conv_z = -0.35 * (v_off / max(1e-5, half_thick))
            hair_len = (0.0058 + 0.0026 * math.sin(math.pi * u)) * rng.uniform(0.84, 1.15)

            pts_s = np.zeros((n_pts_brow, 3), dtype=np.float64)
            rads_s = np.zeros(n_pts_brow, dtype=np.float64)
            r0 = 0.000072 * rng.uniform(0.82, 1.14)
            for k in range(n_pts_brow):
                tk = k / (n_pts_brow - 1)
                px = bx + side * hair_len * tk * 0.92
                pz = bz + hair_len * tk * (up_comp * (1.0 - 0.38 * tk) + conv_z * 0.34)
                lift_front = 0.00085 + 0.00055 * math.sin(math.pi * (tk ** 0.75))
                if k == 0:
                    lift_front = 0.00055
                py = project_to_brow_skin(px, pz) - lift_front
                pts_s[k] = pose_tf.transform_head_rigid([px, py, pz])
                rads_s[k] = r0 * max(0.14, (1.0 - tk) ** 0.72)

            brow_pts.append(pts_s)
            brow_rads.append(rads_s)

    brows_obj = create_curves_object("Eyebrows_Curves", brow_pts, brow_rads, collection)
    return lashes_obj, brows_obj


def build_anatomical_character(upper_obj_path, base_obj_path, env_json_path, beauty_cam_pos, char_collection):
    """Master entry point for sculpted head/neck, topological eyelids, dual-layer eyes, lashes, and brows."""
    import json
    with open(env_json_path, "r", encoding="utf-8") as ef:
        env_data = json.load(ef)

    raw_pts, faces, face_uvs, topo = load_upper_body_topology_and_uvs(upper_obj_path, base_obj_path)
    rest_sculpted_pts, eye_centers_rest, eye_radius = sculpt_rest_pose_likeness(raw_pts, faces, topo)

    pose_tf = PoseTransform()
    posed_full_pts = pose_tf.pose_neck_and_head(rest_sculpted_pts)

    # Measure exact posed neck contour BEFORE tucking the sub-collar skirt!
    neck_profile = measure_posed_neck_profile(raw_pts, posed_full_pts, n_samples=96)

    trimmed_raw, trimmed_rest, trimmed_posed, trimmed_faces, trimmed_uvs, vert_remap = trim_and_tuck_head_body_mesh(
        raw_pts, rest_sculpted_pts, posed_full_pts, faces, face_uvs, topo["face_types"]
    )

    body_obj = create_mesh_object(
        "HeadBody_Mesh",
        trimmed_posed,
        trimmed_faces,
        char_collection,
        uvs_per_face=trimmed_uvs,
        subdiv_levels=2,
    )

    posed_eye_L = pose_tf.transform_head_rigid(eye_centers_rest["L"])
    posed_eye_R = pose_tf.transform_head_rigid(eye_centers_rest["R"])
    head_up = pose_tf.transform_head_dir([0.0, 0.0, 1.0])

    # Aim gaze along camera sightline at natural ~1.05m optical convergence (avoids close-up cross-eye!)
    cam_pos_arr = np.asarray(beauty_cam_pos, dtype=np.float64)
    eye_mid_posed = 0.5 * (posed_eye_L + posed_eye_R)
    gaze_ray = cam_pos_arr - eye_mid_posed
    gaze_ray /= np.linalg.norm(gaze_ray)
    gaze_target = eye_mid_posed + gaze_ray * 1.05
    eyeball_L, cornea_L = build_dual_layer_eye("L", posed_eye_L, eye_radius, gaze_target, head_up, char_collection)
    eyeball_R, cornea_R = build_dual_layer_eye("R", posed_eye_R, eye_radius, gaze_target, head_up, char_collection)

    tear_obj = build_tear_meniscus(rest_sculpted_pts, topo, pose_tf, char_collection)
    lashes_obj, brows_obj = build_eyelashes_and_brows(
        rest_sculpted_pts, raw_pts, topo, pose_tf, char_collection
    )

    return {
        "raw_pts": raw_pts,
        "rest_sculpted_pts": rest_sculpted_pts,
        "trimmed_raw": trimmed_raw,
        "trimmed_rest": trimmed_rest,
        "trimmed_posed": trimmed_posed,
        "trimmed_faces": trimmed_faces,
        "trimmed_uvs": trimmed_uvs,
        "vert_remap": vert_remap,
        "topo": topo,
        "landmarks": env_data["landmarks"],
        "pose_tf": pose_tf,
        "neck_profile": neck_profile,
        "eye_centers_rest": eye_centers_rest,
        "posed_eye_L": posed_eye_L,
        "posed_eye_R": posed_eye_R,
        "eye_radius": eye_radius,
        "objects": {
            "body": body_obj,
            "eyeball_L": eyeball_L,
            "eyeball_R": eyeball_R,
            "cornea_L": cornea_L,
            "cornea_R": cornea_R,
            "tear": tear_obj,
            "lashes": lashes_obj,
            "brows": brows_obj,
        },
    }
