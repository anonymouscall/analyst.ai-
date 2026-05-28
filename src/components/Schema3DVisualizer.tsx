import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface TableInfo {
  name: string;
  rows: number;
  fields: string[];
}

interface Schema3DVisualizerProps {
  summary?: {
    tables: TableInfo[];
    totalRows: number;
    totalTables: number;
  };
}

/* ─────────────────────────────────────────────
   Signal pulse: bright dot traveling an edge
───────────────────────────────────────────── */
const SignalPulse: React.FC<{
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  speed: number;
  delay: number;
}> = ({ startPos, endPos, speed, delay }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const t = useRef(delay % 1);

  useFrame((_, delta) => {
    t.current = (t.current + delta * speed) % 1;
    if (ref.current) {
      ref.current.position.lerpVectors(startPos, endPos, t.current);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 6, 6]} />
      <meshBasicMaterial color="#a5b4fc" />
    </mesh>
  );
};

/* ─────────────────────────────────────────────
   Single neuron node
───────────────────────────────────────────── */
const NeuronNode: React.FC<{
  table: TableInfo;
  position: THREE.Vector3;
  maxRows: number;
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
}> = ({ table, position, maxRows, isHovered, onHover, onUnhover }) => {
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  const ratio = Math.max(0.18, table.rows / Math.max(1, maxRows));
  const r = 0.16 + ratio * 0.44;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.6 + position.x * 2.5) * 0.14;
    if (glowRef.current) glowRef.current.scale.setScalar(pulse * (isHovered ? 1.6 : 1));
    if (coreRef.current) {
      coreRef.current.rotation.x += 0.009;
      coreRef.current.rotation.y += 0.013;
    }
  });

  return (
    <group position={position}>
      {/* Pulsing glow ring */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[r * 2.4, 8, 8]} />
        <meshBasicMaterial
          color={isHovered ? '#818cf8' : '#4338ca'}
          transparent
          opacity={isHovered ? 0.18 : 0.07}
        />
      </mesh>

      {/* Wireframe icosahedron core */}
      <mesh
        ref={coreRef}
        onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
        onPointerOut={onUnhover}
      >
        <icosahedronGeometry args={[r, 1]} />
        <meshStandardMaterial
          color={isHovered ? '#c7d2fe' : '#6366f1'}
          wireframe
          emissive={isHovered ? '#818cf8' : '#4338ca'}
          emissiveIntensity={isHovered ? 1.5 : 0.55}
        />
      </mesh>

      {/* Solid inner dot */}
      <mesh>
        <sphereGeometry args={[r * 0.38, 7, 7]} />
        <meshBasicMaterial color={isHovered ? '#c7d2fe' : '#818cf8'} />
      </mesh>

      {/* HTML label — always visible below node */}
      <Html
        center
        distanceFactor={10}
        position={[0, -r - 0.42, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          textAlign: 'center',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: isHovered ? '10px' : '8.5px',
            fontWeight: 700,
            color: isHovered ? '#c7d2fe' : '#818cf8',
            textShadow: '0 0 8px rgba(99,102,241,0.9)',
            transition: 'font-size 0.15s',
          }}>
            {table.name}
          </div>
          {isHovered && (
            <div style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: '#a5b4fc',
              marginTop: '2px',
              textShadow: '0 0 6px rgba(99,102,241,0.7)',
            }}>
              {table.rows.toLocaleString()} rows · {table.fields.length} cols
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

/* ─────────────────────────────────────────────
   Full neural network (used when DB connected)
───────────────────────────────────────────── */
const NeuralCluster: React.FC<{ tables: TableInfo[] }> = ({ tables }) => {
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null!);
  const maxRows = Math.max(...tables.map(t => t.rows), 1);

  // Fibonacci sphere layout
  const positions = useMemo<THREE.Vector3[]>(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return tables.map((_, i) => {
      const n = tables.length;
      const y = 1 - (i / Math.max(1, n - 1)) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const radius = 3.0 + (i % 3) * 0.6;
      return new THREE.Vector3(
        Math.cos(theta) * rr * radius,
        y * radius * 0.8,
        Math.sin(theta) * rr * radius,
      );
    });
  }, [tables]);

  // Connect each node to its 2 closest neighbours (deduplicated)
  const edges = useMemo<{ a: number; b: number }[]>(() => {
    const seen = new Set<string>();
    const result: { a: number; b: number }[] = [];
    positions.forEach((p, i) => {
      const sorted = positions
        .map((q, j) => ({ j, d: i !== j ? p.distanceTo(q) : Infinity }))
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.min(2, positions.length - 1));
      sorted.forEach(({ j }) => {
        const key = [Math.min(i, j), Math.max(i, j)].join('-');
        if (!seen.has(key)) { seen.add(key); result.push({ a: i, b: j }); }
      });
    });
    return result;
  }, [positions]);

  // Slow rotation, halts on hover
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (!hoveredName) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.18) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((e, i) => (
        <Line
          key={`edge-${i}`}
          points={[positions[e.a], positions[e.b]]}
          color="#4338ca"
          lineWidth={0.7}
          opacity={0.22}
          transparent
        />
      ))}

      {/* Signal pulses along each edge */}
      {edges.map((e, i) => (
        <SignalPulse
          key={`pulse-${i}`}
          startPos={positions[e.a]}
          endPos={positions[e.b]}
          speed={0.22 + (i % 6) * 0.07}
          delay={i * 0.17}
        />
      ))}

      {/* Neuron nodes */}
      {tables.map((table, i) => (
        <NeuronNode
          key={table.name}
          table={table}
          position={positions[i]}
          maxRows={maxRows}
          isHovered={hoveredName === table.name}
          onHover={() => setHoveredName(table.name)}
          onUnhover={() => setHoveredName(null)}
        />
      ))}
    </group>
  );
};

