import math
import numpy as np
from character_anatomy import create_curves_object, smoothstep
from character_sweater import eval_catmull_rom


class ExactGarmentAndHeadCollider:
    """
    1. Head-space anatomical collider with strict LATERAL face keep-out shield (pushes any
       non-bang strand entering the face mask sideways to the temples ±X, NEVER forward -Y
       in front of the eyes/nose/mouth!).
    2. Exact cylindrical height-field collider sampled directly from the generated Sweater_Body
       and Sweater_Collar meshes so ZERO hair strands ever tunnel through the collar or back sweater!
    """

    def __init__(self, pose_tf, sweater_info):
        self.pose_tf = pose_tf

        self.head_ellipsoids_rest = [
            # Cranium dome (hugs skull cleanly)
            (np.array([0.0, -0.045, 1.564]), np.array([0.079, 0.101, 0.095])),
            # Left ear (+X, viewer's right — keep cleanly exposed!)
            (np.array([0.075, -0.048, 1.532]), np.array([0.017, 0.026, 0.034])),
            # Neck cylinder in head-rest transition
            (np.array([0.0, -0.034, 1.435]), np.array([0.056, 0.056, 0.055])),
        ]

        # Build exact (n_z x n_phi) outer-radius grid from actual Sweater_Body + Sweater_Collar + Sleeves!
        self.z_min = 0.90
        self.z_max = 1.405
        self.n_z = 64
        self.n_phi = 72
        self.center_xy = np.array([0.0, -0.032], dtype=np.float64)
        self.r_grid = np.full((self.n_z, self.n_phi), 0.055, dtype=np.float64)

        all_sw_pts = []
        for obj in [sweater_info["sweater_body"], sweater_info["sweater_collar"], *sweater_info["sweater_sleeves"]]:
            coords = np.empty(len(obj.data.vertices) * 3, dtype=np.float64)
            obj.data.vertices.foreach_get("co", coords)
            pts = coords.reshape(-1, 3)
            # Keep torso + upper shoulder region (|x| < 0.24, y > -0.24)
            mask = (np.abs(pts[:, 0]) < 0.24) & (pts[:, 1] > -0.24)
            all_sw_pts.append(pts[mask])
        sw_pts = np.concatenate(all_sw_pts, axis=0)

        dx = sw_pts[:, 0] - self.center_xy[0]
        dy = sw_pts[:, 1] - self.center_xy[1]
        sw_r = np.sqrt(dx * dx + dy * dy)
        sw_phi = np.arctan2(dy, dx) % (2.0 * math.pi)
        sw_z = sw_pts[:, 2]

        iz_arr = np.clip(((sw_z - self.z_min) / (self.z_max - self.z_min) * (self.n_z - 1)).astype(int), 0, self.n_z - 1)
        ip_arr = np.clip((sw_phi / (2.0 * math.pi) * self.n_phi).astype(int), 0, self.n_phi - 1)

        for iz, ip, r_val in zip(iz_arr, ip_arr, sw_r):
            if r_val > self.r_grid[iz, ip]:
                self.r_grid[iz, ip] = r_val

        # Dilate/smooth r_grid slightly so sparse bins never dip below neighboring sweater ribs!
        for _ in range(2):
            padded_z = np.pad(self.r_grid, ((1, 1), (0, 0)), mode="edge")
            max_z = np.maximum(self.r_grid, np.maximum(padded_z[:-2, :], padded_z[2:, :]))
            self.r_grid = np.maximum(max_z, np.maximum(np.roll(max_z, 1, axis=1), np.roll(max_z, -1, axis=1)))

    def resolve_points(self, pts_world, clearance=0.0032, skip_first_n=2):
        pts = pts_world.copy()
        sub = pts[skip_first_n:]
        if len(sub) == 0:
            return pts

        # 1. Head-space collision + STRICT LATERAL FACE SHIELD!
        pts_rest = self.pose_tf.inverse_head_rigid(sub)

        # Any non-bang point entering front facial mask (z in [1.425, 1.596], y < -0.088, |x| < 0.068)
        # is pushed SIDEWAYS (±X) to the temples so ZERO strands ever cross eyes, nose, cheeks, or lips!
        in_face = (
            (pts_rest[:, 2] > 1.425)
            & (pts_rest[:, 2] < 1.596)
            & (pts_rest[:, 1] < -0.088)
            & (np.abs(pts_rest[:, 0]) < 0.068)
        )
        if np.any(in_face):
            # Temple side: negative X (her right) vs positive X (her left)
            side = np.where(pts_rest[in_face, 0] < -0.004, -1.0, np.where(pts_rest[in_face, 0] > 0.004, 1.0, -1.0))
            pts_rest[in_face, 0] = side * 0.070

        for c_rest, rad_rest in self.head_ellipsoids_rest:
            r_eff = rad_rest + clearance
            d = (pts_rest - c_rest) / r_eff
            norm_d = np.linalg.norm(d, axis=1)
            inside = norm_d < 1.0
            if np.any(inside):
                u = d[inside] / np.maximum(norm_d[inside, None], 1e-6)
                pts_rest[inside] = c_rest + u * r_eff

        sub = self.pose_tf.transform_head_rigid(pts_rest)

        # 2. Exact Sweater + Crew-Neck Collar Cylindrical Height-Field Collision!
        z_w = sub[:, 2]
        in_z = (z_w >= self.z_min) & (z_w <= self.z_max)
        if np.any(in_z):
            sub_z = sub[in_z]
            dx = sub_z[:, 0] - self.center_xy[0]
            dy = sub_z[:, 1] - self.center_xy[1]
            r_cur = np.sqrt(dx * dx + dy * dy)
            phi = np.arctan2(dy, dx) % (2.0 * math.pi)

            fz = np.clip((sub_z[:, 2] - self.z_min) / (self.z_max - self.z_min) * (self.n_z - 1), 0.0, self.n_z - 1.001)
            fp = (phi / (2.0 * math.pi)) * self.n_phi
            iz0 = fz.astype(int)
            uz = fz - iz0
            ip0 = fp.astype(int) % self.n_phi
            ip1 = (ip0 + 1) % self.n_phi
            up = fp - np.floor(fp)

            r00 = self.r_grid[iz0, ip0]
            r01 = self.r_grid[iz0, ip1]
            r10 = self.r_grid[iz0 + 1, ip0]
            r11 = self.r_grid[iz0 + 1, ip1]
            r_sw = (1.0 - uz) * ((1.0 - up) * r00 + up * r01) + uz * ((1.0 - up) * r10 + up * r11)

            min_r = r_sw + clearance + 0.0015
            push = r_cur < min_r
            if np.any(push):
                scale = min_r[push] / np.maximum(r_cur[push], 1e-6)
                sub_z[push, 0] = self.center_xy[0] + dx[push] * scale
                sub_z[push, 1] = self.center_xy[1] + dy[push] * scale
                sub[in_z] = sub_z

        pts[skip_first_n:] = sub
        return pts


