"""Procedural posing: torso lean, neck/head tilt and two-bone IK arms reaching
toward the selfie camera, applied with hand-built linear-blend-skinning weights.
"""
import math
import numpy as np
from pb_common import smoothstep, falloff_ellip, rot_matrix, normalize

# rest landmarks (from input/environment.json, meters)
LM = {
    'pelvis': np.array([0.0, -0.01445, 0.889485]),
    'spine1': np.array([0.0, 0.007125, 1.249655]),
    'neck': np.array([0.0, -0.0068, 1.4058]),
    'head': np.array([0.0, -0.0161, 1.5143]),
    'l_clav': np.array([0.0266, -0.0694, 1.3359]),
    'l_shoulder': np.array([0.1677, -0.0146, 1.3414]),
    'l_elbow': np.array([0.3129, -0.0132, 1.1661]),
    'l_wrist': np.array([0.431185, -0.175655, 1.0619812]),
    'l_hand_tip': np.array([0.47841375, -0.30146875, 0.9470775]),   # finger 3 tip
    'l_thumb': np.array([0.3916775, -0.28760625, 1.01681125]),
}


def mirror(p):
    return p * np.array([-1.0, 1.0, 1.0])


def rot_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    s = np.linalg.norm(v)
    c = float(np.dot(a, b))
    if s < 1e-9:
        return np.eye(3)
    return rot_matrix(v / s, math.atan2(s, c))


def euler_xyz(rx, ry, rz):
    """Rotation applying X then Y then Z (degrees)."""
    return rot_matrix((0, 0, 1), math.radians(rz)) @ rot_matrix((0, 1, 0), math.radians(ry)) @ rot_matrix((1, 0, 0), math.radians(rx))


class Xf:
    """Affine transform p -> t + R (p - pivot)."""

    def __init__(self, R=None, pivot=None, t=None):
        self.R = np.eye(3) if R is None else R
        self.pivot = np.zeros(3) if pivot is None else np.asarray(pivot, float)
        self.t = self.pivot.copy() if t is None else np.asarray(t, float)

    def __call__(self, p):
        return self.t + (np.asarray(p) - self.pivot) @ self.R.T

    def compose(self, other):
        """self o other  (apply other first)."""
        R = self.R @ other.R
        # p -> self(other(p)) = self.t + R_s(other.t + R_o(p - po) - ps)
        t = self(other.t)
        return Xf(R, other.pivot, t)

    def matrix4(self):
        M = np.eye(4)
        M[:3, :3] = self.R
        M[:3, 3] = self.t - self.R @ self.pivot
        return M


DEFAULT_POSE = dict(
    torso_rx=5.0, torso_ry=4.0, torso_rz=0.0,      # forward lean, roll (top toward +X), twist
    neck_rx=-2.0, neck_ry=-14.0, neck_rz=-2.0,
    head_rx=-3.0, head_ry=-12.0, head_rz=-3.0,
    neck_drop=0.0,
    clav_elev_r=12.0, clav_prot_r=18.0,
    clav_elev_l=6.0, clav_prot_l=14.0,
)


