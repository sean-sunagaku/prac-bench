"""Knitted pullover, continuous sleeve seams, and the posed hand meshes."""
from math import cos, pi, sin

import numpy as np
from mathutils import Quaternion, Vector

from portrait_core import (ROOT, TAU, clamp, image, material, mesh, mix, normals_for_path, obj_input,
                           orient, setup_node, smooth, solidify, spline, subdiv, submesh, wire)
from portrait_face import add_pigment, neck_profile

STITCH = .00345
ROW = .0040
TILE = 4


def knit_tile():
    """Rasterize a repeating swatch of interlocking twisted yarn paths."""
    n = 512
    unit = n / TILE
    loft = np.zeros((n, n), dtype=np.float32)
    fiber = np.zeros_like(loft)

    def yarn(points, width, elevation, tone):
        for q, (a, b) in enumerate(zip(points, points[1:])):
            ax, ay = a
            bx, by = b
            lo, hi = max(0, int(unit*(min(ax,bx)-width))), min(n, int(unit*(max(ax,bx)+width))+1)
            low, high = max(0, int(unit*(min(ay,by)-width))), min(n, int(unit*(max(ay,by)+width))+1)
            if hi <= lo or high <= low:
                continue
            x = (np.arange(lo, hi)[None, :] + .5)/unit - ax
            y = (np.arange(low, high)[:, None] + .5)/unit - ay
            dx, dy = bx-ax, by-ay
            t = np.clip((x*dx + y*dy)/(dx*dx + dy*dy), 0, 1)
            d2 = (x-t*dx)**2 + (y-t*dy)**2
            cross = (x*dy - y*dx)/max(.0001, np.hypot(dx,dy))
            twist = .5+.5*np.cos((q+t)*2.20 + cross*23 + .27*ax)
            lift = np.where(d2 < width*width,
                            elevation*(.21+.79*np.sqrt(np.maximum(0, 1-d2/width**2)))*(.92+.08*twist), 0)
            patch = loft[low:high, lo:hi]
            old_fiber = fiber[low:high, lo:hi]
            replace = lift > patch
            old_fiber[replace] = ((.83 + .13*twist)*tone)[replace]
            np.maximum(patch, lift, out=patch)

    t = np.linspace(0, 1, 15)
    for row in range(-1, TILE+1):
        for col in range(-1, TILE+1):
            noise = np.sin(4.1*(row % TILE) + 2.3*(col % TILE))
            center = col+.50 + .028*noise
            y = row + .032*np.cos(4.5*(row % TILE) - 2.3*(col % TILE))
            tone = .95 + .045*noise
            # Sinkers sit behind the face stitches.
            u = np.linspace(-1, 1, 13)
            yarn(np.column_stack((center + .51*u, y+.14+.14*np.cos(pi*u))), .110, .62, tone)
            yarn(np.column_stack((center + .29*u, y+.79+.19*np.cos(pi*u/2))), .122, .65, tone*.98)
            for side in (-1, 1):
                vx = center + side*(.071 + .235*t + .041*np.sin(pi*t)) + .023*np.sin(TAU*t)
                vy = y + .07 + .92*t + .045*side
                yarn(np.column_stack((vx, vy)), .142 + .006*noise, .95-.045*side, tone)
    fy, fx = np.indices((n, n), dtype=np.float32)
    grain = .5 + .24*np.sin(fx*1.9+fy*.97) + .17*np.sin(fy*1.24-fx*.87)
    out = np.ones((n, n, 4), dtype=np.float32)
    out[:, :, 0] = np.clip(loft*(.966+.034*grain), 0, 1)
    out[:, :, 1] = np.clip(.22+.46*loft+.31*fiber+.025*grain, 0, 1)
    out[:, :, 2] = grain
    return image("Sweater • repeating 4×4 stockinette yarn swatch • 512", out)