def smooth_strand(pts, iterations=2):
    out = pts.copy()
    for _ in range(iterations):
        nxt = out.copy()
        nxt[1:-1] = 0.24 * out[:-2] + 0.52 * out[1:-1] + 0.24 * out[2:]
        out = nxt
    return out


def extract_scalp_surface_points(rest_sculpted_pts):
    """Extract scalp vertices on cranium (above hairline, temples, crown, occiput, nape)."""
    x = rest_sculpted_pts[:, 0]
    y = rest_sculpted_pts[:, 1]
    z = rest_sculpted_pts[:, 2]
    ax = np.abs(x)

    is_front_crown = (z >= 1.604 + 0.008 * (ax / 0.06) ** 2) & (y < -0.02)
    is_temple_side = (ax >= 0.058) & (y > -0.104) & (y <= -0.018) & (z >= 1.560 - 0.35 * (y + 0.104))
    is_back_scalp = (y > -0.022) & (z >= 1.458)
    is_ear = (ax > 0.070) & (z > 1.492) & (z < 1.568) & (y > -0.086) & (y < -0.018)

    mask = (is_front_crown | is_temple_side | is_back_scalp) & (~is_ear)
    scalp_pts = rest_sculpted_pts[mask]
    head_center = np.array([0.0, -0.045, 1.555])
    scalp_normals = scalp_pts - head_center
    scalp_normals /= np.maximum(np.linalg.norm(scalp_normals, axis=1, keepdims=True), 1e-8)
    return scalp_pts, scalp_normals