/* ─────────────────────────────────────────────
   Idle network (shown when no DB connected)
───────────────────────────────────────────── */
const IdleCluster: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<(THREE.Mesh | null)[]>([]);

  const nodes = useMemo<THREE.Vector3[]>(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: 9 }, (_, i) => {
      const y = 1 - (i / 8) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      return new THREE.Vector3(Math.cos(theta) * rr * 2.8, y * 2.4, Math.sin(theta) * rr * 2.8);
    });
  }, []);

  const edges = useMemo<{ a: number; b: number }[]>(() => {
    const seen = new Set<string>();
    const result: { a: number; b: number }[] = [];
    nodes.forEach((p, i) => {
      nodes
        .map((q, j) => ({ j, d: i !== j ? p.distanceTo(q) : Infinity }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const key = [Math.min(i, j), Math.max(i, j)].join('-');
          if (!seen.has(key)) { seen.add(key); result.push({ a: i, b: j }); }
        });
    });
    return result;
  }, [nodes]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.28;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.22) * 0.14;
    }
    meshRef.current.forEach((m, i) => {
      if (!m) return;
      const t = state.clock.getElapsedTime();
      m.scale.setScalar(1 + Math.sin(t * 1.3 + i * 0.9) * 0.18);
      m.rotation.x += 0.01;
      m.rotation.y += 0.014;
    });
  });

  return (
    <group ref={groupRef}>
      {edges.map((e, i) => (
        <Line key={i} points={[nodes[e.a], nodes[e.b]]} color="#4338ca" lineWidth={0.6} opacity={0.16} transparent />
      ))}
      {edges.slice(0, 5).map((e, i) => (
        <SignalPulse key={i} startPos={nodes[e.a]} endPos={nodes[e.b]} speed={0.18 + i * 0.06} delay={i * 0.25} />
      ))}
      {nodes.map((pos, i) => (
        <mesh
          key={i}
          position={pos}
          ref={(el) => { meshRef.current[i] = el; }}
        >
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color="#6366f1" wireframe emissive="#4338ca" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

/* ─────────────────────────────────────────────
   Ambient dust particles
───────────────────────────────────────────── */
const DustParticles: React.FC = () => {
  const ref = useRef<THREE.Points>(null!);
  const count = 380;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.016;
    ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.09) * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#6366f1" size={0.032} opacity={0.28} transparent sizeAttenuation />
    </points>
  );
};

/* ─────────────────────────────────────────────
   Root export
───────────────────────────────────────────── */
const Schema3DVisualizer: React.FC<Schema3DVisualizerProps> = ({ summary }) => {
  const hasTables = !!(summary?.tables?.length);

  return (
    <div
      className="schema3d-container"
      style={{
        width: '100%',
        position: 'relative',
        background: 'oklch(9% 0.028 265 / 0.55)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 2, 9.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.45} />
        <pointLight position={[7, 7, 7]} intensity={2.8} color="#818cf8" />
        <pointLight position={[-7, -4, -7]} intensity={1.1} color="#22d3ee" />
        <DustParticles />
        {hasTables ? (
          <NeuralCluster tables={summary!.tables} />
        ) : (
          <IdleCluster />
        )}
        <OrbitControls enableZoom={false} enablePan={false} makeDefault />
      </Canvas>

      {/* Bottom status bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '6px 14px',
        background: 'linear-gradient(to top, oklch(8% 0.03 265 / 0.85) 0%, transparent 100%)',
        fontSize: '0.67rem',
        fontFamily: 'monospace',
        color: '#475569',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        {hasTables ? (
          <>
            <span>{summary!.tables.length} nodes · {summary!.totalRows.toLocaleString()} records</span>
            <span>hover to inspect · drag to orbit</span>
          </>
        ) : (
          <span style={{ width: '100%', textAlign: 'center' }}>connect a database to render your neural data map</span>
        )}
      </div>

      {/* Responsive height via a style tag scoped to this component */}
      <style>{`
        .schema3d-container {
          height: 340px;
        }
        @media (max-width: 768px) {
          .schema3d-container {
            height: 260px;
          }
        }
        @media (max-width: 480px) {
          .schema3d-container {
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
};

export default Schema3DVisualizer;
