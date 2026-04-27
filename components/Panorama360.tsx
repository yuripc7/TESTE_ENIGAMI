import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props { url: string; }

export const Panorama360: React.FC<Props> = ({ url }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        renderer: THREE.WebGLRenderer;
        camera: THREE.PerspectiveCamera;
        scene: THREE.Scene;
        animId: number;
    } | null>(null);

    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const lon = useRef(180);
    const lat = useRef(0);
    const [fov, setFov] = useState(75);
    const fovRef = useRef(75);

    useEffect(() => {
        const el = mountRef.current;
        if (!el) return;

        const w = el.clientWidth || 800;
        const h = el.clientHeight || 480;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // invert so texture is on the inside

        const texture = new THREE.TextureLoader().load(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        const animate = () => {
            const animId = requestAnimationFrame(animate);
            sceneRef.current!.animId = animId;

            const latRad = THREE.MathUtils.degToRad(Math.max(-85, Math.min(85, lat.current)));
            const lonRad = THREE.MathUtils.degToRad(lon.current);

            camera.position.set(0, 0, 0);
            camera.lookAt(
                500 * Math.cos(latRad) * Math.cos(lonRad),
                500 * Math.sin(latRad),
                500 * Math.cos(latRad) * Math.sin(lonRad)
            );
            renderer.render(scene, camera);
        };

        const animId = requestAnimationFrame(animate);
        sceneRef.current = { renderer, camera, scene, animId };

        const onResize = () => {
            const nw = el.clientWidth;
            const nh = el.clientHeight;
            renderer.setSize(nw, nh);
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(el);

        return () => {
            cancelAnimationFrame(animId);
            ro.disconnect();
            renderer.dispose();
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
            sceneRef.current = null;
        };
    }, [url]);

    // Sync fov from state → camera
    useEffect(() => {
        fovRef.current = fov;
        if (sceneRef.current) {
            sceneRef.current.camera.fov = fov;
            sceneRef.current.camera.updateProjectionMatrix();
        }
    }, [fov]);

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lon.current -= dx * 0.3;
        lat.current = Math.max(-85, Math.min(85, lat.current - dy * 0.3));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };

    const onTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        lon.current -= dx * 0.3;
        lat.current = Math.max(-85, Math.min(85, lat.current - dy * 0.3));
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onWheel = (e: React.WheelEvent) => {
        setFov(f => Math.max(30, Math.min(120, f + e.deltaY * 0.05)));
    };

    return (
        <div className="flex flex-col h-full w-full" style={{ background: '#0a0a14' }}>
            {/* Viewer */}
            <div
                ref={mountRef}
                className="flex-1 relative cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none', minHeight: 400 }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
                onWheel={onWheel}
            >
                {/* 360 badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 pointer-events-none">
                    <span className="material-symbols-outlined text-white text-sm">360</span>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Panorama 360°</span>
                </div>
                {/* Drag hint */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[9px] text-white/30 uppercase tracking-widest pointer-events-none">
                    Arraste para explorar · Scroll para zoom
                </div>
                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-5 h-5 rounded-full border border-white/20" />
                </div>
            </div>

            {/* FOV controls */}
            <div className="flex items-center justify-center gap-3 py-2 border-t border-white/10" style={{ background: '#16213e' }}>
                <span className="text-[9px] text-white/40 uppercase tracking-widest">Campo de Visão</span>
                <button onClick={() => setFov(f => Math.min(120, f + 10))} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-[10px] font-bold text-white/50 w-12 text-center">{fov}°</span>
                <button onClick={() => setFov(f => Math.max(30, f - 10))} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-sm">add</span>
                </button>
            </div>
        </div>
    );
};

export default Panorama360;
