import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 1. Particle Vortex Component (Scroll-driven rotation and speed)
const ParticleVortex: React.FC<{
  scrollY: React.MutableRefObject<number>;
  theme: string;
}> = ({ scrollY, theme }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate random positions on a spherical shell
  const count = 1200;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = Math.acos(THREE.MathUtils.randFloat(-1, 1));
      const distance = THREE.MathUtils.randFloat(3, 8);
      
      arr[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = distance * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    // Smooth kinetic rotation driven by scroll position
    const targetRotX = scrollY.current * 0.0003;
    const targetRotY = scrollY.current * 0.0005;
    
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetRotX, 0.05);
    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetRotY, 0.05);
    
    // Add subtle ambient floating motion
    const elapsedTime = state.clock.getElapsedTime();
    pointsRef.current.rotation.z = elapsedTime * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={theme === 'light' ? '#4f46e5' : '#70e0ff'}
        size={theme === 'light' ? 0.045 : 0.035}
        sizeAttenuation={true}
        depthWrite={false}
        blending={theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending}
        opacity={theme === 'light' ? 0.35 : 0.22}
      />
    </Points>
  );
};

// 2. Core Geometric Mesh (Moeibius-like Torus Knot that scales and moves dynamically)
const CoreGeometricMesh: React.FC<{
  scrollY: React.MutableRefObject<number>;
  theme: string;
}> = ({ scrollY, theme }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const elapsedTime = state.clock.getElapsedTime();
    
    // Continuous rotation of the group
    groupRef.current.rotation.x = elapsedTime * 0.15;
    groupRef.current.rotation.y = elapsedTime * 0.2;
    
    // Scale and Z-translation driven by scroll position
    const targetScale = Math.max(0.4, 1.2 - (scrollY.current * 0.001));
    const targetZ = -2 - (scrollY.current * 0.005);
    const targetY = -(scrollY.current * 0.001); // Move down as user scrolls
    
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.05));
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.05);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05);
  });

  return (
    <group ref={groupRef} position={[1.5, 0, -2]}>
      {/* 3D Wireframe Shadow (Offset in local space) */}
      <mesh position={[-0.08, -0.08, -0.15]}>
        <torusKnotGeometry args={[1, 0.35, 120, 16, 2, 3]} />
        <meshBasicMaterial 
          color={theme === 'light' ? '#0f172a' : '#020617'}
          wireframe 
          transparent 
          opacity={theme === 'light' ? 0.045 : 0.015} 
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Main Wireframe Mesh */}
      <mesh position={[0, 0, 0]}>
        <torusKnotGeometry args={[1, 0.35, 120, 16, 2, 3]} />
        <meshBasicMaterial 
          color={theme === 'light' ? '#4f46e5' : '#c084fc'}
          wireframe 
          transparent 
          opacity={theme === 'light' ? 0.08 : 0.035} 
          blending={theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// 2.5 Ground Shadow Component (Provides depth reference below the cluster)
const GroundShadow: React.FC<{
  scrollY: React.MutableRefObject<number>;
  theme: string;
}> = ({ scrollY, theme }) => {
  const shadowRef = useRef<THREE.Mesh>(null);
  
  const shadowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(() => {
    if (!shadowRef.current) return;
    
    // Scale and position follow the floating knot's scroll state
    const scale = Math.max(0.6, 1.8 - (scrollY.current * 0.0015));
    const targetY = -2.2 - (scrollY.current * 0.001);
    const targetZ = -2 - (scrollY.current * 0.005);
    
    shadowRef.current.scale.set(scale, scale, 1);
    shadowRef.current.position.y = THREE.MathUtils.lerp(shadowRef.current.position.y, targetY, 0.05);
    shadowRef.current.position.z = THREE.MathUtils.lerp(shadowRef.current.position.z, targetZ, 0.05);
  });

  return (
    <mesh ref={shadowRef} position={[1.5, -2.2, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial 
        map={shadowTexture} 
        transparent 
        opacity={theme === 'light' ? 0.07 : 0.16} 
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// 3. Scroll-driven camera controller
const CameraController: React.FC<{
  scrollY: React.MutableRefObject<number>;
}> = ({ scrollY }) => {
  useFrame((state) => {
    const z = 6 + scrollY.current * 0.004;
    const y = -(scrollY.current * 0.0015);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, z, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, y, 0.05);
  });
  return null;
};

// Main Export
const Background3D: React.FC = () => {
  const scrollY = useRef(0);
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'dark'
  );

  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('scroll', onScroll);
      obs.disconnect();
    };
  }, []);

  return (
    <div className="webgl-bg-container">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={theme === 'light' ? 0.7 : 0.35} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color={theme === 'light' ? '#ffffff' : '#818cf8'} />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color={theme === 'light' ? '#e0e7ff' : '#22d3ee'} />
        <ParticleVortex scrollY={scrollY} theme={theme} />
        <CoreGeometricMesh scrollY={scrollY} theme={theme} />
        <GroundShadow scrollY={scrollY} theme={theme} />
        <CameraController scrollY={scrollY} />
      </Canvas>
      <style>{`
        .webgl-bg-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 0;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .webgl-bg-container canvas {
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
};

export default Background3D;
