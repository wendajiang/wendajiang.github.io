// Index-only decorative scene: tree-dappled light on a wall, rendered as a
// two-tone ordered-dither shader on a single fullscreen quad (raw WebGL, no
// dependency). Lazily initialized when the reserved box scrolls into view.
//
// Model:
//  - one wind signal W(t): a slow ~20-30s gust envelope; cursor speed raises a
//    ceiling that W rides under.
//  - a tree of 4 layers (trunk -> thick -> thin -> leaves). Each reacts to W by
//    its own elasticity; displacement is CUMULATIVE down the tree.
//  - each layer has a `blur` (distance leaf->wall): near = sharp + dark shadow
//    (little dither), far = soft penumbra + faint shadow (heavily dithered).
//    The dither *is* the penumbra.
//
// Debug panel (FPS/wind charts + live sliders): Konami arrows
//   up up down down left right left right

const VERT = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const FRAG = `#extension GL_OES_standard_derivatives : enable
  precision highp float;
  #define MAXSEG 1024         // loop ceiling; actual count is uSegCount
  uniform sampler2D uSegTex; // L-system segments packed as RGBA8 (16-bit), 3 texels/seg
  uniform float uPosScale;   // decode: pos = raw * uPosScale - 1.0
  uniform float uWidScale;   // decode: width = raw * uWidScale
  uniform int uSegCount;     // number of live segments
  uniform vec2 uLeafGrad;    // canopy gradient dir in uv space (toward the origin sides)
  uniform float uLeafFall;   // ramp strength of leaf cover along the gradient
  uniform float uLeafFollow; // 0 = uniform leaf depth, 1 = leaf depth tracks branches
  uniform float uTrunkCount; // 0, 1, or 2 decorative trunks
  uniform vec2 uTrunkX;      // their x positions (uv space)
  uniform float uTrunkW;     // trunk half-width (uv space), seeded thin
  uniform float uTime;       // real seconds (slow canopy drift)
  uniform vec2 uDisp[4];     // per-layer cumulative sway displacement
  uniform vec2 uResolution;
  uniform vec3 uColorA;      // lit wall
  uniform vec3 uColorMid;    // glow (transition zones)
  uniform vec3 uColorB;      // shadow
  uniform float uContrast;
  uniform float uCenter;
  uniform float uGoldLo;
  uniform float uGoldHi;
  uniform float uCanopy;
  uniform vec4 uLayerOn;     // per-layer enable
  uniform vec4 uBlur;        // per-layer blur (distance): 0 sharp+dark -> 1 soft+faint
  uniform float uDither;     // 1 dithered, 0 hard
  uniform vec2 uSeed;        // random per-load offset into the noise field
  uniform float uParallax;   // -1..1 (mouse x / device tilt); shifts layers by depth
  uniform vec3 uFloor;       // per-layer floor top range (trunk, thick, thin); floor = blur^2 * top
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + 7.0; a *= 0.5; }
    return v;
  }
  // ridged noise -> thin filament ridges (branch-like)
  float ridged(vec2 p){ return 1.0 - abs(2.0 * noise(p) - 1.0); }
  float ridgedFbm(vec2 p){
    float v = 0.0, a = 0.6;
    for (int i = 0; i < 4; i++) { v += a * ridged(p); a *= 0.5; p = p * 1.97 + 3.3; }
    return v;
  }
  // unpack a 16-bit value stored across two RGBA8 channels ([0,1] each)
  float dec16(vec2 c){ return (c.x * 255.0 * 256.0 + c.y * 255.0) / 65535.0; }
  // shadow from the L-system branch segments (grown CPU-side, packed into a texture;
  // segments are tapered capsules in buv space, x: 0..aspect, y: 0..1). we also grab
  // the local limb radius at the nearest point so thin limbs dither.
  // returns (signed distance to nearest limb surface, that limb's depth). shared
  // by the branch shadow and the leaf layer so we only walk the segments once.
  vec2 branchField(vec2 buv){
    buv.x += uParallax * 0.04;
    buv += uDisp[1] * 0.5; // wind sway
    float d = 1e9;
    float nearDepth = 0.0;
    float rowScale = 1.0 / float(MAXSEG);
    for (int i = 0; i < MAXSEG; i++){
      if (i >= uSegCount) break;
      float row = (float(i) + 0.5) * rowScale;
      vec4 t0 = texture2D(uSegTex, vec2(0.5 / 4.0, row)); // x0,y0
      vec4 t1 = texture2D(uSegTex, vec2(1.5 / 4.0, row)); // x1,y1
      vec4 t2 = texture2D(uSegTex, vec2(2.5 / 4.0, row)); // w0,w1
      vec2 a = vec2(dec16(t0.rg), dec16(t0.ba)) * uPosScale - 1.0;
      vec2 bb = vec2(dec16(t1.rg), dec16(t1.ba)) * uPosScale - 1.0;
      vec2 pa = buv - a, ba = bb - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      float r = mix(dec16(t2.rg), dec16(t2.ba), h) * uWidScale;
      float dist = length(pa - ba * h) - r;
      if (dist < d) {
        d = dist;
        nearDepth = dec16(texture2D(uSegTex, vec2(3.5 / 4.0, row)).rg);
      }
    }
    return vec2(d, nearDepth);
  }
  // penumbra: the shadow darkens across a band whose half-width grows with the
  // caster's distance (depth). a thick limb is wider than the band, so its core
  // reaches full umbra while the edges lighten; a thin twig is narrower than the
  // band, so its penumbras overlap and it never fully darkens (dithers on its own).
  float branchShadow(float d, float nearDepth){
    float pen = 0.006 + nearDepth * 0.06;
    float shadow = 1.0 - smoothstep(-pen, pen, d); // 1 deep inside -> 0 outside
    float umbra = mix(0.03, 0.34, nearDepth); // far limbs' deepest shadow is fainter
    return mix(1.0, umbra, shadow);
  }
  // foliage: blobby noise. blur -> softer penumbra + fainter shadow. cover (0..1)
  // biases density: high near the scene's canopy origin, sparse in the open area.
  float leafLayer(vec2 buv, float scale, vec2 disp, float b, vec2 seed, float cover){
    buv.x += uParallax * (0.15 + b) * 0.1; // depth-based parallax (far layers shift more)
    vec2 p = buv * scale + disp + seed;
    float soft = 0.05 + b * 0.30;
    float floorT = b * 0.38;
    float thr = mix(0.85, 0.48, cover); // low cover -> high threshold -> few leaves
    float s = smoothstep(thr + soft, thr - soft, fbm(p));
    return mix(1.0, floorT, s);
  }
  // branches: domain-warped, anisotropic ridged noise read as wandering limbs.
  // higher thick -> thinner branches; blur -> softer + fainter shadow.
  float branchLayer(vec2 buv, float scale, vec2 disp, float thick, float b, vec2 seed, float topRange){
    buv.x += uParallax * (0.15 + b) * 0.1; // depth-based parallax
    vec2 p = buv * scale + disp + seed;
    p += (vec2(noise(p * 0.5 + 2.1), noise(p * 0.5 + 8.7)) - 0.5) * 0.8; // gentle wander, not swirly ribbons
    mat2 R = mat2(0.86, -0.51, 0.51, 0.86);
    float r = ridgedFbm(R * p * vec2(1.0, 0.35)); // anisotropy = longer, connected limbs
    float soft = 0.03 + b * 0.22;
    float s = smoothstep(thick, thick + soft, r); // 1 on the ridge (wood)
    float floorT = b * b * topRange; // shadow fades with distance^2 toward topRange
    return mix(1.0, floorT, s);
  }
  // decorative thick trunk(s): 0-2 near-vertical solid bands. count and x-positions
  // are decided CPU-side (uTrunkCount, uTrunkX) so they're rare and sit near the
  // scene's focus column. fixed-width, so they can't blow up into a slab. uv-space.
  float trunkLayer(vec2 uv, float thick, float b, float topRange){
    if (uTrunkCount < 0.5) return 1.0; // no trunk this scene
    float lean = (noise(vec2(uTrunkX.x * 41.0, uv.y * 0.6)) - 0.5) * 0.06; // gentle wobble
    float x = uv.x + lean + uParallax * 0.015;
    float halfw = uTrunkW; // seeded width (CPU-side, biased thin)
    float d = abs(x - uTrunkX.x);
    if (uTrunkCount > 1.5) d = min(d, abs(x - uTrunkX.y));
    float s = 1.0 - smoothstep(halfw, halfw + 0.02 + b * 0.1, d);
    float floorT = b * b * topRange;
    return mix(1.0, floorT, s);
  }
  float bayer4(vec2 c){
    int x = int(mod(c.x, 4.0));
    int y = int(mod(c.y, 4.0));
    int i = x + y * 4;
    float t = 5.0;
    if (i==0) t=0.0; else if (i==1) t=8.0; else if (i==2) t=2.0; else if (i==3) t=10.0;
    else if (i==4) t=12.0; else if (i==5) t=4.0; else if (i==6) t=14.0; else if (i==7) t=6.0;
    else if (i==8) t=3.0; else if (i==9) t=11.0; else if (i==10) t=1.0; else if (i==11) t=9.0;
    else if (i==12) t=15.0; else if (i==13) t=7.0; else if (i==14) t=13.0;
    return (t + 0.5) / 16.0;
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 buv = vec2(uv.x * aspect, uv.y);
    float t = uTime;

    // walk the L-system segments once; reuse the field for branches AND leaves
    vec2 bf = branchField(buv); // (signed dist, depth) of the nearest limb
    // rare decorative thick trunk(s), count/positions decided CPU-side
    float l0 = mix(1.0, trunkLayer(uv, 0.45, uBlur.x, uFloor.x), uLayerOn.x);
    float l1 = mix(1.0, branchShadow(bf.x, bf.y), uLayerOn.y);
    float l2 = 1.0;
    // leaf cover ramps along the scene gradient: dense on the branch-origin side(s),
    // sparse on the open side (uv-0.5 projected onto the gradient direction)
    float leafCover = clamp(0.55 + dot(uLeafGrad, uv - 0.5) * uLeafFall, 0.12, 1.0);
    // leaf depth follows the nearby branch (sitting just beyond the twigs) so foliage
    // softens/fades with the limbs it hangs from instead of being one flat plane
    float leafDepth = mix(uBlur.w, clamp(bf.y + 0.2, 0.0, 1.0), uLeafFollow);
    float l3 = mix(1.0, leafLayer(buv, 11.0, uDisp[3], leafDepth, uSeed + vec2(13.0, 89.0), leafCover), uLayerOn.w);

    float canopy = smoothstep(0.3, 0.7, fbm(buv * 0.4 + vec2(t * 0.01, 19.0) + uSeed + vec2(101.0, 57.0)));
    // multiplicative so opaque wood stays opaque (additive bias was lifting the
    // trunk into the dithered mid-tones); only modulates light that gets through
    float modulate = 1.0 + (canopy - 0.5) * uCanopy + (1.0 - uv.y) * 0.10 - uv.x * 0.05;

    float light = pow(l0 * l1 * l2 * l3, 0.6) * 1.3 * modulate;
    light = clamp((light - 0.5) * uContrast + uCenter, 0.0, 1.0);

    // 2-tone ordered dither; gold only where tone is mid AND it's an actual
    // light/dark edge (the penumbra rim), not flat interiors.
    float bayer = uDither > 0.5 ? bayer4(gl_FragCoord.xy) : 0.5;
    float bayerG = uDither > 0.5 ? bayer4(gl_FragCoord.xy + vec2(2.0, 1.0)) : 0.5;
    float lit = step(bayer, light);
    float goldMix = smoothstep(uGoldLo, uGoldHi, light) * smoothstep(0.015, 0.1, fwidth(light));
    float darkIsGold = step(bayerG, goldMix);
    vec3 dark = darkIsGold > 0.5 ? uColorMid : uColorB;
    vec3 col = lit > 0.5 ? uColorA : dark;
    gl_FragColor = vec4(col, 1.0);
  }
`

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h.slice(0, 6), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
function cssVar(name: string): [number, number, number] {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)
  return v && v.trim().startsWith("#") ? hexToRgb(v) : [0, 0, 0]
}
function cssNum(name: string, fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return isNaN(v) ? fallback : v
}
function rgbStr(name: string): string {
  return cssVar(name)
    .map((c) => Math.round(c * 255))
    .join(",")
}
function contentSize(el: HTMLElement): [number, number] {
  const cs = getComputedStyle(el)
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  return [Math.max(1, el.clientWidth - padX), Math.max(1, el.clientHeight - padY)]
}