def build_pose(cam_pos, targets, pose=None):
    """Compute bone transforms. targets: dict side->(wrist_target, pole, hand_dir, palm_normal)."""
    P = dict(DEFAULT_POSE)
    if pose:
        P.update(pose)
    X = {}
    waist = np.array([0.0, -0.01, 1.02])
    X['torso'] = Xf(euler_xyz(P['torso_rx'], P['torso_ry'], P['torso_rz']), waist)
    neck_piv = np.array([0.0, -0.012, 1.395])
    head_piv = np.array([0.0, -0.022, 1.475])
    X['neck'] = X['torso'].compose(Xf(euler_xyz(P['neck_rx'], P['neck_ry'], P['neck_rz']), neck_piv,
                                      neck_piv + np.array([0.0, 0.0, -P.get('neck_drop', 0.0)])))
    X['head'] = X['neck'].compose(Xf(euler_xyz(P['head_rx'], P['head_ry'], P['head_rz']), head_piv))
    chains = {}
    for side, sgn in (('l', 1.0), ('r', -1.0)):
        f = (lambda p: p) if sgn > 0 else mirror
        C, S, E, W = f(LM['l_clav']), f(LM['l_shoulder']), f(LM['l_elbow']), f(LM['l_wrist'])
        Ht, Th = f(LM['l_hand_tip']), f(LM['l_thumb'])
        elev = P['clav_elev_' + side]
        prot = P['clav_prot_' + side]
        dc = S - C
        dn = rot_matrix((0, 0, 1), math.radians(prot) * sgn) @ dc          # swing forward (-Y)
        dn = rot_matrix((0, 1, 0), -math.radians(elev) * sgn) @ dn          # raise (+Z)
        Rc = rot_between(dc, dn)
        X['clav_' + side] = X['torso'].compose(Xf(Rc, C))
        S2 = X['clav_' + side](S)
        Wt, pole, hand_dir, palm_n = targets[side]
        L1 = np.linalg.norm(E - S)
        L2 = np.linalg.norm(W - E)
        dvec = Wt - S2
        d = np.linalg.norm(dvec)
        d = min(d, (L1 + L2) * 0.999)
        u = dvec / np.linalg.norm(dvec)
        Wt = S2 + u * d
        cosa = np.clip((L1 ** 2 + d ** 2 - L2 ** 2) / (2 * L1 * d), -1, 1)
        alpha = math.acos(cosa)
        pv = np.asarray(pole, float)
        v = pv - np.dot(pv, u) * u
        v /= np.linalg.norm(v)
        E2 = S2 + L1 * (math.cos(alpha) * u + math.sin(alpha) * v)
        # frames
        def frame(a, b, n):
            f1 = normalize(b - a)
            f2 = normalize(n - np.dot(n, f1) * f1)
            return np.stack([f1, f2, np.cross(f1, f2)], 1)
        n_rest = np.cross(E - S, W - E)
        n_rest /= np.linalg.norm(n_rest)
        n_new = np.cross(E2 - S2, Wt - E2)
        if np.linalg.norm(n_new) < 1e-6:
            n_new = np.cross(E2 - S2, pv)
        n_new /= np.linalg.norm(n_new)
        # rest bones are expressed after clavicle rotation
        Rcw = X['clav_' + side].R
        Fu_rest = frame(S, E, n_rest)
        Fu_new = frame(S2, E2, n_new)
        Ru = Fu_new @ Fu_rest.T
        X['upper_' + side] = Xf(Ru, S, S2)
        Ff_rest = frame(E, W, n_rest)
        Ff_new = frame(E2, Wt, n_new)
        Rf = Ff_new @ Ff_rest.T
        X['fore_' + side] = Xf(Rf, E, E2)
        # hand: orient so that hand_dir/palm_normal are met
        hd_rest = normalize(Ht - W)
        palm_rest = normalize(np.cross(Ht - W, Th - W)) * sgn
        Fh_rest = np.stack([hd_rest, palm_rest, np.cross(hd_rest, palm_rest)], 1)
        if hand_dir is None:
            hand_dir = normalize(Wt - E2) + np.array([0.0, 0.0, 0.12])
        hd_new = normalize(np.asarray(hand_dir, float))
        pn = np.asarray(palm_n, float)
        pn = normalize(pn - np.dot(pn, hd_new) * hd_new)
        Fh_new = np.stack([hd_new, pn, np.cross(hd_new, pn)], 1)
        Rh = Fh_new @ Fh_rest.T
        X['hand_' + side] = Xf(Rh, W, Wt)
        chains[side] = dict(S=S2, E=E2, W=Wt, C=X['torso'](C), hand_tip=X['hand_' + side](Ht),
                            S_rest=S, E_rest=E, W_rest=W, L1=L1, L2=L2)
    return X, chains


def skin_weights(co):
    """Return dict bone -> weight array (sums to 1)."""
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    n = len(co)
    W = {}
    # ---- head / neck ----
    rcol = np.sqrt((x / 0.058) ** 2 + ((y + 0.022) / 0.055) ** 2)
    col = 1 - smoothstep(1.0, 1.45, rcol)
    h_n = smoothstep(1.355, 1.435, z)
    h_h = smoothstep(1.445, 1.50, z)
    outside = smoothstep(0.92, 1.30, rcol) * smoothstep(1.405, 1.437, z) * smoothstep(-0.0, -0.06, y)
    head_region = (z > 1.40) & (np.abs(x) < 0.11)
    w_head = np.maximum(h_h * np.where(z > 1.43, 1.0, col), outside) * head_region
    w_head = np.clip(w_head + (z > 1.50) * head_region, 0, 1)
    w_neck = (1 - w_head) * h_n * col
    W['head'] = w_head
    W['neck'] = w_neck
    rest = 1 - w_head - w_neck
    # ---- arms ----
    for side, sgn in (('l', 1.0), ('r', -1.0)):
        f = (lambda p: p) if sgn > 0 else mirror
        S, E, Wr = f(LM['l_shoulder']), f(LM['l_elbow']), f(LM['l_wrist'])
        xs = x * sgn
        # membership: lateral of a boundary that hugs the torso side
        xb = np.interp(z, [1.05, 1.20, 1.30, 1.36, 1.42], [0.175, 0.170, 0.150, 0.140, 0.150])
        a = smoothstep(xb - 0.018, xb + 0.022, xs) * (1 - smoothstep(1.38, 1.43, z) * (1 - smoothstep(0.15, 0.19, xs)))
        d1 = (E - S) / np.linalg.norm(E - S)
        d2 = (Wr - E) / np.linalg.norm(Wr - E)
        s1 = ((co - S) @ d1) / np.linalg.norm(E - S)
        s2 = ((co - E) @ d2) / np.linalg.norm(Wr - E)
        t_fore = smoothstep(-0.10, 0.12, s2) * smoothstep(0.55, 0.8, s1)
        t_hand = smoothstep(0.92, 1.03, s2)
        t_up = smoothstep(-0.05, 0.30, s1)
        w_hand = a * t_hand
        w_fore = a * t_fore * (1 - t_hand)
        w_up = a * (1 - t_fore) * t_up * (1 - t_hand)
        w_cl = a * (1 - t_fore) * (1 - t_up) * (1 - t_hand)
        # shoulder-top region partly follows clavicle
        creg = falloff_ellip(co, S + np.array([-0.035 * sgn, 0.0, 0.03]), (0.07, 0.07, 0.06), 1) * (1 - a)
        creg *= (z > 1.25)
        w_cl = w_cl + creg * 0.55
        tot = w_hand + w_fore + w_up + w_cl
        scale = np.where(tot > rest, rest / np.maximum(tot, 1e-9), 1.0)
        for nm, w in (('hand', w_hand), ('fore', w_fore), ('upper', w_up), ('clav', w_cl)):
            W[nm + '_' + side] = w * scale
        rest = rest - tot * scale
    W['torso'] = np.clip(rest, 0, 1)
    return W