def sample_scalp_root(scalp_pts, scalp_normals, query_pt):
    d2 = np.sum((scalp_pts - query_pt) ** 2, axis=1)
    idx3 = np.argpartition(d2, 3)[:3]
    w = 1.0 / np.maximum(d2[idx3], 1e-7)
    w /= np.sum(w)
    root = np.sum(scalp_pts[idx3] * w[:, None], axis=0)
    nrm = np.sum(scalp_normals[idx3] * w[:, None], axis=0)
    nrm /= max(1e-8, np.linalg.norm(nrm))
    return root - nrm * 0.0006, nrm


def expand_guides_to_strands(
    guide_strands,
    children_per_guide,
    root_spread,
    mid_spread,
    tip_spread,
    base_radius,
    rng,
    collider=None,
    clearance=0.0022,
):
    """Expand sculpted 3D guide locks into cohesive, glossy salon hair locks."""
    all_pts = []
    all_rads = []

    for g_pts in guide_strands:
        n_p = len(g_pts)
        u = np.linspace(0.0, 1.0, n_p)
        tangs = np.gradient(g_pts, axis=0)
        tangs /= np.maximum(np.linalg.norm(tangs, axis=1, keepdims=True), 1e-8)
        ref = np.array([0.0, 1.0, 0.0])
        b1 = np.cross(tangs, ref)
        b1_nrm = np.linalg.norm(b1, axis=1, keepdims=True)
        b1 = np.where(b1_nrm < 1e-4, np.array([1.0, 0.0, 0.0]), b1 / np.maximum(b1_nrm, 1e-8))
        b2 = np.cross(tangs, b1)

        lock_freq = float(rng.uniform(8.0, 11.5))
        lock_ph = float(rng.uniform(0.0, 2.0 * math.pi))

        for _ in range(children_per_guide):
            r_rand = math.sqrt(float(rng.uniform(0.0, 1.0)))
            ang = float(rng.uniform(0.0, 2.0 * math.pi))
            ox = r_rand * math.cos(ang)
            oy = r_rand * math.sin(ang) * 0.50

            spread = (
                root_spread * ((1.0 - u) ** 1.3)
                + mid_spread * np.sin(np.pi * (u ** 0.72))
                + tip_spread * (u ** 1.6)
            )
            ph_jit = float(rng.normal(0.0, 0.22))
            micro_w1 = 0.0014 * (u ** 1.1) * np.sin(lock_freq * u + lock_ph + ph_jit)
            micro_w2 = 0.0009 * (u ** 1.1) * np.cos(lock_freq * 0.85 * u + lock_ph * 1.2 + ph_jit)

            c_pts = g_pts + b1 * (ox * spread + micro_w1)[:, None] + b2 * (oy * spread + micro_w2)[:, None]
            if collider is not None:
                c_pts = collider.resolve_points(c_pts, clearance=clearance, skip_first_n=2)
                c_pts = smooth_strand(c_pts, iterations=1)
                c_pts = collider.resolve_points(c_pts, clearance=clearance * 0.9, skip_first_n=2)
            else:
                c_pts = smooth_strand(c_pts, iterations=1)

            r0 = base_radius * float(rng.uniform(0.84, 1.20))
            rads = r0 * np.maximum(0.14, (1.0 - u) ** 0.62)

            all_pts.append(c_pts)
            all_rads.append(rads)

    return all_pts, all_rads


