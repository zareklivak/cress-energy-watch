import { Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { buildingTones, SITE, TONE_COLOR, type Pin, type PinTone } from './pins'
import { SITE_COLORS, WALL_TINT } from './siteColors'

const C = SITE_COLORS

type Rect = { center: number[]; w: number; d: number; angle: number }

/** A flat strip along a polyline (roads), lying just above the ground. */
function ribbon(points: number[][], width: number, y = 0.03) {
  const pos: number[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1]
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = (-(y2 - y1) / len) * (width / 2), ny = ((x2 - x1) / len) * (width / 2)
    const a = [x1 + nx, y1 + ny], b = [x1 - nx, y1 - ny], c = [x2 + nx, y2 + ny], d = [x2 - nx, y2 - ny]
    for (const [px, py] of [a, b, c, b, d, c]) pos.push(px, y, -py)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** A gable roof whose ridge runs along local x. */
function gable(w: number, d: number, rise: number) {
  const hw = w / 2, hd = d / 2
  const pos: number[] = []
  const tri = (...p: number[][]) => p.forEach((v) => pos.push(...v))
  tri([-hw, 0, hd], [hw, 0, hd], [hw, rise, 0], [-hw, 0, hd], [hw, rise, 0], [-hw, rise, 0])
  tri([hw, 0, -hd], [-hw, 0, -hd], [-hw, rise, 0], [hw, 0, -hd], [-hw, rise, 0], [hw, rise, 0])
  tri([-hw, 0, -hd], [-hw, 0, hd], [-hw, rise, 0], [hw, 0, hd], [hw, 0, -hd], [hw, rise, 0])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function Flat({ r, y, color, pad = 0 }: { r: Rect; y: number; color: string; pad?: number }) {
  return (
    <mesh position={[r.center[0], y, -r.center[1]]} rotation={[-Math.PI / 2, 0, r.angle]} receiveShadow>
      <planeGeometry args={[r.w + pad, r.d + pad]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

function Block({ b, tone }: { b: Rect & { height: number }; tone?: PinTone }) {
  const long = b.w >= b.d
  const roof = useMemo(() => gable((long ? b.w : b.d) + 1.4, (long ? b.d : b.w) + 1.4, Math.min(b.w, b.d) * 0.3), [b.w, b.d, long])
  const floors = Math.max(1, Math.floor(b.height / 3.2))
  const wall = (tone && WALL_TINT[tone]) ?? C.wall
  return (
    <group position={[b.center[0], 0, -b.center[1]]} rotation-y={b.angle}>
      <mesh position={[0, 0.5, 0]} receiveShadow><boxGeometry args={[b.w + 0.3, 1, b.d + 0.3]} /><meshStandardMaterial color={C.base} roughness={0.95} /></mesh>
      <mesh position={[0, b.height / 2, 0]} castShadow receiveShadow><boxGeometry args={[b.w, b.height, b.d]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      {Array.from({ length: floors }, (_, f) => (
        <mesh key={f} position={[0, 1.7 + f * 3.2, 0]}><boxGeometry args={[b.w + 0.06, 0.95, b.d + 0.06]} /><meshStandardMaterial color={C.band} roughness={0.4} metalness={0.1} /></mesh>
      ))}
      <mesh position={[0, b.height, 0]} rotation-y={long ? 0 : Math.PI / 2} geometry={roof} castShadow receiveShadow>
        <meshStandardMaterial color={C.roof} roughness={0.8} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  )
}

function Lodge({ tone }: { tone?: PinTone }) {
  const { polygon, height } = SITE.lodge
  const shape = useMemo(() => new THREE.Shape(polygon.map(([x, y]) => new THREE.Vector2(x, y))), [polygon])
  const walls = useMemo(() => { const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g }, [shape, height])
  const cap = useMemo(() => { const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g }, [shape])
  const bands = useMemo(() => { const g = new THREE.ExtrudeGeometry(shape, { depth: 0.95, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.scale(1.004, 1, 1.004); return g }, [shape])
  const xs = polygon.map((p) => p[0]), ys = polygon.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const ridges = useMemo(() => [0.18, 0.4, 0.62, 0.84].map((t) => ({ x: minX + t * (maxX - minX), geometry: gable(11, (maxY - minY) * 0.55, 3) })), [minX, maxX, minY, maxY])
  const wall = (tone && WALL_TINT[tone]) ?? C.wall
  return (
    <group>
      <mesh geometry={walls} castShadow receiveShadow><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      {[0, 1, 2, 3].map((f) => <mesh key={f} geometry={bands} position={[0, 1.7 + f * 3.2, 0]}><meshStandardMaterial color={C.band} roughness={0.4} /></mesh>)}
      <mesh geometry={cap} position={[0, height, 0]} castShadow><meshStandardMaterial color={C.roof} roughness={0.85} /></mesh>
      {ridges.map((r, i) => (
        <mesh key={i} geometry={r.geometry} position={[r.x, height + 0.5, -(minY + maxY) / 2]} rotation-y={Math.PI / 2} castShadow>
          <meshStandardMaterial color={C.roof} roughness={0.8} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Courts() {
  const { surround, courts } = SITE.courts
  return (
    <group>
      <Flat r={surround} y={0.04} color={C.courtSurround} />
      {courts.map((c, i) => {
        const hw = c.playW / 2, hd = c.playD / 2, sd = 4.115, sv = 6.4
        const lines: [number, number, number, number][] = [
          [0, hd, c.playW, 0.1], [0, -hd, c.playW, 0.1], [hw, 0, 0.1, c.playD], [-hw, 0, 0.1, c.playD],
          [0, sd, c.playW, 0.08], [0, -sd, c.playW, 0.08], [sv, 0, 0.08, sd * 2], [-sv, 0, 0.08, sd * 2], [0, 0, sv * 2, 0.08],
        ]
        return (
          <group key={i} position={[c.center[0], 0, -c.center[1]]} rotation-y={c.angle}>
            <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[c.w, c.d]} /><meshStandardMaterial color={C.court} roughness={0.9} /></mesh>
            {lines.map(([x, z, w, d], k) => (
              <mesh key={k} position={[x, 0.08, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[w, d]} /><meshBasicMaterial color={C.line} /></mesh>
            ))}
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.08, 1, c.playD + 1.8]} /><meshStandardMaterial color={C.net} /></mesh>
          </group>
        )
      })}
    </group>
  )
}

function PoolArea() {
  const { polygon, spas, deck } = SITE.pool
  const water = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(polygon.map(([x, y]) => new THREE.Vector2(x, y)))), [polygon])
  return (
    <group>
      <Flat r={deck} y={0.05} color={C.deck} />
      <mesh geometry={water} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}><meshStandardMaterial color={C.water} roughness={0.15} metalness={0.1} /></mesh>
      {spas.map((s, i) => (
        <group key={i} position={[s.center[0], 0, -s.center[1]]}>
          <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[s.r + 0.4, s.r + 0.4, 0.6, 24]} /><meshStandardMaterial color={C.deck} /></mesh>
          <mesh position={[0, 0.61, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[s.r, 24]} /><meshStandardMaterial color={C.spa} roughness={0.15} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Grounds() {
  const roads = useMemo(() => SITE.roads.map((r) => ribbon(r.points, r.width)), [])
  const { roundabout: rb, parking: pk } = SITE
  return (
    <group>
      {roads.map((g, i) => <mesh key={i} geometry={g} receiveShadow><meshStandardMaterial color={C.road} roughness={0.95} side={THREE.DoubleSide} /></mesh>)}
      <mesh position={[rb.center[0], 0.035, -rb.center[1]]} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[rb.inner, rb.outer, 40]} /><meshStandardMaterial color={C.drive} roughness={0.95} /></mesh>
      <mesh position={[rb.center[0], 0.2, -rb.center[1]]} receiveShadow><cylinderGeometry args={[rb.inner, rb.inner, 0.4, 40]} /><meshStandardMaterial color={C.island} roughness={0.95} /></mesh>
      <Flat r={pk} y={0.035} color={C.drive} />
      <group position={[pk.center[0], 0.05, -pk.center[1]]} rotation-y={pk.angle}>
        {Array.from({ length: pk.stripes }, (_, k) => (
          <mesh key={k} position={[0, 0, -pk.d / 2 + ((k + 1) * pk.d) / (pk.stripes + 1)]} rotation-x={-Math.PI / 2}><planeGeometry args={[pk.w * 0.8, 0.12]} /><meshBasicMaterial color={C.stripe} /></mesh>
        ))}
      </group>
    </group>
  )
}

type Tree = { x: number; y: number; s: number; kind: string }
function Instanced({ items, geometry, y, color }: { items: Tree[]; geometry: THREE.BufferGeometry; y: number; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    items.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, y * t.s, -t.y), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items, y])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </instancedMesh>
  )
}

function Trees() {
  const pines = SITE.trees.filter((t) => t.kind === 'pine')
  const leafy = SITE.trees.filter((t) => t.kind === 'leafy')
  const cone = useMemo(() => new THREE.ConeGeometry(1.9, 5.6, 7), [])
  const ball = useMemo(() => new THREE.IcosahedronGeometry(2.3, 0), [])
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6), [])
  return (
    <>
      <Instanced items={pines} geometry={cone} y={4.6} color={C.pine} />
      <Instanced items={leafy} geometry={ball} y={3.9} color={C.leaf} />
      <Instanced items={SITE.trees} geometry={trunk} y={1.1} color={C.trunk} />
    </>
  )
}

function PinButton({ pin, showLabel, onOpen }: { pin: Pin; showLabel: boolean; onOpen: (href: string) => void }) {
  const strong = pin.tone === 'high'
  return (
    <button
      type="button"
      onClick={() => onOpen(pin.href)}
      title={pin.title}
      aria-label={pin.title}
      className="flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {showLabel && (
        <span className={strong
          ? 'flex items-center gap-1.5 whitespace-nowrap rounded-full border border-high/40 bg-card px-2.5 py-1 text-meta font-bold text-high shadow-md hover:shadow-lg'
          : 'flex items-center gap-1 whitespace-nowrap rounded-full bg-card/95 px-2 py-0.5 text-caption font-medium text-ink/85 shadow-sm hover:bg-card'}>
          {strong && <span className="h-3 w-3 rounded-full" style={{ background: TONE_COLOR.high, boxShadow: '0 0 0 4px rgba(179,56,31,0.22)' }} />}
          {pin.label}
          {pin.note && <span className="font-semibold">· {pin.note}</span>}
        </span>
      )}
      <span className="h-3 w-px bg-ink/40" />
      <span className="relative h-3.5 w-3.5 rounded-full ring-2 ring-white transition-transform before:absolute before:-inset-3 before:content-[''] hover:scale-125" style={{ background: TONE_COLOR[pin.tone] }} />
    </button>
  )
}

/** Labels mount one frame after the canvas: an <Html> mounted in the same commit as <Canvas> is silently dropped. */
function Pins({ pins, expanded, onOpen }: { pins: Pin[]; expanded: boolean; onOpen: (href: string) => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  if (!ready) return null
  return (
    <>
      {pins.map((p) => (
        <Html key={p.meter} position={[p.x, p.z, -p.y]} zIndexRange={[20, 0]}>
          <PinButton pin={p} onOpen={onOpen} showLabel={expanded || (p.tone !== 'ok' && p.tone !== 'expected')} />
        </Html>
      ))}
    </>
  )
}

export default function Lodge3D({ pins, expanded = false, onOpen }: { pins: Pin[]; expanded?: boolean; onOpen: (href: string) => void }) {
  const f = SITE.frame
  const size = Math.max(f.maxX - f.minX, f.maxY - f.minY)
  const cx = (f.minX + f.maxX) / 2
  const cz = -(f.minY + f.maxY) / 2
  const tones = buildingTones(pins)
  const dir = new THREE.Vector3(0.3, 0.75, 0.6).normalize().toArray()
  const dist = size * (expanded ? 1.45 : 1.75)
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ position: [cx + dir[0] * dist, dir[1] * dist, cz + dir[2] * dist], fov: 30 }}>
      <color attach="background" args={[C.sky]} />
      <hemisphereLight args={[C.line, C.grass, 1.05]} />
      <directionalLight
        position={[cx + size * 0.35, size * 1.3, cz + size * 0.7]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
      />
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[size * 8, size * 8]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      <Grounds />
      <Courts />
      <PoolArea />
      <Lodge tone={tones.lodge} />
      {SITE.blocks.map((b) => <Block key={b.id} b={b} tone={tones[b.id]} />)}
      <Trees />
      <Pins pins={pins} expanded={expanded} onOpen={onOpen} />
      <OrbitControls
        target={[cx, 4, cz]}
        enablePan={expanded}
        enableZoom={expanded}
        minDistance={size * 0.35}
        maxDistance={size * 2.4}
        minPolarAngle={0.35}
        maxPolarAngle={1.2}
      />
    </Canvas>
  )
}