def apply_skin(co, X, W):
    out = np.zeros_like(co)
    for nm, w in W.items():
        m = w > 1e-6
        if not np.any(m):
            continue
        out[m] += w[m, None] * X[nm](co[m])
    return out


def load_landmarks(path='input/environment.json'):
    import json
    with open(path) as fh:
        d = json.load(fh)
    return {k: np.array(v) for k, v in d['landmarks'].items()}


def curl_fingers(co, lms, curl=(16.0, 26.0, 18.0), thumb=14.0, adduct=0.6):
    """Relax the flat, spread MakeHuman hands in the rest pose: bring fingers
    2/4/5 toward the middle finger (adduction about the palm normal) and flex
    every finger at MCP/PIP/DIP toward the palm, smoothly blended at joints."""
    co = co.copy()
    for side, sgn in (('l', 1.0), ('r', -1.0)):
        wrist = lms[f'joint-{side}-hand']
        i1 = lms[f'joint-{side}-finger-2-1']
        p1 = lms[f'joint-{side}-finger-5-1']
        back_n = normalize(np.cross(i1 - wrist, p1 - wrist)) * sgn      # back-of-hand normal (both hands)
        Jm = [lms[f'joint-{side}-finger-3-{k}'] for k in (1, 2, 3, 4)]
        dm = normalize(Jm[3] - Jm[0])
        dm = normalize(dm - np.dot(dm, back_n) * back_n)
        for f in (2, 3, 4, 5):
            J = [lms[f'joint-{side}-finger-{f}-{k}'].copy() for k in (1, 2, 3, 4)]
            d = normalize(J[3] - J[0])
            seg_len = np.linalg.norm(J[3] - J[0])
            rel = co - J[0]
            t = rel @ d
            radial = np.linalg.norm(rel - np.outer(t, d), axis=1)
            own = (radial < 0.0115) & (t > -0.012) & (t < seg_len + 0.02)
            if not np.any(own):
                continue
            idx = np.where(own)[0]
            p = co[idx].copy()
            # adduction toward the middle finger
            if f != 3:
                dp = normalize(d - np.dot(d, back_n) * back_n)
                ang = math.atan2(np.dot(np.cross(dp, dm), back_n), np.dot(dp, dm)) * adduct
                R = rot_matrix(back_n, ang)
                tk = (p - J[0]) @ d
                wk = smoothstep(-0.006, 0.006, tk)
                rotated = J[0] + (p - J[0]) @ R.T
                p = p + (rotated - p) * wk[:, None]
                for kk in (1, 2, 3):
                    J[kk] = J[0] + R @ (J[kk] - J[0])
                d = normalize(J[3] - J[0])
            axis = normalize(np.cross(d, back_n))
            for k in (2, 1, 0):
                piv = J[k]
                dk = normalize(J[k + 1] - J[k])
                tk = (p - piv) @ dk
                wk = smoothstep(-0.004, 0.004, tk)
                # flex toward the palm (= away from the back-of-hand normal)
                R = rot_matrix(axis, -math.radians(curl[k]) * (1.0 if f != 5 else 1.15))
                rotated = piv + (p - piv) @ R.T
                p = p + (rotated - p) * wk[:, None]
                for kk in range(k + 1, 4):
                    J[kk] = piv + R @ (J[kk] - piv)
            co[idx] = p
        # thumb: swing slightly toward the palm
        T = [lms[f'joint-{side}-finger-1-{k}'] for k in (1, 2, 3, 4)]
        d = normalize(T[3] - T[0])
        rel = co - T[0]
        t = rel @ d
        radial = np.linalg.norm(rel - np.outer(t, d), axis=1)
        own = (radial < 0.013) & (t > -0.005) & (t < np.linalg.norm(T[3] - T[0]) + 0.02)
        idx = np.where(own)[0]
        if len(idx):
            axis = normalize(np.cross(d, back_n))
            R = rot_matrix(axis, -math.radians(thumb))
            w = smoothstep(-0.003, 0.01, t[idx])
            p = co[idx]
            rotated = T[0] + (p - T[0]) @ R.T
            co[idx] = p + (rotated - p) * w[:, None]
    return co
