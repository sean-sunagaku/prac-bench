"""Beauty camera, practical cafe set, softboxes and turntable cameras."""
from math import cos, pi, sin

import bpy
import numpy as np
from mathutils import Vector

from portrait_core import (TAU, collection, material, mesh, setup_node, sphere, subdiv, wire)

BEAUTY_POSITION = (-.042, -.710, 1.551)
BEAUTY_TARGET = (-.056, -.121, 1.414)
BEAUTY_CAMERA = "Beauty • cafe selfie"


def use_collection(obj, layer):
    layer.objects.link(obj)
    for c in list(obj.users_collection):
        if c != layer:
            c.objects.unlink(obj)


def box(name, center, size, layer, mat, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    for vertex in obj.data.vertices:
        for i in range(3):
            vertex.co[i] *= size[i]
    use_collection(obj, layer)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Rounded edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
    return obj


def lathe(name, center, profile, layer, mat, n=64):
    points, faces = [], []
    for radius, h in profile:
        for i in range(n):
            a = i*TAU/n
            points.append((center[0]+radius*cos(a), center[1]+radius*sin(a), center[2]+h))
    for j in range(len(profile)-1):
        for i in range(n):
            a, b = j*n+i, j*n+(i+1)%n
            faces.append((a, b, b+n, a+n))
    return mesh(name, points, faces, layer, mat)


def branch(name, points, radii, layer, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 10
    curve.bevel_resolution = 2
    curve.bevel_depth = 1
    spl = curve.splines.new("BEZIER")
    spl.bezier_points.add(len(points)-1)
    for b,p,r in zip(spl.bezier_points,points,radii):
        b.co = p
        b.radius = r
        b.handle_left_type, b.handle_right_type = "AUTO", "AUTO"
    obj = bpy.data.objects.new(name,curve)
    layer.objects.link(obj)
    curve.materials.append(mat)
    return obj


def wood():
    mat, p = material("Cafe • oiled honey ash", (.40,.213,.085), .42)
    coord = setup_node(mat, "ShaderNodeTexCoord", "Timber coordinates", (-850,120))
    vec = setup_node(mat, "ShaderNodeVectorMath", "Stretch grain lengthwise", (-670,120))
    vec.operation = "MULTIPLY"
    vec.inputs[1].default_value = (2.7,139,83)
    wire(mat, coord, "Object", vec, 0)
    noise = setup_node(mat, "ShaderNodeTexNoise", "Natural long grain", (-465,120))
    noise.inputs["Scale"].default_value = 1
    noise.inputs["Detail"].default_value = 4
    wire(mat, vec, "Vector", noise, "Vector")
    ramp = setup_node(mat, "ShaderNodeValToRGB", "Amber, tan and latewood", (-230,160))
    ramp.color_ramp.elements[0].color = (.171,.071,.027,1)
    ramp.color_ramp.elements[1].color = (.606,.363,.153,1)
    wire(mat,noise,"Fac",ramp,"Fac")
    wire(mat,ramp,"Color",p,"Base Color")
    bump = setup_node(mat, "ShaderNodeBump", "Sanded wood grain", (-180,-140))
    bump.inputs["Strength"].default_value = .19
    bump.inputs["Distance"].default_value = .0009
    wire(mat,noise,"Fac",bump,"Height")
    wire(mat,bump,"Normal",p,"Normal")
    return mat


def cafe(layer):
    rng = np.random.default_rng(423)
    oak = wood()
    plaster, _ = material("Cafe • warm limestone plaster", (.59,.464,.342), .83)
    shelf_wall, _ = material("Cafe • soft mushroom cabinet paint", (.248,.168,.114), .79)
    dark, _ = material("Cafe • dark bronze window mullions", (.073,.057,.038), .31)
    ceramic, c = material("Cafe • warm ivory stoneware", (.72,.68,.56), .31)
    c.inputs["Coat Weight"].default_value = .31
    cups = [ceramic, material("Cafe • sage glazing", (.252,.335,.235), .29)[0],
            material("Cafe • brown glass jars", (.115,.054,.021), .23)[0],
            material("Cafe • charcoal stoneware", (.066,.062,.054), .33)[0]]
    bright, p = material("Cafe • white sky through window", (.76,.83,.86), .85)
    p.inputs["Emission Color"].default_value = (.77,.87,.94,1)
    p.inputs["Emission Strength"].default_value = 1.6
    box("Cafe • wall", (.79,1.13,1.55), (1.55,.045,1.61),layer,plaster)
    window = box("Cafe • tall daylight opening", (-.73,1.13,1.58), (1.38,.038,1.91),layer,bright,.001)
    window.visible_diffuse = window.visible_glossy = window.visible_shadow = False
    for x in (-1.34,-.89,-.47,-.031):
        box("Cafe • vertical window frame", (x,1.083,1.62), (.026,.044,1.8),layer,dark,.003)
    for z in (1.06,1.63,2.18):
        box("Cafe • horizontal window rail", (-.73,1.066,z), (1.37,.042,.024),layer,dark,.003)
    box("Cafe • window sill", (-.718,1.032,1.061), (1.40,.126,.036),layer,oak,.004)
    box("Cafe • counter front", (.67,.953,1.017), (1.45,.26,.57),layer,shelf_wall,.010)
    for x in np.arange(-.05,1.43,.058):
        box("Cafe • fluted counter slat", (x,.816,1.016), (.047,.027,.547),layer,oak,.007)
    box("Cafe • counter worktop", (.70,.897,1.323), (1.56,.42,.052),layer,oak,.009)
    for z in (1.576,1.804,2.023):
        box("Cafe • floating ash shelf", (.60,1.025,z), (1.25,.211,.033),layer,oak,.005)
        for i in range(11):
            x = (i/10)*1.13+.008+rng.uniform(-.022,.021)
            y = rng.uniform(.962,1.035)
            height = rng.uniform(.062,.125)
            r = rng.uniform(.025,.049)
            prof = [(0,0),(r*.73,0),(r*.89,.008),(r,height*.92),(r*.95,height),
                    (r*.78,height),(r*.75,height*.87),(r*.63,.015),(0,.015)]
            lathe("Cafe • shelf cup and canister", (x,y,z+.016),prof,layer,cups[rng.integers(0,4)],36)
    # Chair rails behind the sitter and the right-hand side table.
    for x in (-.565,-.326):
        rail = box("Cafe • chair post", (x,.36,1.055), (.035,.049,.681),layer,oak,.012)
        rail.rotation_euler.x = -.11
    rail = box("Cafe • curved chair crest", (-.45,.38,1.328), (.305,.044,.087),layer,oak,.014)
    rail.rotation_euler.y = -.10
    box("Cafe • chair lower rail", (-.45,.379,1.201), (.306,.042,.032),layer,oak,.009)
    box("Cafe • midground ash table", (.521,.380,1.227), (.75,.55,.036),layer,oak,.013)
    for x in (.229,.798):
        box("Cafe • table leg", (x,.48,.962), (.042,.044,.458),layer,oak,.006)
    table = box("Cafe • table at lower image edge", (.115,-.441,1.136), (.88,.548,.043),layer,oak,.012)
    table.rotation_euler.z = .24
    plant(layer, ceramic, rng)
    flowers(layer, rng)


def flowers(layer, rng):
    glass, g = material("Cafe • pale olive vase", (.373,.439,.306), .29)
    g.inputs["Transmission Weight"].default_value = .47
    petal, _ = material("Cafe • ivory flowers", (.811,.763,.590), .72)
    yellow, _ = material("Cafe • pollen", (.655,.455,.067), .81)
    stems, _ = material("Cafe • flower stems", (.093,.161,.057), .63)
    center = (.333,.378,1.245)
    lathe("Cafe • vase at window table", center,
          [(0,0),(.025,0),(.032,.006),(.038,.029),(.036,.078),(.020,.125),
           (.018,.158),(.023,.159),(.023,.166),(.014,.166),(.013,.108),
           (.021,.052),(.020,.013),(0,.013)],layer,glass)
    for i in range(16):
        a = rng.uniform(0,TAU)
        spread = rng.uniform(.034,.108)
        top = np.array([center[0]+spread*cos(a), center[1]+spread*sin(a),
                        center[2]+rng.uniform(.210,.341)])
        s = .006 + rng.uniform(.0,.004)
        branch("Cafe • bud stem", [(center[0],center[1],center[2]+.050),
                                  (center[0]+.010*cos(a),center[1]+.010*sin(a),center[2]+.153),
                                  top], (.0017,.0011,.0006),layer,stems)
        sphere("Cafe • pollen centers", top, (.58*s,.58*s,.43*s),layer,yellow,12,8)
        for j in range(5):
            phase = j*TAU/5
            pet = top+np.array([s*cos(phase),s*sin(phase),.0025])
            sphere("Cafe • petal",pet,(.88*s,.82*s,.42*s),layer,petal,12,8)


def plant(layer, ceramic, rng):
    green = [material("Cafe • leaf / " + str(i), (.086+.018*i,.144+.033*i,.035+.009*i), .64)[0] for i in range(4)]
    pot = [(.0,.0),(.091,.0),(.101,.005),(.113,.117),(.117,.121),(.113,.126),(.105,.126),
           (.101,.117),(.094,.019),(.0,.019)]
    lathe("Cafe • earthenware planter",(-.517,.692,1.111),pot,layer,ceramic)
    soil, _ = material("Cafe • potting soil", (.049,.031,.014), .94)
    lathe("Cafe • soil",(-.517,.692,1.219),[(.0,0),(.106,0),(.106,.005),(.0,.005)],layer,soil)
    stems, _ = material("Cafe • olive stems", (.123,.090,.039), .73)
    for i in range(9):
        x0, y0 = -.517+rng.uniform(-.047,.047), .692+rng.uniform(-.035,.035)
        reach, angle = rng.uniform(.20,.34), rng.uniform(0,TAU)
        h = rng.uniform(.42,.92)
        pts = np.array([(x0,y0,1.22), (x0+.2*reach*cos(angle),y0+.18*reach*sin(angle),1.22+.49*h),
               (x0+reach*cos(angle),y0+reach*sin(angle),1.22+h)])
        branch("Cafe • plant stems",pts,(.009,.005,.0018),layer,stems)
        for j in range(7):
            t = .25+.73*j/6
            a = (pts[0]*(1-t)**2+2*pts[1]*(1-t)*t+pts[2]*t*t)
            for s in (-1,1):
                phase = angle+s*rng.uniform(.32,2.19)
                x, y = cos(phase), sin(phase)
                scale = rng.uniform(.045,.111)
                d = np.array((x,y,rng.uniform(.03,.54)))*scale
                w = np.array((-y,x,.17*s))*scale*rng.uniform(.30,.49)
                vertices = []
                for q in range(7):
                    v = q/6
                    mid = a + d*v
                    mid[2] += .019*sin(pi*v)
                    for k in range(3):
                        vertices.append(mid + (k-1)*w*(.08+.92*sin(pi*v)**.78)
                                        + (0,0,-.008*abs(k-1)*sin(pi*v)))
                faces = [(3*q+k,3*q+k+1,3*q+k+4,3*q+k+3) for q in range(6) for k in range(2)]
                leaf = mesh("Cafe • oval leaves",vertices,faces,layer,green[rng.integers(0,4)])
                subdiv(leaf,0,1)


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


def camera(name, position, target, layer, lens=None, scale=None):
    cam = bpy.data.cameras.new(name)
    ob = bpy.data.objects.new(name,cam)
    layer.objects.link(ob)
    ob.location = position
    aim(ob,target)
    cam.clip_start = .025
    cam.sensor_fit = "HORIZONTAL"
    if scale is None:
        cam.lens = lens
    else:
        cam.type = "ORTHO"
        cam.ortho_scale = scale
    return ob


def area(name, pos, target, watts, sizes, color, layer):
    lamp = bpy.data.lights.new(name,"AREA")
    lamp.energy = watts
    lamp.shape = "RECTANGLE"
    lamp.size, lamp.size_y = sizes
    lamp.color = color
    ob = bpy.data.objects.new(name,lamp)
    layer.objects.link(ob)
    ob.location = pos
    aim(ob,target)
    return ob


def setup_stage():
    scene = bpy.context.scene
    cams = collection("20 • Cameras")
    stage = collection("30 • Cafe set")
    beauty_lights = collection("31 • Cafe lighting")
    studio = collection("40 • Diagnostic backdrop")
    studio_lights = collection("41 • Diagnostic lighting")
    cafe(stage)
    bg, _ = material("Studio • muted warm gray", (.219,.201,.190), .84)
    box("Studio • seamless sweep floor", (0,0,.953), (200,200,.018),studio,bg,.0)
    studio.hide_render = studio_lights.hide_render = True

    beauty = camera(BEAUTY_CAMERA, BEAUTY_POSITION, BEAUTY_TARGET, cams, lens=44.0)
    focus = bpy.data.objects.new("Focus • near eye plane",None)
    cams.objects.link(focus)
    focus.location = (-.063,-.145,1.523)
    focus.empty_display_size = .014
    beauty.data.dof.use_dof = True
    beauty.data.dof.focus_object = focus
    beauty.data.dof.aperture_fstop = 4.0
    beauty.data.dof.aperture_blades = 8
    scene.camera = beauty
    origin = (0,-.237,1.360)
    for name, degree in [("front",0),("three-quarter",45),("side",90),("back",180)]:
        a = degree*pi/180
        position = (origin[0]+2.3*sin(a),origin[1]-2.3*cos(a),origin[2]+.118)
        camera("Turntable • "+name,position,origin,cams,scale=.829)

    target = (-.03,-.082,1.475)
    area("Cafe • broad window key", (-.560,-.471,1.965),target,49,(.51,.71),(.99,.943,.869),beauty_lights)
    area("Cafe • reflected frontal fill", (.472,-.579,1.694),target,20,(.81,.67),(.881,.930,1),beauty_lights)
    area("Cafe • warm shoulder rim", (-.316,.515,1.982),target,17,(.70,.81),(1,.879,.744),beauty_lights)
    area("Cafe • overhead bounce", (-.26,.096,2.146),(-.03,-.052,1.31),12,(.98,.72),(1,.924,.808),beauty_lights)
    area("Cafe • light on interior", (-.72,.22,1.917),(.29,1.103,1.52),36,(.75,1.17),(1,.929,.815),beauty_lights)
    area("Studio • front key", (-.88,-1.04,2.32),(0,-.13,1.39),91,(1.28,1.36),(1,.956,.905),studio_lights)
    area("Studio • face fill", (.99,-.66,1.71),(0,-.16,1.39),47,(1.05,.97),(.900,.949,1),studio_lights)
    area("Studio • back softbox", (.38,.88,2.16),(0,-.04,1.39),89,(1.40,1.08),(1,.900,.802),studio_lights)
    area("Studio • edge fill", (-.87,.62,1.71),(0,-.04,1.39),32,(.82,.94),(.930,.962,1),studio_lights)
