"""A fitted scalp, gravity-set silhouette volumes, and native strand grooming."""
from math import acos, asin, atan2, cos, exp, pi, sin

import numpy as np

from portrait_core import (TAU, clamp, head_pose, material, mesh, native_curves, normals_for_path,
                           pose_path, setup_node, smooth, spline, wire)

PART = -.235


def hair_materials():
    mass, p = material("Chestnut • body of the locks", (.037, .012, .007), .49)
    p.location = (610, 210)
    mass.node_tree.nodes.get("Material Output").location = (870, 210)
    p.inputs["IOR"].default_value = 1.53
    p.inputs["Specular IOR Level"].default_value = .066
    p.inputs["Specular Tint"].default_value = (.79, .55, .40, 1)
    p.inputs["Anisotropic"].default_value = .37
    p.inputs["Anisotropic Rotation"].default_value = .25
    p.inputs["Coat Weight"].default_value = .008
    p.inputs["Coat Roughness"].default_value = .34
    tex = setup_node(mass, "ShaderNodeTexCoord", "Along-strand UVs", (-920, 180))
    stretch = setup_node(mass, "ShaderNodeVectorMath", "Longitudinal grain", (-725, 180))
    stretch.operation = "MULTIPLY"
    stretch.inputs[1].default_value = (156, 4.5, 1)
    wire(mass, tex, "UV", stretch, 0)
    streak = setup_node(mass, "ShaderNodeTexNoise", "Uneven ribbons of chestnut", (-520, 180))
    streak.inputs["Scale"].default_value = 1.0
    streak.inputs["Detail"].default_value = 4.0
    streak.inputs["Roughness"].default_value = .756
    wire(mass, stretch, "Vector", streak, "Vector")
    ramp = setup_node(mass, "ShaderNodeValToRGB", "Dark roots to copper-brown glints", (-285, 180))
    ramp.color_ramp.elements[0].position = .23
    ramp.color_ramp.elements[0].color = (.008, .0026, .0017, 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (.043, .0144, .0077, 1)
    wire(mass, streak, "Fac", ramp, "Fac")
    wire(mass, ramp, "Color", p, "Base Color")
    bump = setup_node(mass, "ShaderNodeBump", "Fine longitudinal breakup", (100, -80))
    bump.inputs["Strength"].default_value = .29
    bump.inputs["Distance"].default_value = .00017
    wire(mass, streak, "Fac", bump, "Height")
    wire(mass, bump, "Normal", p, "Normal")
    tangent = setup_node(mass, "ShaderNodeTangent", "Silk reflection direction", (335, -210))
    tangent.direction_type = "UV_MAP"
    tangent.uv_map = "Pattern"
    wire(mass, tangent, "Tangent", p, "Tangent")

    strand, _ = material("Chestnut • strand scattering", (.10, .041, .024), .39)
    n = strand.node_tree.nodes
    n.remove(n.get("Principled BSDF"))
    hair = setup_node(strand, "ShaderNodeBsdfHairPrincipled", "Cylindrical fiber scattering", (-10, 120))
    hair.parametrization = "MELANIN"
    hair.inputs["Melanin"].default_value = .71
    hair.inputs["Melanin Redness"].default_value = .42
    hair.inputs["Tint"].default_value = (.42, .28, .205, 1)
    hair.inputs["Random Color"].default_value = .29
    hair.inputs["Roughness"].default_value = .41
    hair.inputs["Radial Roughness"].default_value = .44
    hair.inputs["Coat"].default_value = .00
    hair.inputs["IOR"].default_value = 1.53
    hair.inputs["Random Roughness"].default_value = .24
    fiber = setup_node(strand, "ShaderNodeHairInfo", "Roots, lengths and tips", (-600,210))
    gradient = setup_node(strand, "ShaderNodeMapRange", "Chestnut tips and darker roots", (-320,220))
    gradient.inputs["From Min"].default_value = .08
    gradient.inputs["From Max"].default_value = .95
    gradient.inputs["To Min"].default_value = .89
    gradient.inputs["To Max"].default_value = .61
    wire(strand, fiber, "Intercept", gradient, "Value")
    wire(strand, gradient, "Result", hair, "Melanin")
    wire(strand, hair, "BSDF", n.get("Material Output"), "Surface")
    return mass, strand


def crown_lift(alpha, beta):
    part = PART + .045*sin(2.1*beta+1.4)
    loft = .0093 + .0048*max(0, sin(beta))*cos(alpha)**2
    valley = .0018*exp(-((alpha-part)/.083)**2)
    return loft - valley + .0012*sin(alpha*8 + beta*4.5)


def hairline(phase):
    front = cos(phase)
    length = .973 + .46*(1-front) + .22*smooth(.10,-.92,front)
    return length + .022*sin(phase*5+1.7)+.014*sin(phase*11+.27)


def cap_lift(alpha, beta):
    polar = acos(clamp(cos(alpha)*sin(beta),-1,1))
    phase = atan2(sin(alpha),cos(alpha)*cos(beta))
    limit = hairline(phase)
    return crown_lift(alpha,beta)*(.37+.63*(1-smooth(limit*.81,limit+.013,polar)))


def scalp_shell(face, layer, mat):
    verts, faces, face_uv = [], [], []
    steps, n = 160, 50
    for row in range(n):
        for j in range(steps):
            phase = j*TAU/steps
            polar = .011 + hairline(phase) * (row/(n-1))**.96
            dx, dy, dz = sin(polar)*sin(phase), -sin(polar)*cos(phase), cos(polar)
            a, b = asin(dx), atan2(dz, -dy)
            if b < 0:
                b += TAU
            radius = cap_lift(a,b)
            verts.append(head_pose(face.scalp(a,b,radius)))
    faces.append(tuple(range(steps-1,-1,-1)))
    face_uv.append(tuple((i/steps, 0) for i in range(steps-1,-1,-1)))
    for i in range(n-1):
        for j in range(steps):
            k, start = (j+1) % steps, i*steps
            faces.append((start+j,start+k,start+steps+k,start+steps+j))
            face_uv.append(((j/steps,i/n),((j+1)/steps,i/n),((j+1)/steps,(i+1)/n),(j/steps,(i+1)/n)))
    cap = mat.copy()
    cap.name = "Chestnut • matte scalp under the crown"
    p = cap.node_tree.nodes.get("Principled BSDF")
    p.inputs["Specular IOR Level"].default_value = .023
    p.inputs["Coat Weight"].default_value = 0.0
    p.inputs["Roughness"].default_value = .58
    return mesh("Hair • fitted crown and nape underlayer", verts, faces, layer, cap, face_uv)


def crown_fibers(face, layer, shader, rng):
    paths, widths = [], []
    for sign in (-1,1):
        for i in range(2570):
            front_edge = i < 960
            b = rng.uniform(.515, .80) if front_edge else rng.uniform(.60, 2.64)
            root = PART+.045*sin(2.1*b+1.4)+rng.uniform(-.037,.038)
            outer = sign*rng.uniform(1.0,1.41)
            t = np.linspace(0,1,25)
            alpha = root + (outer-root)*t
            if front_edge:
                sweep = (.095 if sign > 0 else .045) + rng.uniform(-.051,.079)
                bend = .136+.10*cos(b*2)
            else:
                sweep = (.40 if sign > 0 else .15) + rng.uniform(-.15,.23)
                bend = .34+.10*cos(b*2)
            beta = b + sweep*t + bend*t**2
            beta += .012*sin(i)*np.sin(3*pi*t)
            tuft = rng.uniform(.0003,.0034) * np.sin(pi*t)**.55
            points = [face.scalp(a, b, cap_lift(a,b)*(.98 + .034*sin(t0*2.2)) + offset + .00055)
                      for a,b,offset,t0 in zip(alpha,beta,tuft,t)]
            paths.append(np.asarray([head_pose(p) for p in points]))
            widths.append(rng.uniform(.000047,.000098)*(.12+.88*np.sin(pi*(.12+.88*t))**.60))
    for i in range(1280):
        a = rng.uniform(-1.13, 1.12)
        root = rng.uniform(2.01, 2.62)
        t = np.linspace(0, 1, 24)
        end = rng.uniform(3.55, 4.22) - .50*abs(a)
        beta = root + (end-root)*t
        alpha = a + .07*np.sin(4.5*t+i) * t
        lift = rng.uniform(.0002,.0055)*np.sin(pi*t)**.60
        paths.append(np.asarray([head_pose(face.scalp(a,b,cap_lift(a,b)*(.97-.12*t0)+offset))
                                 for a,b,offset,t0 in zip(alpha,beta,lift,t)]))
        widths.append(rng.uniform(.000043,.000086)*(.17+.83*np.sin(pi*(.11+.89*t))**.60))
    native_curves("Hair • part, crown and nape strands", paths, widths, layer, shader)


class Locks:
    def __init__(self, rng):
        self.rng = rng
        self.vertices, self.faces, self.uv = [], [], []
        self.paths, self.widths = [], []

    def add(self, control, width, depth, strands, axis=(1,0,0)):
        """Build a tapered styling volume and draw curved fibers through its cross section."""
        rng = self.rng
        path = pose_path(spline(control, 60))
        b1, b2 = normals_for_path(path, axis)
        t = np.linspace(0, 1, len(path))
        shape = (.32+.68*np.sin(pi*(.15+.80*t))**.60)*np.maximum(.016,(1-t**3)**.74)
        shape *= (.69+.31*np.sin(pi*(.28+.72*t)))*np.interp(t,[0,.74,.92,1],[1,1,.71,.23])
        w = width*shape
        d = depth*shape
        start = len(self.vertices)
        segments = 14
        for j, (p,a,b) in enumerate(zip(path,b1,b2)):
            for i in range(segments):
                u = TAU*i/segments
                wa = 1+.045*cos(4*u+5*t[j])+.038*sin(7*u-1.9*t[j])
                self.vertices.append(p + a*w[j]*cos(u)*wa + b*d[j]*sin(u)*wa)
        for j in range(len(path)-1):
            for i in range(segments):
                a, b = i/segments, (i+1)/segments
                idx = start + j*segments
                k = (i+1) % segments
                self.faces.append((idx+i,idx+k,idx+segments+k,idx+segments+i))
                sa, sb = t[j], t[j+1]
                self.uv.append(((a,sa),(b,sa),(b,sb),(a,sb)))

        for i in range(strands):
            theta = rng.uniform(0,TAU)
            away = rng.uniform(.95,1.49) if i < .87*strands else rng.uniform(1.18,1.85)
            travel = rng.uniform(-.67,.72)
            phase = rng.uniform(0,TAU)
            start_t = rng.uniform(0,.23) if i > .82*strands else rng.uniform(0,.10)
            end_t = rng.uniform(.69,1)
            q = np.linspace(start_t,end_t,32)
            sample = lambda arr: np.column_stack([np.interp(q,t,arr[:,i]) for i in range(3)])
            radius1 = np.interp(q,t,w) * away
            radius2 = np.interp(q,t,d) * away
            angle = theta + travel*q + .10*np.sin(phase+q*8.3)
            rough = rng.uniform(.0010,.0070)*np.sin(pi*q)**1.21
            braid = (radius1*np.cos(angle) + rough*np.sin(phase+q*12.3))[:,None]
            wave = (radius2*np.sin(angle) + rough*.56*np.cos(phase+q*7.9))[:,None]
            self.paths.append(sample(path) + sample(b1)*braid + sample(b2)*wave)
            u = np.linspace(0,1,len(q))
            thick = rng.uniform(.000040,.000096)
            self.widths.append(thick*(1-.96*u**2.2)*(.67+.33*np.sin(pi*u)**.6))

    def finish(self, label, layer, mass, strands):
        if self.faces:
            mesh(label + " • styling volumes", self.vertices, self.faces, layer, mass, self.uv)
        if self.paths:
            native_curves(label + " • individual strands", self.paths, self.widths, layer, strands)


FRONT_LOCKS = [
    ([(-.041,-.123,1.632),(-.073,-.125,1.592),(-.085,-.130,1.540),
      (-.088,-.123,1.486),(-.152,-.129,1.413),(-.147,-.179,1.370),
      (-.108,-.180,1.294),(-.128,-.190,1.221),(-.124,-.189,1.158),
      (-.102,-.180,1.123)], .017,.011),
    ([(-.058,-.092,1.625),(-.086,-.107,1.579),(-.096,-.104,1.520),
      (-.088,-.116,1.470),(-.143,-.137,1.415),(-.133,-.186,1.365),
      (-.102,-.188,1.289),(-.115,-.204,1.211),(-.109,-.197,1.158),
      (-.084,-.182,1.119)], .020,.012),
    ([(-.064,-.085,1.616),(-.089,-.083,1.572),(-.096,-.079,1.517),
      (-.093,-.093,1.46),(-.114,-.114,1.408),(-.116,-.165,1.348),
      (-.087,-.180,1.284),(-.081,-.186,1.234),(-.091,-.192,1.167),
      (-.072,-.173,1.132)], .016,.012),
    ([(-.071,-.063,1.609),(-.088,-.064,1.553),(-.093,-.057,1.501),
      (-.111,-.073,1.449),(-.151,-.109,1.391),(-.150,-.143,1.332),
      (-.133,-.165,1.251),(-.152,-.159,1.184),(-.121,-.158,1.144)], .017,.013),
    ([(-.061,-.038,1.633),(-.087,-.038,1.575),(-.097,-.031,1.522),
      (-.102,-.039,1.465),(-.133,-.068,1.410),(-.159,-.103,1.369),
      (-.156,-.145,1.305),(-.141,-.157,1.231),(-.145,-.160,1.171)], .018,.013),
    ([(.041,-.099,1.643),(.077,-.079,1.595),(.090,-.038,1.559),
      (.091,-.002,1.515),(.101,-.039,1.467),(.114,-.072,1.402),
      (.142,-.100,1.356),(.173,-.091,1.331),(.187,-.076,1.344)], .015,.012),
    ([(.056,-.071,1.637),(.081,-.051,1.593),(.097,-.009,1.540),
      (.095,-.005,1.492),(.101,-.033,1.432),(.146,-.049,1.366),
      (.170,-.052,1.312),(.129,-.088,1.259),(.132,-.095,1.220)], .016,.010),
    ([(.067,-.047,1.629),(.087,-.026,1.587),(.092,-.009,1.528),
      (.096,-.003,1.483),(.110,-.016,1.416),(.158,-.028,1.352),
      (.162,-.059,1.297),(.116,-.079,1.220),(.123,-.076,1.181)], .018,.012),
    ([(.055,-.117,1.610),(.068,-.110,1.582),(.076,-.094,1.555),
      (.078,-.084,1.533),(.084,-.087,1.482),(.083,-.096,1.441),
      (.092,-.121,1.387),(.114,-.149,1.349),(.153,-.129,1.351)], .0051,.0046),
]


def long_hair(layer, mass, fiber, rng):
    back = Locks(rng)
    for j in range(15):
        x = (j-7)*.0092
        y = .018 + .023*(1-.75*(abs(x)/.073)**1.61)
        drift = sin(j*2.62)
        strand_end = 1.120+.041*abs(x/.064)+rng.uniform(-.028,.060)
        control = [(x*.58,.001+.003*drift,1.652-.017*abs(x/.075)),
                   (x*.91, y, 1.617-.01*abs(x/.08)),
                   (x*1.13,y+.023,1.560),
                   (x*1.25 + .008*drift, .072-.015*abs(x/.075), 1.497),
                   (x*1.40+.014*cos(x*37),.071+.007*drift,1.428),
                   (x*1.60-.017*sin(j*.3),.085+.012*drift,1.365),
                   (x*1.60+.019*cos(j*.36),.078+.013*drift,1.290),
                   (x*1.52-.016*sin(j*.55),.073+.009*drift,1.215),
                   (x*1.38+.014*sin(j*.60),.062+.011*drift,strand_end)]
        back.add(control, rng.uniform(.009,.022), rng.uniform(.007,.014), 230)
    for j in range(8):
        x = (j-3.5)*.017
        drift = sin(j*1.9)
        back.add([(x*.86,.024,1.622),(x,.043,1.575),(x*1.03,.044,1.516),
                  (x*1.11,.039+.004*drift,1.459),(x*1.30,.044,1.396),
                  (x*1.44+.009*drift,.068,1.319),(x*1.43,.078,1.247),
                  (x*1.37-.014*drift,.070,1.180+.012*drift)], .013,.0082,72)
    back.finish("Hair • long back waves", layer, mass, fiber)

    left, right = Locks(rng), Locks(rng)
    for j, (control, w, d) in enumerate(FRONT_LOCKS):
        locks = left if j < 5 else right
        locks.add(control,w,d,355)
        for k in range(3):
            q = np.array(control,dtype=float)
            bias = rng.uniform(-.017,.016)
            q[:,0] += bias * np.linspace(.22,1,len(q)) + rng.uniform(.002,.008)*np.sin(np.arange(len(q))*1.0 + k)
            q[:,1] += rng.uniform(-.007,.007)*np.linspace(.15,1,len(q)) + (.002 if k else -.004)
            q[-1,2] = min(q[-2,2]-.019, q[-1,2] + rng.uniform(-.012,.025)) if j<5 else q[-1,2]+rng.uniform(-.016,.019)
            locks.add(q,w*rng.uniform(.30,.59),d*.56,141)
    left.add([(-.070,-.112,1.580),(-.083,-.122,1.508),(-.136,-.126,1.431),
              (-.124,-.187,1.373),(-.082,-.199,1.306),(-.054,-.190,1.244),
              (-.068,-.212,1.190),(-.048,-.175,1.139)], .010,.0067,240)
    left.add([(-.076,-.134,1.567),(-.080,-.133,1.517),(-.120,-.147,1.431),
              (-.097,-.194,1.354),(-.064,-.199,1.292),(-.055,-.193,1.253),
              (-.078,-.205,1.208),(-.054,-.189,1.160)], .0076,.0053,175)
    left.finish("Hair • waves draped over the raised shoulder", layer, mass, fiber)
    right.finish("Hair • swept and tucked temple", layer, mass, fiber)


FRINGE = [
    [(-.040,1.639),(-.061,1.614),(-.071,1.585),(-.079,1.559),(-.079,1.529),(-.079,1.504)],
    [(-.037,1.637),(-.049,1.607),(-.054,1.581),(-.059,1.555),(-.067,1.530),(-.079,1.514)],
    [(-.032,1.642),(-.040,1.616),(-.045,1.593),(-.046,1.566),(-.049,1.548),(-.047,1.536)],
    [(-.029,1.641),(-.030,1.616),(-.029,1.594),(-.022,1.572),(-.011,1.559),(-.005,1.556)],
    [(-.025,1.644),(-.023,1.617),(-.015,1.591),(.001,1.572),(.013,1.563),(.027,1.559)],
    [(-.023,1.642),(-.010,1.616),(.002,1.598),(.017,1.575),(.035,1.563),(.046,1.563)],
    [(-.019,1.644),(-.003,1.624),(.014,1.600),(.023,1.586),(.040,1.572),(.058,1.562)],
    [(-.014,1.645),(.007,1.629),(.029,1.604),(.042,1.581),(.059,1.567),(.068,1.545)],
    [(-.010,1.647),(.016,1.630),(.041,1.613),(.060,1.587),(.071,1.564),(.079,1.541)],
    [(-.004,1.650),(.028,1.634),(.055,1.611),(.072,1.587),(.078,1.562),(.077,1.536)],
    [(-.034,1.637),(-.042,1.610),(-.039,1.585),(-.031,1.561),(-.022,1.546),(-.017,1.542)],
    [(-.030,1.642),(-.027,1.614),(-.019,1.590),(-.004,1.570),(.009,1.559),(.021,1.557)],
    [(-.013,1.638),(.008,1.617),(.027,1.596),(.046,1.579),(.065,1.566),(.074,1.548)],
]


def fringe(face, layer, fiber, rng):
    paths, widths, flyaways, fly_widths = [], [], [], []
    for j, control in enumerate(FRINGE):
        xz = np.array(control)
        length = np.linspace(0,1,len(control))
        for k in range(96 if j in (0, 1, 8, 9) else 62):
            xz2 = xz.copy()
            xz2[:,0] += rng.normal(0, .00325)*(.45+.55*length)
            xz2[:,1] += rng.normal(0, .0048)*length**.6 + rng.uniform(-.004,.004)
            if j < 2 or j > 7:
                xz2[:,0] += rng.uniform(-.004,.004)*length
            base = []
            sweep_depth = rng.uniform(.0029,.0088)
            for (x,z),t in zip(xz2,length):
                depth = face.front(x,z,default=-.091)
                if abs(x) > .073:
                    depth = min(depth,-.091)
                offset = .0095*(1-t)**2 + sweep_depth*(.80+ .27*sin(pi*t)) + rng.uniform(-.0017,.0017)
                base.append((x,depth-offset,z))
            p = spline(base,38)
            if k % 5 == 1:
                p = p[:rng.integers(25,36)]
            u = np.linspace(0,1,len(p))
            paths.append(pose_path(p))
            widths.append(rng.uniform(.000041,.000093)*(.74+.26*np.sin(pi*u))*(1-.98*u**3))
        for k in range(13):
            control2 = []
            offset = rng.uniform(.004,.009)
            for (x,z), t in zip(xz,length):
                x += rng.uniform(-.003,.003) + rng.uniform(-.017,.016)*t
                z += rng.uniform(-.006,.008)+.002*sin(4*t)
                control2.append((x, min(face.front(x,z,default=-.093),-.085)-offset-.005*sin(pi*t), z))
            p = spline(control2,29)
            flyaways.append(pose_path(p))
            fly_widths.append(rng.uniform(.000022,.000057)*(1-.95*np.linspace(0,1,len(p))**2.3))
    native_curves("Hair • translucent side-swept fringe", paths, widths, layer, fiber)
    native_curves("Hair • fine flyaways at the hairline", flyaways, fly_widths, layer, fiber)


def flyaway_crown(face, layer, mat, rng):
    paths, widths = [], []
    t = np.linspace(0,1,31)
    for _ in range(245):
        sign = -1 if rng.random() < .60 else 1
        beta = rng.uniform(.74,2.27)
        alpha = rng.uniform(-.45,.02) + sign*t*rng.uniform(.33,.97)
        b = beta+t*(rng.uniform(.06,.55))+.046*np.sin(pi*t)
        lift = rng.uniform(.0030,.0125)*np.sin(pi*t)**1.65+.00054
        p = [face.scalp(a,b,cap_lift(a,b)+h) for a,b,h in zip(alpha,b,lift)]
        paths.append(np.asarray([head_pose(q) for q in p]))
        widths.append(rng.uniform(.000020,.000046)*(.14+.86*np.sin(pi*(.08+.92*t))**.71))

    native_curves("Hair • fine strands lifted from the crown", paths, widths, layer, mat)


def hair(face, layer):
    rng = np.random.default_rng(442)
    mass, fiber = hair_materials()
    scalp_shell(face, layer, mass)
    crown_fibers(face, layer, fiber, rng)
    long_hair(layer, mass, fiber, rng)
    fringe(face, layer, fiber, rng)
    flyaway_crown(face, layer, fiber, rng)