def build_chestnut_wavy_hair(rest_sculpted_pts, pose_tf, sweater_info, collection):
    """
    Build lush, full-crowned, face-framing 3D Chestnut Wavy Hair matching input/reference.png!
    - Dense off-center parting coverage across the ENTIRE top/front crown (zero bald crown!)
    - Strict lateral temple routing + face keep-out shield (zero stray hair across face/eyes/lips!)
    - Exact garment mesh collision (zero hair tunnelling into collar or back sweater!)
    - Airy see-through wispy bangs + diagonal side-swept lock above eyebrows
    """
    rng = np.random.default_rng(20261201)
    scalp_pts, scalp_normals = extract_scalp_surface_points(rest_sculpted_pts)
    collider = ExactGarmentAndHeadCollider(pose_tf, sweater_info)

    part_x = -0.014
    long_guides = []
    n_p_long = 28
    u_long = np.linspace(0.0, 1.0, n_p_long)

    # =========================================================================
    # 1. Back & Side-Back Continuous Wavy Waterfall (260 guides -> 100% lush back & crown!)
    # =========================================================================
    golden = (math.sqrt(5.0) - 1.0) * 0.5
    for ig in range(260):
        frac_az = ig / 259.0
        az = math.radians(-28.0 + 236.0 * frac_az + rng.normal(0.0, 1.0))
        elev = float(((ig * golden) % 1.0) * 0.94 + 0.04)

        cz = 1.464 + 0.198 * (elev ** 0.76)
        rad_h = 0.088 * math.sin(math.acos(min(0.99, max(-0.95, (cz - 1.545) / 0.126))))
        qx = part_x * (elev ** 2.0) + rad_h * math.cos(az)
        qy = -0.045 + rad_h * math.sin(az)

        root_rest, nrm_rest = sample_scalp_root(scalp_pts, scalp_normals, np.array([qx, qy, cz]))
        side_sign = 1.0 if root_rest[0] >= part_x else -1.0
        backness = float(smoothstep(-0.030, 0.035, np.array([root_rest[1]]))[0])
        is_left_ear = (root_rest[0] > 0.035) and (root_rest[1] < 0.015)

        lat_dep = side_sign * (1.0 - 0.82 * backness)
        back_dep = 0.28 + 0.72 * backness
        init_rest = np.array([lat_dep * 0.72, back_dep * 0.65, -0.35])
        init_rest = init_rest - np.dot(init_rest, nrm_rest) * nrm_rest + 0.13 * nrm_rest
        init_rest /= max(1e-8, np.linalg.norm(init_rest))

        root_world = pose_tf.transform_head_rigid(root_rest)
        init_world = pose_tf.transform_head_dir(init_rest)
        init_world[2] = min(init_world[2], 0.06)
        init_world /= max(1e-8, np.linalg.norm(init_world))

        u_hem_bonus = 0.10 * backness * (1.0 - min(1.0, abs(root_rest[0]) / 0.085))
        strand_len = (float(rng.uniform(0.42, 0.52)) + u_hem_bonus) * (0.82 + 0.18 * elev)
        wave_ph = float(rng.uniform(0.0, 2.0 * math.pi))
        wave_amp = float(rng.uniform(0.016, 0.028))

        g = np.zeros((n_p_long, 3), dtype=np.float64)
        cur = root_world.copy()
        g[0] = cur
        step = strand_len / (n_p_long - 1)

        for k in range(1, n_p_long):
            uk = u_long[k]
            w_grav = float(smoothstep(0.0, 0.08, np.array([uk]))[0])

            ear_tuck_y = 0.36 * math.exp(-0.5 * ((uk - 0.15) / 0.09) ** 2) if is_left_ear else 0.0
            sway_x = wave_amp * math.sin(9.5 * uk + wave_ph) * (uk ** 0.72)
            sway_y = (wave_amp * 0.70) * math.cos(8.5 * uk + wave_ph * 0.85) * (uk ** 0.72)

            lat_glide = (0.05 if side_sign > 0 else -0.08) * (1.0 - backness) * (1.0 - uk)
            back_fan_x = root_rest[0] * 0.50 * backness * (1.0 - 0.45 * uk)
            # Gentle +Y drape over upper-back collar/sweater so hair cascades smoothly outside garment!
            back_drape_y = (0.24 * backness * (1.0 - 0.55 * uk)) + ear_tuck_y

            grav_dir = np.array([lat_glide + back_fan_x + sway_x, back_drape_y + sway_y, -0.96])
            grav_dir /= np.linalg.norm(grav_dir)

            d = (1.0 - w_grav) * init_world + w_grav * grav_dir
            d /= np.linalg.norm(d)
            cur = cur + d * step
            g[k] = cur

        g = collider.resolve_points(g, clearance=0.0038, skip_first_n=2)
        g = smooth_strand(g, iterations=3)
        g = collider.resolve_points(g, clearance=0.0030, skip_first_n=2)
        long_guides.append(g)

    # =========================================================================
    # 2. Full Front-Crown Parting & Right-Side (-X) Voluminous Chest Cascade (110 guides!)
    # =========================================================================
    # Rooted RIGHT along the off-center part line (`x_rest = part_x - 0.002` outward across right crown)
    # from the front hairline (`y_rest = -0.130`) all the way back to the crown (`y_rest = +0.015`),
    # arching +11mm over the top-left cranium (covering 100% of crown skin!) before framing her right cheek!
    for ig in range(110):
        u_part = (ig % 22) / 21.0       # 0 = front hairline, 1 = mid-back crown!
        v_lat = (ig // 22) / 4.0        # 0 = right next to part_x, 1 = down right temple!

        rx = part_x - 0.002 - 0.062 * (v_lat ** 0.90) + rng.normal(0.0, 0.002)
        ry = -0.130 + 0.145 * u_part + rng.normal(0.0, 0.003)
        rz = 1.655 - 0.055 * (v_lat ** 1.3) - 0.018 * ((1.0 - u_part) ** 2)
        root_rest, nrm_rest = sample_scalp_root(scalp_pts, scalp_normals, np.array([rx, ry, rz]))

        # Arch OVER the top-right cranium (`h1`, `h2` stay OUTSIDE skull & temple `x <= -0.078`!)
        h0 = root_rest
        h1 = root_rest + nrm_rest * 0.010 + np.array([-0.034, 0.006, 0.004 * (1.0 - v_lat)])
        h2 = np.array([
            -0.084 - 0.012 * v_lat,
            -0.102 + 0.095 * u_part,
            1.565 - 0.028 * v_lat,
        ])
        h3 = np.array([
            -0.088 - 0.015 * v_lat,
            -0.105 + 0.085 * u_part,
            1.485 - 0.018 * v_lat,
        ])
        p0 = pose_tf.transform_head_rigid(h0)
        p1 = pose_tf.transform_head_rigid(h1)
        p2 = pose_tf.transform_head_rigid(h2)
        p3 = pose_tf.transform_head_rigid(h3)

        # Cascade in lush S-waves across her front-left pink sweater (matching reference.png!)
        fan_x = -0.148 + 0.118 * (1.0 - u_part) + rng.normal(0.0, 0.006)
        sw = 0.025 * math.sin(u_part * 8.0 + v_lat * 2.6)
        len_z = float(rng.uniform(-0.045, 0.025)) - 0.03 * (1.0 - abs(u_part - 0.4))

        p4 = np.array([fan_x * 0.88 - 0.020, -0.145 - 0.025 * (1.0 - u_part), 1.365])
        p5 = np.array([fan_x + sw, -0.180 - 0.010 * v_lat, 1.258])
        p6 = np.array([fan_x - sw * 0.90, -0.186 - 0.010 * v_lat, 1.158 + len_z * 0.5])
        p7 = np.array([fan_x + sw * 0.55 + 0.015, -0.172, 1.062 + len_z])

        g, _ = eval_catmull_rom([p0, p1, p2, p3, p4, p5, p6, p7], u_long)
        g = collider.resolve_points(g, clearance=0.0035, skip_first_n=2)
        g = smooth_strand(g, iterations=2)
        g = collider.resolve_points(g, clearance=0.0028, skip_first_n=2)
        long_guides.append(g)

    # =========================================================================
    # 3. Full Front-Crown Parting & Left-Side (+X) Ear-Tucked Shoulder Locks (90 guides!)
    # =========================================================================
    # Rooted RIGHT along the +X side of `part_x` from front hairline (`y_rest = -0.130`) back to crown,
    # arching +11mm over the top-right cranium (eliminating the exposed forehead/crown dome!),
    # sweeping around her temple & behind her exposed left ear (+X), and draping onto her left shoulder!
    for ig in range(90):
        u_part = (ig % 18) / 17.0
        v_lat = (ig // 18) / 4.0

        rx = part_x + 0.002 + 0.074 * (v_lat ** 0.90) + rng.normal(0.0, 0.002)
        ry = -0.128 + 0.142 * u_part + rng.normal(0.0, 0.003)
        rz = 1.655 - 0.055 * (v_lat ** 1.3) - 0.018 * ((1.0 - u_part) ** 2)
        root_rest, nrm_rest = sample_scalp_root(scalp_pts, scalp_normals, np.array([rx, ry, rz]))

        # Smooth crown-hugging arch over +X cranium -> behind left ear (`y_rest > -0.022` at `z_rest = 1.54`)!
        h0 = root_rest
        h1 = root_rest + nrm_rest * 0.010 + np.array([0.036, 0.012, 0.004 * (1.0 - v_lat)])
        h2 = np.array([
            0.074 + 0.010 * v_lat,
            -0.068 + 0.082 * u_part,
            1.592 - 0.022 * v_lat,
        ])
        h3 = np.array([
            0.083 + 0.006 * v_lat,
            -0.016 + 0.048 * u_part,  # tucked cleanly behind left ear!
            1.535 - 0.018 * v_lat,
        ])
        h4 = np.array([
            0.078 + 0.008 * u_part,
            -0.012 + 0.045 * u_part,
            1.455 - 0.012 * v_lat,
        ])

        p0 = pose_tf.transform_head_rigid(h0)
        p1 = pose_tf.transform_head_rigid(h1)
        p2 = pose_tf.transform_head_rigid(h2)
        p3 = pose_tf.transform_head_rigid(h3)
        p4 = pose_tf.transform_head_rigid(h4)

        # Drape smoothly OUTSIDE the sweater collar/shoulder (+X ~ 0.11..0.20, Y ~ -0.08..+0.04)!
        fan_r = 0.108 + 0.085 * u_part + rng.normal(0.0, 0.005)
        p5 = np.array([fan_r * 0.94, -0.055 + 0.075 * u_part, 1.352 - 0.010 * u_part])
        p6 = np.array([fan_r * 1.08, -0.085 + 0.085 * u_part, 1.245 - 0.045 * v_lat])

        g, _ = eval_catmull_rom([p0, p1, p2, p3, p4, p5, p6], u_long)
        g = collider.resolve_points(g, clearance=0.0035, skip_first_n=2)
        g = smooth_strand(g, iterations=2)
        g = collider.resolve_points(g, clearance=0.0028, skip_first_n=2)
        long_guides.append(g)

    long_pts, long_rads = expand_guides_to_strands(
        long_guides,
        children_per_guide=28,  # 460 * 28 = 12,880 glossy, full-crowned wavy chestnut strands!
        root_spread=0.0048,
        mid_spread=0.0052,
        tip_spread=0.0022,
        base_radius=0.000092,
        rng=rng,
        collider=collider,
        clearance=0.0024,
    )
    hair_long_obj = create_curves_object("Hair_LongWaves", long_pts, long_rads, collection)

    # =========================================================================
    # 4. Hair_ScalpBase: Dense Root-to-Nape Under-Layer (STRICTLY SWEPT SIDEWAYS/BACK!)
    # =========================================================================
    base_guides = []
    n_p_base = 14
    u_base = np.linspace(0.0, 1.0, n_p_base)
    for ig in range(200):
        idx = int((ig * 97) % len(scalp_pts))
        root_rest = scalp_pts[idx] - scalp_normals[idx] * 0.0005
        nrm_rest = scalp_normals[idx]

        side_s = 1.0 if root_rest[0] >= part_x else -1.0
        backness = float(smoothstep(-0.03, 0.03, np.array([root_rest[1]]))[0])
        b_len = float(rng.uniform(0.14, 0.24))

        # CRITICAL: Sweep strongly sideways (±X) & backward (+Y) on front crown so ZERO base hairs drop over forehead!
        lat_sweep = side_s * (0.88 - 0.72 * backness)
        back_sweep = 0.48 + 0.45 * backness
        tang_rest = np.array([lat_sweep, back_sweep, -0.35])
        tang_rest = tang_rest - np.dot(tang_rest, nrm_rest) * nrm_rest + 0.08 * nrm_rest
        tang_rest /= max(1e-8, np.linalg.norm(tang_rest))

        g_rest = np.zeros((n_p_base, 3), dtype=np.float64)
        cur_r = root_rest.copy()
        g_rest[0] = cur_r
        for k in range(1, n_p_base):
            uk = u_base[k]
            down_r = np.array([side_s * 0.32 * (1.0 - backness), 0.38, -0.88])
            down_r /= np.linalg.norm(down_r)
            dr = (1.0 - uk) * tang_rest + uk * down_r
            dr /= np.linalg.norm(dr)
            cur_r = cur_r + dr * (b_len / (n_p_base - 1))
            g_rest[k] = cur_r

        g_w = pose_tf.transform_head_rigid(g_rest)
        g_w = collider.resolve_points(g_w, clearance=0.0024, skip_first_n=2)
        g_w = smooth_strand(g_w, iterations=2)
        g_w = collider.resolve_points(g_w, clearance=0.0020, skip_first_n=2)
        base_guides.append(g_w)

    base_pts, base_rads = expand_guides_to_strands(
        base_guides,
        children_per_guide=24,  # 4,800 dense skull-hugging root strands
        root_spread=0.0060,
        mid_spread=0.0060,
        tip_spread=0.0032,
        base_radius=0.000118,
        rng=rng,
        collider=collider,
        clearance=0.0018,
    )
    hair_base_obj = create_curves_object("Hair_ScalpBase", base_pts, base_rads, collection)

    # =========================================================================
    # 5. Hair_WispyBangs: Delicate Airy See-Through Fringe + Diagonal Side-Swept Lock!
    # =========================================================================
    forehead_pts = rest_sculpted_pts[
        (rest_sculpted_pts[:, 2] > 1.545)
        & (rest_sculpted_pts[:, 2] < 1.638)
        & (rest_sculpted_pts[:, 1] < -0.105)
    ]

    def forehead_surface_y(xq, zq):
        d2 = (forehead_pts[:, 0] - xq) ** 2 + (forehead_pts[:, 2] - zq) ** 2
        w = np.exp(-0.5 * d2 / (0.0065 ** 2))
        return float(np.sum(forehead_pts[:, 1] * w) / np.maximum(np.sum(w), 1e-12))

    bang_pts = []
    bang_rads = []
    n_p_bang = 14
    u_bang = np.linspace(0.0, 1.0, n_p_bang)

    # (a) 16 airy see-through wisps ending cleanly ABOVE the eyes (`z_rest ~ 1.560 .. 1.568`)!
    for ib in range(16):
        tb = ib / 15.0
        rx = -0.030 + 0.058 * tb + rng.normal(0.0, 0.0014)
        rz = 1.628 - 0.006 * abs(tb - 0.35)
        root_rest, _ = sample_scalp_root(scalp_pts, scalp_normals, np.array([rx, -0.128, rz]))

        end_x = rx * 0.76 + 0.009 + 0.014 * (tb - 0.25)
        end_z = 1.563 + 0.004 * math.sin(ib * 2.1) - 0.006 * (max(0.0, abs(tb - 0.45) - 0.28) / 0.28)

        for _ in range(20):
            jx = float(rng.normal(0.0, 0.0011))
            jz = float(rng.uniform(-0.0018, 0.0018))
            air_lift = float(rng.uniform(0.0024, 0.0044))

            pts_b = np.zeros((n_p_bang, 3), dtype=np.float64)
            for k, uk in enumerate(u_bang):
                xk = (1.0 - uk) * (root_rest[0] + jx * 0.5) + uk * (end_x + jx) + 0.003 * (uk ** 1.6)
                zk = (1.0 - uk ** 1.08) * root_rest[2] + (uk ** 1.08) * (end_z + jz)
                arch_out = air_lift * math.sin(math.pi * (uk ** 0.72)) + 0.0015 * uk
                yk = forehead_surface_y(xk, zk) - arch_out if k > 0 else root_rest[1]
                pts_b[k] = [xk, yk, zk]

            pts_b = smooth_strand(pts_b, iterations=1)
            bang_pts.append(pose_tf.transform_head_rigid(pts_b))
            r0 = float(rng.uniform(0.000042, 0.000056))
            bang_rads.append(r0 * np.maximum(0.10, (1.0 - u_bang) ** 0.72))

    # (b) Signature diagonal side-swept lock sweeping from part across upper-right forehead to top of left ear (+X)!
    for isb in range(14):
        ts = isb / 13.0
        rx = -0.008 + 0.036 * ts
        root_rest, _ = sample_scalp_root(scalp_pts, scalp_normals, np.array([rx, -0.126, 1.636 - 0.012 * ts]))
        p1 = np.array([rx + 0.020, forehead_surface_y(rx + 0.020, 1.606) - 0.0048, 1.608 - 0.005 * ts])
        p2 = np.array([0.048 + 0.008 * ts, forehead_surface_y(0.048, 1.576) - 0.0045, 1.578 - 0.005 * ts])
        p3 = np.array([0.070 + 0.005 * ts, -0.102 + 0.014 * ts, 1.548 - 0.006 * ts])
        p4 = np.array([0.079 + 0.004 * ts, -0.062 + 0.014 * ts, 1.524 - 0.008 * ts])
        g_rest, _ = eval_catmull_rom([root_rest, p1, p2, p3, p4], u_bang)

        for _ in range(26):
            ox = float(rng.normal(0.0, 0.0015))
            oz = float(rng.normal(0.0, 0.0016))
            offset = np.stack([ox * np.sin(np.pi * u_bang), -abs(ox) * 0.4 * u_bang, oz * u_bang], axis=1)
            bang_pts.append(pose_tf.transform_head_rigid(g_rest + offset))
            r0 = float(rng.uniform(0.000048, 0.000062))
            bang_rads.append(r0 * np.maximum(0.12, (1.0 - u_bang) ** 0.65))

    hair_bangs_obj = create_curves_object("Hair_WispyBangs", bang_pts, bang_rads, collection)

    # =========================================================================
    # 6. Hair_Flyaways: Delicate Sunlit Rim Stray Wisps (with strict face shield!)
    # =========================================================================
    fly_pts = []
    fly_rads = []
    for _ in range(420):
        idx = int(rng.integers(0, len(long_guides)))
        base_g = long_guides[idx]
        n_p = len(base_g)
        u = np.linspace(0.0, 1.0, n_p)
        halo_dir = np.array([rng.normal(0.0, 0.8), rng.normal(-0.10, 0.6), rng.uniform(-0.1, 0.25)])
        halo_dir /= max(1e-8, np.linalg.norm(halo_dir))
        amp = float(rng.uniform(0.003, 0.009))
        ph = float(rng.uniform(0.0, 6.28))
        f_pts = base_g + halo_dir[None, :] * (amp * np.sin(np.pi * (u ** 0.72)))[:, None]
        f_pts[:, 0] += 0.003 * (u ** 1.1) * np.sin(9.5 * u + ph)
        f_pts = collider.resolve_points(f_pts, clearance=0.0030, skip_first_n=2)
        fly_pts.append(f_pts)
        r0 = float(rng.uniform(0.000034, 0.000048))
        fly_rads.append(r0 * np.maximum(0.10, (1.0 - u) ** 0.8))

    hair_fly_obj = create_curves_object("Hair_Flyaways", fly_pts, fly_rads, collection)

    return {
        "scalp_base": hair_base_obj,
        "long_waves": hair_long_obj,
        "wispy_bangs": hair_bangs_obj,
        "flyaways": hair_fly_obj,
        "strand_counts": {
            "scalp_base": len(base_pts),
            "long_waves": len(long_pts),
            "wispy_bangs": len(bang_pts),
            "flyaways": len(fly_pts),
        },
    }