def wool(name, tile, ribbed=False):
    mat, p = material(name, (.61, .29, .30), .81)
    p.location = (700, 210)
    mat.node_tree.nodes.get("Material Output").location = (980, 210)
    p.inputs["Specular IOR Level"].default_value = .25
    p.inputs["Sheen Weight"].default_value = .34
    p.inputs["Sheen Roughness"].default_value = .74
    p.inputs["Sheen Tint"].default_value = (1.0, .764, .739, 1)
    tx = setup_node(mat, "ShaderNodeTexCoord", "Physical-length pattern coordinates", (-1040, 170))
    knit = setup_node(mat, "ShaderNodeTexImage", "Packed procedural stockinette", (-810, 230))
    knit.image = tile
    wire(mat, tx, "UV", knit, "Vector")
    sep = setup_node(mat, "ShaderNodeSeparateColor", "Yarn height and color", (-535, 260))
    wire(mat, knit, "Color", sep, "Color")
    ramp = setup_node(mat, "ShaderNodeValToRGB", "Dyed rose-pink lambswool", (-285, 280))
    ramp.color_ramp.elements[0].position = .16
    ramp.color_ramp.elements[0].color = (.249, .080, .090, 1)
    ramp.color_ramp.elements[1].position = .97
    ramp.color_ramp.elements[1].color = ((.65, .332, .338, 1) if ribbed else (.663, .279, .302, 1))
    middle = ramp.color_ramp.elements.new(.60)
    middle.color = (.500, .188, .218, 1)
    wire(mat, sep, "Green", ramp, "Fac")
    noise = setup_node(mat, "ShaderNodeTexNoise", "Heathered yarn color", (-560, -125))
    noise.inputs["Scale"].default_value = 275
    noise.inputs["Detail"].default_value = 3.4
    wire(mat, tx, "Object", noise, "Vector")
    map_ = setup_node(mat, "ShaderNodeMapRange", "Soft marled variation", (-335, -95))
    map_.inputs["To Min"].default_value = .89
    map_.inputs["To Max"].default_value = 1.085
    wire(mat, noise, "Fac", map_, "Value")
    tint = setup_node(mat, "ShaderNodeMixRGB", "Heather over stitch color", (160, 310))
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1
    wire(mat, ramp, "Color", tint, 1)
    wire(mat, map_, "Result", tint, 2)
    wire(mat, tint, "Color", p, "Base Color")
    fuzz = setup_node(mat, "ShaderNodeTexNoise", "Loose fibrils in the yarn", (-520, -400))
    fuzz.inputs["Scale"].default_value = 3550
    fuzz.inputs["Detail"].default_value = 2.7
    wire(mat, tx, "Object", fuzz, "Vector")
    fine = setup_node(mat, "ShaderNodeBump", "Fine nap", (-80, -240))
    fine.inputs["Strength"].default_value = .14
    fine.inputs["Distance"].default_value = .00021
    wire(mat, fuzz, "Fac", fine, "Height")
    bump = setup_node(mat, "ShaderNodeBump", "Raised knitting", (392, 0))
    bump.inputs["Strength"].default_value = .70
    bump.inputs["Distance"].default_value = .00064
    wire(mat, sep, "Red", bump, "Height")
    wire(mat, fine, "Normal", bump, "Normal")
    wire(mat, bump, "Normal", p, "Normal")
    return mat


# height, width, center depth, front depth, back depth
PROFILE = np.array([
    (1.009, .141, -.041, .103, .076),
    (1.032, .143, -.043, .106, .081),
    (1.082, .143, -.046, .112, .085),
    (1.133, .143, -.049, .108, .091),
    (1.186, .153, -.046, .112, .094),
    (1.234, .174, -.045, .117, .095),
    (1.275, .177, -.039, .110, .092),
    (1.310, .187, -.044, .101, .090),
    (1.346, .185, -.045, .093, .086),
    (1.369, .164, -.037, .085, .075),
    (1.384, .105, -.032, .073, .064),
    (1.386, .076, -.032, .070, .064),
])
STATIONS = (0, .062, .20, .33, .46, .58, .68, .76, .84, .91, .965, 1)