function initScene(container: HTMLElement) {
  const canvas = document.createElement("canvas")
  canvas.className = "dappled-canvas"
  container.appendChild(canvas)
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
  if (!gl) {
    console.error("[dappled-light] no WebGL")
    return
  }
  gl.getExtension("OES_standard_derivatives") // for fwidth()

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      console.error("[dappled-light] shader:", gl.getShaderInfoLog(sh))
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error("[dappled-light] link:", gl.getProgramInfoLog(prog))
  gl.useProgram(prog)

  // fullscreen triangle
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(prog, "position")
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  const loc = (n: string) => gl.getUniformLocation(prog, n)
  const U = {
    uTime: loc("uTime"),
    uDisp: loc("uDisp[0]"),
    uResolution: loc("uResolution"),
    uColorA: loc("uColorA"),
    uColorMid: loc("uColorMid"),
    uColorB: loc("uColorB"),
    uContrast: loc("uContrast"),
    uCenter: loc("uCenter"),
    uGoldLo: loc("uGoldLo"),
    uGoldHi: loc("uGoldHi"),
    uCanopy: loc("uCanopy"),
    uLayerOn: loc("uLayerOn"),
    uBlur: loc("uBlur"),
    uDither: loc("uDither"),
    uSeed: loc("uSeed"),
    uParallax: loc("uParallax"),
    uFloor: loc("uFloor"),
    uSegTex: loc("uSegTex"),
    uPosScale: loc("uPosScale"),
    uWidScale: loc("uWidScale"),
    uSegCount: loc("uSegCount"),
    uLeafGrad: loc("uLeafGrad"),
    uLeafFall: loc("uLeafFall"),
    uLeafFollow: loc("uLeafFollow"),
    uTrunkCount: loc("uTrunkCount"),
    uTrunkX: loc("uTrunkX"),
    uTrunkW: loc("uTrunkW"),
  }
  // randomize the noise field per page load
  gl.uniform2f(U.uSeed, Math.random() * 1000, Math.random() * 1000)

  // tunable state (driven by the debug sliders)
  const u = {
    contrast: 1.6,
    center: cssNum("--komorebi-center", 0.38),
    goldLo: 0.45,
    goldHi: 0.7,
    canopy: 1.2,
    dither: 1,
    layerOn: [1, 1, 0, 1],
    blur: [0.0, 0.12, 0.35, 0.45], // trunk -> thick -> thin -> leaves
    floor: [0.1, 0.4, 0.7], // per-layer floor top range (trunk, thick, thin); floor = blur^2 * top
    sensitivity: 5,
    rest: 0.35,
    gustSpeed: 1,
  }

  // --- L-system branch generation (CPU side) --------------------------------
  // We grow a stochastic, bracketed L-system with a turtle and emit tapered
  // capsule segments (x0,y0,x1,y1,w0,w1) in buv space (x: 0..aspect, y: 0..1).
  // Branches curve slightly along their length (springiness) and thin per level.
  const MAXSEG = 1024
  const TEXW = 4 // RGBA8 texels per segment: (x0,y0)(x1,y1)(w0,w1)(depth), each 16-bit
  const WIDSCALE = 0.1 // width encode range
  const texData = new Uint8Array(TEXW * MAXSEG * 4)
  let segCount = 0
  let posScale = 12 // decode scale for positions (aspect + 2), set in buildSegments
  let leafGx = 0 // scene canopy gradient direction (uv space), set in buildSegments
  let leafGy = 1
  let trunkCount = 0 // 0-2 decorative trunks, set in buildSegments
  let trunkX0 = 0.5
  let trunkX1 = 0.5
  let trunkW = 0.018 // trunk half-width (uv), seeded thin in buildSegments
  const segTex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, segTex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  let treeSeed = Math.floor(Math.random() * 1e9)
  // live-tunable L-system knobs (exposed in the debug panel). pipe model: every
  // branch descends from a trunk, width is conserved at each split (so nothing
  // floats), segment length scales with thickness, recursion stops near 1px.
  const tree = {
    sceneType: -1, // -1 = random per seed; 0..4 = top / top+left / top+right / bot+right / bot+left
    trunkCount: -1, // -1 = random (avg ~0.8, rare); 0..2 forces the decorative trunk count
    leafBias: 1.4, // ramp strength of the canopy toward the origin side (0 = uniform)
    leafFollow: 0.6, // how strongly leaf depth tracks the nearby branch depth
    rootOffset: 0.9, // how far roots sit off-canvas (bigger = canopy fills the edge)
    nTrees: 6,
    trunkWidth: 0.035, // root bough radius (everything derives from this)
    lenRatio: 16, // segment length ~= lenRatio * current width (bigger = longer limbs)
    maxLen: 0.4, // cap so thick boughs curve over several segments
    curl: 0.3, // curl carried along a leader (springiness)
    split3: 0.3, // P(3 children) at a split, else 2
    forkProb: 0.7, // P a node forks (else the leader extends -> variable internodes)
    depthDrift: 0.4, // how much branches wander in depth as they fork (envelop the trunk)
    leader: 0.618, // leader's share of the conserved cross-section AREA (1/phi)
    golden: 1, // 0 = random sides, 1 = golden-angle phyllotaxis placement
    conserve: 0.95, // total child area / parent area (<= 1; the taper)
    endPx: 0.5, // stop when a limb is this many px thick (no floating stubs)
  }
  const mulberry32 = (a: number) => () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const buildSegments = () => {
    const aspect = bw / Math.max(bh, 1)
    const pxPerUnit = bh // 1 buv unit = bh px (isotropic, since buv.x is aspect-scaled)
    const rng = mulberry32(treeSeed)
    const segs: number[][] = []
    const minW = tree.endPx / (2 * pxPerUnit) // radius at which a limb is ~endPx px thick
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
    const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // golden angle ~137.5deg (phyllotaxis)
    const INVPHI = 2 / (1 + Math.sqrt(5)) // 1/phi ~0.618
    // depth random-walk: the tree is a 3D volume. the trunk holds a central depth;
    // branches drift toward/away from the wall as they fork, enveloping it.
    const drift = (depth: number, amt: number) => Math.min(0.98, Math.max(0.02, depth + (rng() - 0.5) * amt))

    // pipe model: grow a limb (length scales with width), then split, conserving
    // CROSS-SECTION AREA (da Vinci) across 2-3 children. a phyllotaxis "phase"
    // advances by the golden angle along each leader; side branches take their
    // left/right placement from cos(phase) (the in-plane projection of where they
    // sit around the stem) -> the golden-ratio spiral real trees use.
    const grow = (x: number, y: number, ang: number, width: number, curl: number, phase: number, depth: number) => {
      if (width < minW || segs.length >= MAXSEG) return
      const len = Math.min(width * tree.lenRatio, tree.maxLen) * (0.85 + rng() * 0.3)
      const a = ang + curl + (rng() - 0.5) * 0.05 // small jitter -> coherent direction
      const ex = x + Math.cos(a) * len
      const ey = y + Math.sin(a) * len
      const wEnd = width * 0.97 // gentle taper within the segment
      segs.push([x, y, ex, ey, width, wEnd, depth])
      const totalA = wEnd * wEnd * tree.conserve
      // not every node forks: sometimes the leader just extends (full width) ->
      // variable internode length, so the run before the first fork varies
      if (rng() >= tree.forkProb) {
        grow(ex, ey, a, Math.sqrt(totalA), curl, phase + GOLDEN, drift(depth, tree.depthDrift * 0.25))
        return
      }
      const n = rng() < tree.split3 ? 3 : 2
      // leader keeps 1/phi of the area (the golden-ratio split real branches show)
      const leaderA = totalA * (tree.leader * (0.92 + rng() * 0.16))
      const wLeader = Math.sqrt(Math.min(totalA, leaderA))
      // leader stays close to the central column; side branches reach out in depth
      grow(ex, ey, a, wLeader, curl, phase + GOLDEN, drift(depth, tree.depthDrift * 0.25))
      let remA = Math.max(0, totalA - wLeader * wLeader)
      for (let k = 0; k < n - 1; k++) {
        const ac = k === n - 2 ? remA : remA * (0.45 + rng() * 0.25)
        remA -= ac
        const wc = Math.sqrt(ac)
        if (wc < minW) continue
        const ph = phase + (k + 1) * GOLDEN
        // golden phyllotaxis (cos of the spiral phase) blended with randomness
        const lat = tree.golden * Math.cos(ph) + (1 - tree.golden) * (rng() - 0.5) * 2
        const side = lat >= 0 ? 1 : -1
        const thin = 1 - Math.min(1, wc / Math.max(wEnd, 1e-6))
        const sa = a + side * (0.35 + thin * 0.55) + (rng() - 0.5) * 0.15
        grow(ex, ey, sa, wc, (rng() - 0.5) * tree.curl, ph, drift(depth, tree.depthDrift))
      }
    }
    // 5 scene archetypes for cohesion: all trees in a scene enter from the same
    // edge set. edge codes: 0 left, 1 right, 2 top, 3 bottom. gx/gy is the canopy
    // gradient direction in uv space (where leaf cover is densest -> the origin sides).
    const SCENES = [
      { edges: [2], fx: 0.33, top: true, gx: 0, gy: 1 }, // top (anchored at a thirds line)
      { edges: [2, 0], fx: 0.33, top: true, gx: -0.7, gy: 0.7 }, // top + left
      { edges: [2, 1], fx: 0.67, top: true, gx: 0.7, gy: 0.7 }, // top + right
      { edges: [3, 1], fx: 0.67, top: false, gx: 0.7, gy: -0.7 }, // bottom + right
      { edges: [3, 0], fx: 0.33, top: false, gx: -0.7, gy: -0.7 }, // bottom + left
    ]
    const sceneIdx = tree.sceneType >= 0 ? Math.min(4, Math.round(tree.sceneType)) : Math.floor(rng() * SCENES.length)
    const scene = SCENES[sceneIdx]
    leafGx = scene.gx // canopy gradient: leaves densest toward the branch origin sides
    leafGy = scene.gy
    // rare decorative trunks (0-2), placed near the scene's focus column
    const tr = rng()
    trunkCount = tree.trunkCount >= 0 ? Math.round(tree.trunkCount) : tr < 0.4 ? 0 : tr < 0.8 ? 1 : 2
    trunkX0 = clamp(scene.fx + (rng() - 0.5) * 0.25, 0.05, 0.95)
    trunkX1 = clamp(scene.fx + (rng() - 0.5) * 0.5, 0.05, 0.95)
    trunkW = 0.008 + rng() * rng() * 0.03 // mostly slender, occasionally a fat trunk
    // dominant bough (depth ~0) anchors tightly at the thirds focus; farther boughs
    // (higher depth) spread more. roots stay on the origin side -> negative space.
    const off = tree.rootOffset // push roots off-canvas so the bare trunk section is
    // off-screen and the already-forked canopy fills the visible edge
    const rootForEdge = (edge: number, depth: number): [number, number, number] => {
      const spread = 0.1 + depth * 0.45 // tight for the near dominant, looser for far
      const fx = clamp(scene.fx + (rng() - 0.5) * spread, 0.04, 0.96)
      if (edge === 2) return [fx * aspect, 1.0 + off, -Math.PI / 2 + (rng() - 0.5) * 0.6]
      if (edge === 3) return [fx * aspect, -off, Math.PI / 2 + (rng() - 0.5) * 0.6]
      const yc = scene.top ? 0.7 : 0.3 // anchor height on the origin side
      const y = clamp(yc + (rng() - 0.5) * spread, 0.05, 0.95)
      if (edge === 0) return [-off, y, (rng() - 0.5) * 0.6]
      return [aspect + off, y, Math.PI + (rng() - 0.5) * 0.6]
    }
    const nTrees = Math.max(1, Math.round(tree.nTrees))
    for (let i = 0; i < nTrees; i++) {
      if (segs.length >= MAXSEG) break
      const edge = scene.edges[i % scene.edges.length] // cover each origin edge
      const role = nTrees > 1 ? i / (nTrees - 1) : 0 // 0 = dominant, 1 = minor
      // dominant trunk sits near the wall so it renders solid; minor trees farther.
      // small per-seed jitter so the trunk's depth varies between reshuffles.
      // (this is the central depth of each trunk; branches drift around it.)
      const base = clamp(0.12 + role * 0.4 + (rng() - 0.5) * 0.1, 0.04, 0.95)
      const [x, y, ang] = rootForEdge(edge, role)
      const w = tree.trunkWidth * (1 - role * 0.5) * (0.9 + rng() * 0.2)
      grow(x, y, ang, w, (rng() - 0.5) * tree.curl, rng() * Math.PI * 2, base)
    }
    segCount = Math.min(segs.length, MAXSEG)
    posScale = aspect + 2
    const enc = (v: number, off: number) => {
      const val = Math.max(0, Math.min(65535, Math.round(v * 65535)))
      texData[off] = (val >> 8) & 255
      texData[off + 1] = val & 255
    }
    texData.fill(0)
    for (let i = 0; i < segCount; i++) {
      const s = segs[i]
      const base = i * TEXW * 4
      enc((s[0] + 1) / posScale, base) // x0 -> texel0.rg
      enc((s[1] + 1) / posScale, base + 2) // y0 -> texel0.ba
      enc((s[2] + 1) / posScale, base + 4) // x1 -> texel1.rg
      enc((s[3] + 1) / posScale, base + 6) // y1 -> texel1.ba
      enc(s[4] / WIDSCALE, base + 8) // w0 -> texel2.rg
      enc(s[5] / WIDSCALE, base + 10) // w1 -> texel2.ba
      enc(s[6], base + 12) // depth (0..1) -> texel3.rg
    }
    gl.bindTexture(gl.TEXTURE_2D, segTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXW, MAXSEG, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData)
  }

  let colA = cssVar("--komorebi-light")
  let colMid = cssVar("--komorebi-mid")
  let colB = cssVar("--komorebi-shadow")
  let chartRGB = rgbStr("--secondary")
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const SCALE = 2

  let w = 600
  let h = 180
  let bw = 200
  let bh = 60
  const resize = () => {
    ;[w, h] = contentSize(container)
    bw = Math.max(1, Math.round(w / SCALE))
    bh = Math.max(1, Math.round(h / SCALE))
    canvas.width = bw
    canvas.height = bh
    canvas.style.width = w + "px"
    canvas.style.height = h + "px"
    gl.viewport(0, 0, bw, bh)
    buildSegments() // segment positions are in buv space, which depends on aspect
  }
  resize()
  const ro = new ResizeObserver(() => {
    resize()
    if (reduce) draw()
  })
  ro.observe(container)

  const syncColors = () => {
    colA = cssVar("--komorebi-light")
    colMid = cssVar("--komorebi-mid")
    colB = cssVar("--komorebi-shadow")
    u.center = cssNum("--komorebi-center", 0.38)
    chartRGB = rgbStr("--secondary")
    if (reduce) draw()
  }
  document.addEventListener("themechange", syncColors)

  // --- wind: cursor speed raises a ceiling under a slow gust envelope --------
  // --- parallax: mouse x (desktop) / device tilt (mobile), -1..1 -------------
  let ceiling = u.rest
  let ceilingTarget = u.rest
  let parallax = 0
  let parallaxTarget = 0
  let lastX = 0
  let lastY = 0
  let lastT = 0
  const onMove = (e: PointerEvent) => {
    const now = e.timeStamp
    if (lastT) {
      const dtm = now - lastT
      if (dtm > 0) {
        const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dtm
        ceilingTarget = Math.min(1, Math.max(ceilingTarget, speed / u.sensitivity))
      }
    }
    lastX = e.clientX
    lastY = e.clientY
    lastT = now
    parallaxTarget = (e.clientX / window.innerWidth - 0.5) * 2
  }
  window.addEventListener("pointermove", onMove, { passive: true })
  // device tilt -> parallax (gamma = left/right tilt, ~±35deg full range)
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma != null) parallaxTarget = Math.max(-1, Math.min(1, e.gamma / 35))
  }
  window.addEventListener("deviceorientation", onTilt)

  const gust = (t: number) =>
    0.7 + 0.3 * (0.65 * Math.sin(t * 0.27 * u.gustSpeed) + 0.35 * Math.sin(t * 0.13 * u.gustSpeed + 2.0))
  const DIR = [0.97, 0.22]
  const LNAME = ["trunk", "branches", "(unused)", "leaves"]
  const BEND = [0.0, 0.05, 0.1, 0.36] // trunk static; leaves bend the most
  const FLUT = [0.0, 0.03, 0.08, 0.42] // leaves flutter the most
  const FREQ = [0.0, 0.7, 1.5, 3.2]
  const FPH = [0.0, 1.0, 2.4, 3.9]
  const dispArr = new Float32Array(8)

  // --- debug panel (Konami toggle) ------------------------------------------
  const panel = document.createElement("div")
  panel.className = "dappled-debug"
  panel.style.display = "none"
  const makeChart = (label: string, max: number, digits: number) => {
    const wrap = document.createElement("div")
    wrap.className = "dappled-chart"
    const cap = document.createElement("span")
    wrap.appendChild(cap)
    const cv = document.createElement("canvas")
    cv.width = 206
    cv.height = 30
    wrap.appendChild(cv)
    const ctx = cv.getContext("2d") as CanvasRenderingContext2D
    const N = cv.width
    const data = new Float32Array(N)
    let head = 0
    const update = (v: number) => {
      data[head] = v
      head = (head + 1) % N
      cap.textContent = `${label}: ${v.toFixed(digits)}`
      ctx.clearRect(0, 0, N, cv.height)
      ctx.beginPath()
      for (let x = 0; x < N; x++) {
        const val = Math.min(data[(head + x) % N], max)
        const y = cv.height - 1 - (val / max) * (cv.height - 2)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgb(${chartRGB})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
    return { wrap, update }
  }
  const fpsChart = makeChart("fps", 80, 0)
  const windChart = makeChart("wind", 1, 2)
  panel.appendChild(fpsChart.wrap)
  panel.appendChild(windChart.wrap)

  const addHeader = (text: string) => {
    const hd = document.createElement("div")
    hd.className = "dappled-debug-h"
    hd.textContent = text
    panel.appendChild(hd)
  }
  const addSlider = (
    label: string,
    min: number,
    max: number,
    st: number,
    get: () => number,
    set: (v: number) => void,
  ) => {
    const row = document.createElement("label")
    const span = document.createElement("span")
    const input = document.createElement("input")
    input.type = "range"
    input.min = String(min)
    input.max = String(max)
    input.step = String(st)
    input.value = String(get())
    const relabel = () => (span.textContent = `${label}: ${(+input.value).toFixed(2)}`)
    relabel()
    input.addEventListener("input", () => {
      set(parseFloat(input.value))
      relabel()
    })
    row.append(span, input)
    panel.appendChild(row)
  }
  const addToggle = (label: string, get: () => boolean, set: (on: boolean) => void) => {
    const row = document.createElement("label")
    row.className = "dappled-debug-toggle"
    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.checked = get()
    cb.addEventListener("change", () => set(cb.checked))
    const span = document.createElement("span")
    span.textContent = label
    row.append(cb, span)
    panel.appendChild(row)
  }
  const addButton = (label: string, onClick: () => void) => {
    const b = document.createElement("button")
    b.className = "dappled-debug-btn"
    b.textContent = label
    b.addEventListener("click", onClick)
    panel.appendChild(b)
  }
  // rebuild the L-system geometry after a knob changes (loop re-uploads each frame;
  // for reduced-motion there is no loop, so draw once)
  const regen = () => {
    buildSegments()
    if (reduce) draw()
  }

  addHeader("wind")
  addSlider("cursor sensitivity", 1, 15, 0.5, () => u.sensitivity, (v) => (u.sensitivity = v))
  addSlider("resting wind", 0, 1, 0.01, () => u.rest, (v) => (u.rest = v))
  addSlider("gust speed", 0.2, 3, 0.05, () => u.gustSpeed, (v) => (u.gustSpeed = v))

  addHeader("branches")
  for (let i = 0; i < 4; i++) {
    const k = i
    if (k === 2) continue // layer 2 is no longer used (single L-system branch set)
    addToggle(LNAME[k], () => u.layerOn[k] > 0.5, (on) => (u.layerOn[k] = on ? 1 : 0))
    addSlider(`${LNAME[k]} blur`, 0, 1, 0.02, () => u.blur[k], (v) => (u.blur[k] = v))
    if (k < 3) addSlider(`${LNAME[k]} floor max`, 0, 1, 0.02, () => u.floor[k], (v) => (u.floor[k] = v))
    addSlider(`${LNAME[k]} bend`, 0, 0.5, 0.005, () => BEND[k], (v) => (BEND[k] = v))
    addSlider(`${LNAME[k]} flutter`, 0, 0.5, 0.005, () => FLUT[k], (v) => (FLUT[k] = v))
    addSlider(`${LNAME[k]} flutter spd`, 0, 5, 0.1, () => FREQ[k], (v) => (FREQ[k] = v))
  }

  addHeader("tree (L-system)")
  addButton("reshuffle tree", () => { treeSeed = Math.floor(Math.random() * 1e9); regen() })
  addSlider("scene (-1=rand)", -1, 4, 1, () => tree.sceneType, (v) => { tree.sceneType = v; regen() })
  addSlider("root offset", 0, 1.6, 0.02, () => tree.rootOffset, (v) => { tree.rootOffset = v; regen() })
  addSlider("trunks (-1=rand)", -1, 2, 1, () => tree.trunkCount, (v) => { tree.trunkCount = v; regen() })
  addSlider("leaf bias", 0, 3, 0.05, () => tree.leafBias, (v) => { tree.leafBias = v })
  addSlider("leaf follows depth", 0, 1, 0.05, () => tree.leafFollow, (v) => { tree.leafFollow = v })
  addSlider("trees", 1, 12, 1, () => tree.nTrees, (v) => { tree.nTrees = v; regen() })
  addSlider("trunk width", 0.02, 0.09, 0.002, () => tree.trunkWidth, (v) => { tree.trunkWidth = v; regen() })
  addSlider("len / width", 4, 28, 0.5, () => tree.lenRatio, (v) => { tree.lenRatio = v; regen() })
  addSlider("max seg len", 0.06, 0.7, 0.01, () => tree.maxLen, (v) => { tree.maxLen = v; regen() })
  addSlider("curl", 0, 0.8, 0.02, () => tree.curl, (v) => { tree.curl = v; regen() })
  addSlider("P(3 split)", 0, 1, 0.05, () => tree.split3, (v) => { tree.split3 = v; regen() })
  addSlider("fork prob", 0.3, 1, 0.05, () => tree.forkProb, (v) => { tree.forkProb = v; regen() })
  addSlider("depth drift", 0, 0.9, 0.05, () => tree.depthDrift, (v) => { tree.depthDrift = v; regen() })
  addSlider("leader share", 0.4, 0.95, 0.02, () => tree.leader, (v) => { tree.leader = v; regen() })
  addSlider("golden phyllotaxis", 0, 1, 0.05, () => tree.golden, (v) => { tree.golden = v; regen() })
  addSlider("width conserve", 0.7, 1, 0.01, () => tree.conserve, (v) => { tree.conserve = v; regen() })
  addSlider("end thickness px", 0.5, 3, 0.1, () => tree.endPx, (v) => { tree.endPx = v; regen() })

  addHeader("tone & dither")
  addToggle("dither", () => u.dither > 0.5, (on) => (u.dither = on ? 1 : 0))
  addSlider("contrast", 0.5, 3, 0.05, () => u.contrast, (v) => (u.contrast = v))
  addSlider("brightness", 0.1, 0.7, 0.01, () => u.center, (v) => (u.center = v))
  addSlider("gold start", 0, 0.8, 0.01, () => u.goldLo, (v) => (u.goldLo = v))
  addSlider("gold end", 0.2, 0.95, 0.01, () => u.goldHi, (v) => (u.goldHi = v))
  addSlider("canopy", 0, 1.5, 0.05, () => u.canopy, (v) => (u.canopy = v))
  document.body.appendChild(panel)

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"]
  let seq: string[] = []
  const onKey = (e: KeyboardEvent) => {
    seq.push(e.key)
    if (seq.length > KONAMI.length) seq = seq.slice(-KONAMI.length)
    if (seq.length === KONAMI.length && KONAMI.every((kk, ii) => seq[ii] === kk)) {
      panel.style.display = panel.style.display === "none" ? "block" : "none"
      seq = []
    }
  }
  document.addEventListener("keydown", onKey)

  // --- render ---------------------------------------------------------------
  let tReal = 0
  let wind = u.rest
  const draw = () => {
    gl.uniform1f(U.uTime, tReal)
    gl.uniform2f(U.uResolution, bw, bh)
    gl.uniform2fv(U.uDisp, dispArr)
    gl.uniform3f(U.uColorA, colA[0], colA[1], colA[2])
    gl.uniform3f(U.uColorMid, colMid[0], colMid[1], colMid[2])
    gl.uniform3f(U.uColorB, colB[0], colB[1], colB[2])
    gl.uniform1f(U.uContrast, u.contrast)
    gl.uniform1f(U.uCenter, u.center)
    gl.uniform1f(U.uGoldLo, u.goldLo)
    gl.uniform1f(U.uGoldHi, u.goldHi)
    gl.uniform1f(U.uCanopy, u.canopy)
    gl.uniform4f(U.uLayerOn, u.layerOn[0], u.layerOn[1], u.layerOn[2], u.layerOn[3])
    gl.uniform4f(U.uBlur, u.blur[0], u.blur[1], u.blur[2], u.blur[3])
    gl.uniform1f(U.uDither, u.dither)
    gl.uniform1f(U.uParallax, parallax)
    gl.uniform3f(U.uFloor, u.floor[0], u.floor[1], u.floor[2])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, segTex)
    gl.uniform1i(U.uSegTex, 0)
    gl.uniform1f(U.uPosScale, posScale)
    gl.uniform1f(U.uWidScale, WIDSCALE)
    gl.uniform1i(U.uSegCount, segCount)
    gl.uniform2f(U.uLeafGrad, leafGx, leafGy)
    gl.uniform1f(U.uLeafFall, tree.leafBias)
    gl.uniform1f(U.uLeafFollow, tree.leafFollow)
    gl.uniform1f(U.uTrunkCount, trunkCount)
    gl.uniform2f(U.uTrunkX, trunkX0, trunkX1)
    gl.uniform1f(U.uTrunkW, trunkW)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  let raf = 0
  let running = true
  let prevMs = 0
  let fps = 0
  const loop = (ms: number) => {
    const dt = prevMs ? Math.min(0.05, (ms - prevMs) / 1000) : 0.016
    prevMs = ms
    tReal += dt
    ceilingTarget = Math.max(u.rest, ceilingTarget * 0.97)
    ceiling += (ceilingTarget - ceiling) * (ceilingTarget > ceiling ? 0.02 : 0.05)
    parallax += (parallaxTarget - parallax) * 0.08
    wind = gust(tReal) * ceiling
    // cumulative displacement down the tree
    let s = 0
    for (let i = 0; i < 4; i++) {
      s += wind * (BEND[i] + FLUT[i] * Math.sin(tReal * FREQ[i] + FPH[i]))
      dispArr[2 * i] = DIR[0] * s
      dispArr[2 * i + 1] = DIR[1] * s
    }
    draw()
    fps += ((dt > 0 ? 1 / dt : 0) - fps) * 0.1
    if (panel.style.display !== "none") {
      fpsChart.update(fps)
      windChart.update(wind)
    }
    if (running) raf = requestAnimationFrame(loop)
  }
  const onVis = () => {
    if (document.hidden) {
      running = false
      cancelAnimationFrame(raf)
    } else if (!reduce) {
      running = true
      prevMs = 0
      raf = requestAnimationFrame(loop)
    }
  }

  if (reduce) {
    draw()
  } else {
    raf = requestAnimationFrame(loop)
    document.addEventListener("visibilitychange", onVis)
  }

  window.addCleanup(() => {
    running = false
    cancelAnimationFrame(raf)
    ro.disconnect()
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("deviceorientation", onTilt)
    document.removeEventListener("themechange", syncColors)
    document.removeEventListener("visibilitychange", onVis)
    document.removeEventListener("keydown", onKey)
    panel.remove()
    gl.deleteTexture(segTex)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    canvas.remove()
  })
}

document.addEventListener("nav", () => {
  const el = document.querySelector(".dappled-scene") as HTMLElement | null
  if (!el || el.dataset.init === "true") return
  el.dataset.init = "true"
  initScene(el) // inline shader, nothing heavy to defer — just start it
})