def torso(theta, t):
    z, rx, cy, f, b = [np.interp(t, STATIONS, PROFILE[:, i]) for i in range(5)]
    side, front = sin(theta), cos(theta)
    # Cut the neck lower in front and raise the shoulder on camera-left.
    z += (.012 + .013*front) * -smooth(.87, 1, t) * max(front, 0)
    z += .015*smooth(.82, 1, t)*max(-front, 0)
    shoulder = smooth(.57,.89,t)*(1-.88*smooth(.92,1,t))*abs(side)**.88
    z += shoulder*(.022-.016*side)
    cy += .013*side*smooth(.50,.88,t)
    cy -= .032*shoulder*max(-side,0)**.72
    belly = .008*sin(theta + 4.3)*sin(2.3*pi*t)*(1-smooth(.80, .99, t))
    folds = ((.0070*sin(8*theta+.94*t) + .0035*sin(15*theta + 7*t))
             * (.45 + .55*(1-smooth(.34, .78, t))) * sin(pi*(.06+.91*t)))
    side_wrinkle = (.0066*cos(35*t+4.2*theta)+.0038*sin(55*t-3*theta))
    folds += side_wrinkle * smooth(.43,.91,abs(side))*sin(pi*clamp((t-.06)/.53))**2
    x = side*(rx+folds) + belly
    y = cy - front*((f if front > 0 else b)+folds)
    return np.array((x, y, z))


def ring_parameter(points):
    lengths = np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1)
    return np.concatenate(([0.], np.cumsum(lengths)))


def sleeve_geometry(v, f, uv, boundary, sign):
    rim = np.array([v[i] for i in boundary])
    center = rim.mean(axis=0)
    wrist = (sign*(.124 if sign < 0 else .101), -.500 if sign < 0 else -.478,
             1.282 if sign < 0 else 1.284)
    path = [center, center + [sign*.043, -.017, .005],
            [sign*(.215 if sign < 0 else .226), -.147, 1.310 + (.012 if sign < 0 else -.008)],
            [sign*(.194 if sign < 0 else .198), -.232, 1.259 + (.009 if sign < 0 else -.005)],
            [sign*(.166 if sign < 0 else .150), -.338, 1.267 + (.006 if sign < 0 else .001)],
            [sign*(.145 if sign < 0 else .124), -.418, 1.267 + (.002 if sign < 0 else 0)], wrist]
    n = 71
    path = spline(path, n)
    across, inward = normals_for_path(path, (0, 0, 1))
    angle = np.arctan2((rim-center) @ inward[0], (rim-center) @ across[0])
    station = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    count = len(boundary)

    monotonic = np.abs(np.diff(np.unwrap(np.r_[angle, angle[0]])))
    u = np.r_[0,np.cumsum(monotonic)] * .060 / (STITCH*TILE)
    prior = list(boundary)
    for row in range(1, n):
        t = row/(n-1)
        radius = np.interp(t, [0, .17, .35, .56, .70, .84, .94, 1],
                           [.059, .066, .069, .062, .054, .046, .035, .0227])
        transition = smooth(0, .24, t)
        folds = (.0028*np.cos(angle*6 + t*15) + .0015*np.sin(angle*11 - t*8))
        folds *= .7 + .3*np.sin(t*pi)
        # Folds compact on the inner elbow and gather at the cuff.
        elbow = np.exp(-((t-.47)/.15)**2)
        cuff = np.exp(-((t-.89)/.12)**2)
        folds += elbow*(.0048*np.cos(t*52 + angle*2.2)+.0020*np.sin(t*100+angle*4.3))*(.65-.35*np.sin(angle))
        folds += cuff*(.0036*np.sin(t*59 + 2.4*angle)+.0023*np.cos(t*113 - 1.3*angle))
        radial = (np.cos(angle)[:, None]*across[row]*.98 + np.sin(angle)[:, None]*inward[row]*1.035)
        from_rim = rim - center
        ring = path[row] + mix(from_rim, radial*(radius+folds)[:, None], transition)
        ids = list(range(len(v), len(v)+count))
        v.extend(ring)
        a, b = station[row-1:row+1]/(ROW*TILE)
        for j in range(count):
            k = (j+1) % count
            f.append((prior[j], prior[k], ids[k], ids[j]))
            uv.append(((u[j],a), (u[j+1],a), (u[j+1],b), (u[j],b)))
        prior = ids
    return path[-1], (path[-1] - path[-2]) / np.linalg.norm(path[-1] - path[-2]), across[-1], inward[-1]


def sweater(layer, face):
    tile = knit_tile()
    body_mat = wool("Pullover • dusty rose stockinette", tile)
    rib_mat = wool("Pullover • rib-knit bands", tile, True)
    inside, _ = material("Pullover • inside and seam allowances", (.302, .121, .131), .89)
    steps, rows = 128, 59
    v, f, uv = [], [], []
    j0, j1 = 37, 53
    half = 13
    for j in range(rows):
        for i in range(steps):
            v.append(torso(i*TAU/steps, j/(rows-1)))
    u = ring_parameter(np.array([torso(i*TAU/steps, .68) for i in range(steps)]))/(STITCH*TILE)
    meridian = np.array([torso(pi/3, j/(rows-1)) for j in range(rows)])
    along = np.r_[0, np.cumsum(np.linalg.norm(np.diff(meridian,axis=0),axis=1))]/(ROW*TILE)
    for j in range(rows-1):
        index = j*steps
        a, b = along[j:j+2]
        for i in range(steps):
            if j0 <= j < j1 and any(c-half <= i < c+half for c in (steps//4, 3*steps//4)):
                continue
            k = (i+1) % steps
            f.append((index+i, index+k, index+steps+k, index+steps+i))
            uv.append(((u[i],a), (u[i+1],a), (u[i+1],b), (u[i],b)))
    cuffs = []
    for sign, index in [(1, steps//4), (-1, 3*steps//4)]:
        a, b = index-half, index+half
        hole = [j0*steps+i for i in range(a, b)]
        hole += [j*steps+b for j in range(j0, j1)]
        hole += [j1*steps+i for i in range(b, a, -1)]
        hole += [j*steps+a for j in range(j1, j0, -1)]
        cuffs.append((sign, sleeve_geometry(v, f, uv, hole, sign)))
    garment = mesh("Pullover • joined torso and forward sleeves", v, f, layer, body_mat, uv)
    garment.data.materials.append(inside)
    orient(garment)
    # Remove vertices in the excised armholes and relax the attached panels locally.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(garment.data)
    bmesh.ops.delete(bm, geom=[vert for vert in bm.verts if not vert.link_faces], context="VERTS")
    for _ in range(3):
        relax = [vert for vert in bm.verts if abs(vert.co.x) > .139 and
                 -.121 < vert.co.y < .038 and 1.248 < vert.co.z < 1.395]
        bmesh.ops.smooth_vert(bm, verts=relax, factor=.58, use_axis_x=True,
                            use_axis_y=True, use_axis_z=True)
    bm.to_mesh(garment.data)
    bm.free()
    subdiv(garment, 1, 1)
    solidify(garment, .0033, 1)
    garment["Pattern"] = "Continuous body and sleeve topology, distance-mapped stitch UVs"
    neckline(layer, rib_mat, inside)
    hem(layer, rib_mat, inside)
    for sign, pose in cuffs:
        cuff(layer, rib_mat, inside, sign, *pose)
    hands(cuffs, layer, face.skin)
    return garment


def band_mesh(name, layer, mat, inner, rows, ribs, sample, length, height):
    n = ribs*7
    vertices = [sample(i*TAU/n, j/(rows-1), .5+.5*cos(i*TAU/7))
                for j in range(rows) for i in range(n)]
    faces = []
    loop_uv = []
    for j in range(rows-1):
        for i in range(n):
            k = (i+1) % n
            a, b = length/(STITCH*TILE)*i/n, length/(STITCH*TILE)*(i+1)/n
            lo, hi = height/(ROW*TILE)*j/(rows-1), height/(ROW*TILE)*(j+1)/(rows-1)
            q = j*n
            faces.append((q+i, q+k, q+n+k, q+n+i))
            loop_uv.append(((a,lo),(b,lo),(b,hi),(a,hi)))
    ob = mesh(name, vertices, faces, layer, mat, loop_uv)
    orient(ob)
    ob.data.materials.append(inner)
    solidify(ob, .003, 1)
    return ob


def neckline(layer, mat, inner):
    def sample(angle, t, rib):
        front = cos(angle)
        radial = np.array((sin(angle), -front, 0))
        outer = torso(angle, .996) + radial*.0010
        top_z = outer[2] + .0099 - .0033*max(-front,0)
        cx, cy, width, front_depth, back_depth = neck_profile(top_z)
        depth = (front_depth if front > 0 else back_depth)-.0052
        endpoint = np.array((cx+(width-.0056)*radial[0], cy-front*depth, top_z))
        p = mix(outer, endpoint, t) + radial*.0029*sin(pi*t)
        p[2] += .0024*sin(pi*t)
        p += radial*(.0011*rib*sin(pi*clamp(.03+.92*t)))
        p[2] += .00060*(rib-.5)
        return p
    return band_mesh("Pullover • rolled ribbed crew neck", layer, mat, inner, 19, 85, sample, .355, .025)


def hem(layer, mat, inner):
    def sample(theta, t, rib):
        p = torso(theta, .071*t)
        r = .0017 + .00134*rib*sin(pi*(.15+.76*t))
        p += np.array((sin(theta)*r, -cos(theta)*r, -.0021*(1-t)))
        return p
    band_mesh("Pullover • ribbed lower hem", layer, mat, inner, 13, 132, sample, .738, .031)
    # The interior fabric closes the presentation waist slice.
    vertices = [torso(i*TAU/128, 0) + (0, 0, .0022) for i in range(128)]
    vertices = [(x*.984, (y+.041)*.98-.041, z) for x, y, z in vertices]
    ob = mesh("Pullover • tucked fabric at waist", vertices, [tuple(range(127,-1,-1))], layer, inner)
    return ob


def cuff(layer, mat, inner, sign, center, tangent, top, side):
    def sample(theta, t, rib):
        radius = .0409-.0188*t+.00110*rib + .00063*cos(5*theta - 1.7*t)
        p = center + tangent*(.0325*(t-1)+.0011)
        return p + radius*(cos(theta)*top*.98 + sin(theta)*side*1.035)
    band_mesh("Pullover • rib cuff." + ("L" if sign > 0 else "R"),
              layer, mat, inner, 15, 60, sample, .252, .033)


def hands(cuffs, layer, skin):
    vertices, faces = obj_input(ROOT / "input/base.obj", "body", source=True)
    for sign, (wrist, direction, top, _) in cuffs:
        pivot = Vector((sign*.431185, -.175655, 1.061981))
        prior = (pivot - Vector((sign*.31294, -.01320, 1.16612))).normalized()
        target = Vector(direction)
        rotation = Quaternion(target, sign*.25) @ prior.rotation_difference(target)
        wrist_center = Vector(wrist) - target*.0015 + Vector(top)*.0025
        chosen = [face for face in faces if all(sign*vertices[i][0] > .36 and
                                               (Vector(vertices[i])-pivot).dot(prior) > -.025
                                               for i in face)]
        rest, polygons = submesh(vertices, chosen)
        posed = [wrist_center + rotation @ ((Vector(co)-pivot)*.83) for co in rest]
        hand = mesh("Hand." + ("L" if sign > 0 else "R") + " • relaxed reach", posed, polygons, layer, skin)
        add_pigment(hand, [(0., .14+.22*smooth(.035, .12, (Vector(r)-pivot).dot(prior)), 0.) for r in rest])
        subdiv(hand, 1, 2)
