import * as THREE from 'three';

/**
 * Turbo Drift Evolution: Game Engine
 * 3D Physics, AI, Race Logic
 */

const game = {
    // Three.js Core
    scene: null,
    camera: null,
    renderer: null,
    clock: new THREE.Clock(),

    // Game State
    isRunning: false,
    isPaused: false,
    currentState: 'menu',
    playerCar: null,
    opponents: [],
    track: [],
    currentTrackIndex: 0,
    tracks: [
        { name: 'SÃO PAULO 2077', color: 0x00f2ff, envColor: 0x004444, fog: 0x000000, times: { gold: 65, silver: 80, bronze: 100 } },
        { name: 'CYBER NORTH', color: 0xff00ff, envColor: 0x440044, fog: 0x050005, times: { gold: 65, silver: 80, bronze: 100 } },
        { name: 'DESERT ROAD', color: 0xff7700, envColor: 0x442200, fog: 0x110500, times: { gold: 65, silver: 80, bronze: 100 } }
    ],


    // Racing Metrics
    lap: 1,
    totalLaps: 3,
    startTime: 0,
    bestLap: Infinity,
    timerInterval: null,

    // Configuration
    TRACK_SEGMENT_LENGTH: 100,
    CAR_MAX_SPEED: 603, // Mais 30% (464 * 1.3)
    ACCEL: 150,          // Mais 30% (116 * 1.3)
    DECEL: 75,          // Mais 30% (58 * 1.3)
    DRIFT_INTENSITY: 0.15,
    MAX_NITRO: 60,       // Duração máxima de 60 segundos
    nitroLevel: 60,      // Nível atual do nitro

    // Input
    keys: { w: false, a: false, s: false, d: false, space: false },

    init() {
        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0005);

        // Camera Setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

        // Renderer Setup
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Reduzido para dar foco às luzes neon
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Aumentado (era 0.8)
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);

        const hemLight = new THREE.HemisphereLight(0x444477, 0x111122, 0.6); // Luz de hemisfério para preencher as sombras
        this.scene.add(hemLight);

        // Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.handleKeys(e, true));
        window.addEventListener('keyup', (e) => this.handleKeys(e, false));

        // Initialize Player Car
        this.createPlayerCar();

        // Initialize Track
        this.createTrack();

        // Expose to window for global access
        window.game = this;

        this.animate();
    },

    createTrack() {
        // Cleanup existing track objects
        const toRemove = [];
        this.scene.traverse(obj => {
            if (obj.name === 'track_element') toRemove.push(obj);
        });
        toRemove.forEach(obj => this.scene.remove(obj));

        const trackLength = 10000;
        const width = 70;

        // Road Structure
        const roadGeo = new THREE.PlaneGeometry(width, trackLength);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });

        const road = new THREE.Mesh(roadGeo, roadMat);
        road.name = 'track_element';
        road.rotation.x = -Math.PI / 2;
        road.position.z = -trackLength / 2 + 100; // Shift to start at 0
        road.receiveShadow = true;
        this.scene.add(road);

        // Lines and Markings
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        // Side curbs (Zebras - Red & White)
        const curbWidth = 4;
        const curbLength = 20;
        const curbGeo = new THREE.BoxGeometry(curbWidth, 0.5, curbLength);

        for (let z = 0; z < trackLength; z += curbLength * 2) {
            // Left Zebra
            const curbL = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: 0xff3333 }));
            curbL.name = 'track_element';
            curbL.position.set(-width / 2 - curbWidth / 2, 0.25, -z);
            this.scene.add(curbL);

            const curbLWhite = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
            curbLWhite.name = 'track_element';
            curbLWhite.position.set(-width / 2 - curbWidth / 2, 0.25, -z - curbLength);
            this.scene.add(curbLWhite);

            // Right Zebra
            const curbR = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: 0xff3333 }));
            curbR.name = 'track_element';
            curbR.position.set(width / 2 + curbWidth / 2, 0.25, -z);
            this.scene.add(curbR);

            const curbRWhite = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
            curbRWhite.name = 'track_element';
            curbRWhite.position.set(width / 2 + curbWidth / 2, 0.25, -z - curbLength);
            this.scene.add(curbRWhite);
        }

        // Metal Guard Rails
        const barrierGeo = new THREE.BoxGeometry(1, 4, trackLength);
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1, roughness: 0.2 });

        const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        leftBarrier.name = 'track_element';
        leftBarrier.position.set(-width / 2 - curbWidth - 1, 2, -trackLength / 2);
        this.scene.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        rightBarrier.name = 'track_element';
        rightBarrier.position.set(width / 2 + curbWidth + 1, 2, -trackLength / 2);
        this.scene.add(rightBarrier);

        // Checkered Finish Line
        const finishGeo = new THREE.PlaneGeometry(width, 10);
        const finishCanvas = document.createElement('canvas');
        finishCanvas.width = 512;
        finishCanvas.height = 128;
        const ctx = finishCanvas.getContext('2d');
        const size = 32;
        for (let x = 0; x < finishCanvas.width; x += size) {
            for (let y = 0; y < finishCanvas.height; y += size) {
                ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, size, size);
            }
        }
        const finishTex = new THREE.CanvasTexture(finishCanvas);
        const finishMat = new THREE.MeshBasicMaterial({ map: finishTex });
        const finishLine = new THREE.Mesh(finishGeo, finishMat);
        finishLine.name = 'track_element';
        finishLine.rotation.x = -Math.PI / 2;
        finishLine.position.set(0, 0.1, 0);
        this.scene.add(finishLine);

        // Center dashed lines
        for (let z = 50; z < trackLength; z += 100) {
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 20), lineMat);
            dash.name = 'track_element';
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.05, -z);
            this.scene.add(dash);
        }

        this.createEnv(trackLength);
    },

    createEnv(length) {
        const track = this.tracks[this.currentTrackIndex];
        this.scene.background = new THREE.Color(track.fog);
        this.scene.fog = null; // DESATIVADO TOTALMENTE para garantir que nada suma na sombra

        console.log("Building high-performance optimized environment for:", track.name);

        // --- LIMPEZA E CONFIGURAÇÃO DOS MATERIAIS ---
        this.sharedAssets = {
            bodyMat: new THREE.MeshStandardMaterial({
                color: 0xffffff, // Prédio Totalmente Branco
                roughness: 0.8,
                metalness: 0.0,
                emissive: 0x000000 // Sem brilho azulado nas paredes
            }),
            winMat: new THREE.MeshBasicMaterial({ color: 0xade8ff }) // Janela Azul Claro (Light Blue)
        };
        this.sharedAssets.bodyMat.needsUpdate = true;

        // --- OPTIMIZATION: Instanced Mesh for Buildings ---
        const buildCount = 120;
        const baseGeo = new THREE.BoxGeometry(1, 1, 1);
        const instancedBuildings = new THREE.InstancedMesh(baseGeo, this.sharedAssets.bodyMat, buildCount);
        instancedBuildings.name = 'track_element';

        // --- NEW: Tower Variations (Hexagonal Skyscrapers) ---
        const towerGeo = new THREE.CylinderGeometry(0.6, 1, 1, 6); // Tapered hexagonal towers
        const towerCount = 60;
        const instancedTowers = new THREE.InstancedMesh(towerGeo, this.sharedAssets.bodyMat, towerCount);
        instancedTowers.name = 'track_element';

        // --- NEW: 6 Windows per Building ---
        const winGeo = new THREE.BoxGeometry(1, 1, 0.5);
        const instancedWindows = new THREE.InstancedMesh(winGeo, this.sharedAssets.winMat, (buildCount + towerCount) * 6);
        instancedWindows.name = 'track_element';

        // --- NEW: Antennas/Spires ---
        const spireGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
        const instancedSpires = new THREE.InstancedMesh(spireGeo, new THREE.MeshBasicMaterial({ color: 0x888888 }), buildCount + towerCount);
        instancedSpires.name = 'track_element';

        const dummy = new THREE.Object3D();
        const trackColors = [track.color, 0x00f2ff, 0xff00ff, 0xffff00];

        // 1. Regular Buildings
        for (let i = 0; i < buildCount; i++) {
            const w = 20 + Math.random() * 20;
            const h = 80 + Math.random() * 200;
            const d = 20 + Math.random() * 20;

            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (45 + Math.random() * 250); // BEM MAIS PERTO (margem de apenas 10 da pista)
            const z = -Math.random() * length;

            dummy.position.set(x, h / 2 - 5, z);
            dummy.scale.set(w, h, d);
            dummy.updateMatrix();
            instancedBuildings.setMatrixAt(i, dummy.matrix);
            instancedBuildings.setColorAt(i, new THREE.Color(0xffffff));

            // EXATAMENTE 6 JANELAS AZUL CLARO
            let winIdx = i * 6;
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 2; col++) {
                    const winW = w * 0.25;
                    const winH = h * 0.1;
                    const posX = x + (col === 0 ? -w / 4 : w / 4);
                    const posY = (h * 0.25) + (row * h * 0.25);
                    dummy.position.set(posX, posY, z + d / 2 + 0.1); // Face frontal
                    dummy.scale.set(winW, winH, 0.5);
                    dummy.updateMatrix();
                    instancedWindows.setMatrixAt(winIdx++, dummy.matrix);
                }
            }

            // Adiciona uma luz de ponto próxima a alguns prédios (Apenas Azul)
            if (i % 10 === 0) {
                const bLight = new THREE.PointLight(0x0088ff, 60, 180);
                bLight.position.set(x - (side * 20), h * 0.2, z);
                this.scene.add(bLight);
            }

            // Spire on top
            dummy.position.set(x, h, z);
            dummy.scale.set(1, 20 + Math.random() * 40, 1);
            dummy.updateMatrix();
            instancedSpires.setMatrixAt(i, dummy.matrix);

            if (i % 20 === 0) {
                const holoGeo = new THREE.PlaneGeometry(50, 40);
                const holoMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
                const holo = new THREE.Mesh(holoGeo, holoMat);
                holo.position.set(x - side * 50, h * 0.7, z);
                holo.rotation.y = Math.PI / 2;
                holo.name = 'hologram';
                this.scene.add(holo);
            }
        }

        // 2. Futuristic Towers
        for (let i = 0; i < towerCount; i++) {
            const radius = 15 + Math.random() * 15;
            const h = 150 + Math.random() * 300;

            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (80 + Math.random() * 300); // BEM MAIS PERTO
            const z = -Math.random() * length;

            dummy.position.set(x, h / 2 - 5, z);
            dummy.scale.set(radius, h, radius);
            dummy.updateMatrix();
            instancedTowers.setMatrixAt(i, dummy.matrix);
            instancedTowers.setColorAt(i, new THREE.Color(0xffffff));

            // 6 janelas azuis na frente da torre
            let towerWinIdx = (buildCount + i) * 6;
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 2; col++) {
                    const posX = x + (col === 0 ? -radius / 3 : radius / 3);
                    const posY = (h * 0.25) + (row * h * 0.25);
                    dummy.position.set(posX, posY, z + radius + 0.1);
                    dummy.scale.set(radius * 0.4, h * 0.08, 0.5);
                    dummy.updateMatrix();
                    instancedWindows.setMatrixAt(towerWinIdx++, dummy.matrix);
                }
            }

            // Spire for towers
            dummy.position.set(x, h, z);
            dummy.scale.set(2, 50 + Math.random() * 50, 2);
            dummy.updateMatrix();
            instancedSpires.setMatrixAt(buildCount + i, dummy.matrix);

            // Pulsing Ring (Aesthetically futuristic)
            if (i % 5 === 0) {
                const ringGeo = new THREE.TorusGeometry(radius * 1.5, 0.5, 8, 24);
                const ringMat = new THREE.MeshBasicMaterial({ color: trackColors[i % 4], transparent: true, opacity: 0.5 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(x, h * 0.8, z);
                ring.rotation.x = Math.PI / 2;
                ring.name = 'hologram'; // Reuse animation logic
                this.scene.add(ring);
            }
        }

        instancedBuildings.instanceMatrix.needsUpdate = true;
        instancedBuildings.instanceColor.needsUpdate = true;
        instancedBuildings.computeBoundingSphere();
        this.scene.add(instancedBuildings);

        instancedTowers.instanceMatrix.needsUpdate = true;
        instancedTowers.instanceColor.needsUpdate = true;
        instancedTowers.computeBoundingSphere();
        this.scene.add(instancedTowers);

        instancedSpires.instanceMatrix.needsUpdate = true;
        instancedSpires.computeBoundingSphere();
        this.scene.add(instancedSpires);

        instancedWindows.instanceMatrix.needsUpdate = true;
        instancedWindows.computeBoundingSphere();
        this.scene.add(instancedWindows);

        // Street Lights along the track
        for (let z = 0; z < length; z += 400) {
            [-45, 45].forEach(x => {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 30), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                post.position.set(x, 15, -z);
                post.name = 'track_element';
                this.scene.add(post);

                const lamp = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 2), new THREE.MeshBasicMaterial({ color: track.color }));
                lamp.position.set(x > 0 ? -2 : 2, 14, 0);
                post.add(lamp);

                if (z % 800 === 0) {
                    const glow = new THREE.PointLight(track.color, 40, 80);
                    glow.position.set(x > 0 ? -2 : 2, 13, 0);
                    post.add(glow);
                }
            });
        }

        // Flying Traffic (Optimized)
        for (let i = 0; i < 30; i++) {
            const traffic = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), new THREE.MeshBasicMaterial({ color: track.color }));
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (120 + Math.random() * 300);
            const z = -Math.random() * length;
            traffic.position.set(x, 60 + Math.random() * 150, z);
            traffic.name = 'track_element';
            traffic.userData = { speed: 120 + Math.random() * 50, zStart: z };
            this.scene.add(traffic);
        }

        // Update HUD (Existing)
        const msgEl = document.getElementById('hud-msg');
        if (msgEl) msgEl.innerText = track.name;
    },

    createFiatUno(color) {
        console.log("Creating Fiat Uno with color:", color);
        const unoGroup = new THREE.Group();

        // Main Boxy Body
        const bodyGeo = new THREE.BoxGeometry(4.2, 2.2, 7.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        unoGroup.add(body);

        // Cabin (Extremely Boxy)
        const cabinGeo = new THREE.BoxGeometry(3.8, 1.4, 4.2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 2.4, -0.4);
        unoGroup.add(cabin);

        // Glass
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0, metalness: 1 });
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.1), glassMat);
        windshield.position.set(0, 2.4, 1.71);
        unoGroup.add(windshield);

        // Bumper (Black Plastic)
        const bumperMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const bumper = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 0.6), bumperMat);
        bumper.position.set(0, 0.7, 3.6);
        unoGroup.add(bumper);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.7, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
        const positions = [
            [1.9, 0.8, 2.4], [-1.9, 0.8, 2.4],
            [1.9, 0.8, -2.4], [-1.9, 0.8, -2.4]
        ];
        positions.forEach(pos => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(...pos);
            unoGroup.add(w);
        });

        // HEADLIGHTS
        const hLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hLight.position.set(1.4, 1.3, 3.76);
        unoGroup.add(hLight);
        const hLight2 = hLight.clone();
        hLight2.position.set(-1.4, 1.3, 3.76);
        unoGroup.add(hLight2);

        // Ladder (The "Firma" speed boost)
        const ladderMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4), ladderMat);
        rail1.position.set(0.8, 3.2, -0.4);
        unoGroup.add(rail1);
        const rail2 = rail1.clone();
        rail2.position.set(-0.8, 3.2, -0.4);
        unoGroup.add(rail2);
        for (let k = 0; k < 6; k++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.1), ladderMat);
            step.position.set(0, 3.2, -2 + k * 0.6);
            unoGroup.add(step);
        }

        return unoGroup;
    },

    createTeamSkin(teamId, color) {
        // Base is the Fiat Uno with the team's primary color
        const teamGroup = this.createFiatUno(color);
        
        // Add a giant flag/badge to the roof
        const flagGeo = new THREE.PlaneGeometry(3, 2);
        let flagColor1, flagColor2, flagColor3;
        
        switch (teamId) {
            case 'corinthians':
                flagColor1 = 0xffffff; flagColor2 = 0x000000; flagColor3 = 0xffffff;
                break;
            case 'palmeiras':
                flagColor1 = 0x008000; flagColor2 = 0xffffff; flagColor3 = 0x008000;
                break;
            case 'saopaulo':
                flagColor1 = 0xff0000; flagColor2 = 0xffffff; flagColor3 = 0x000000;
                break;
            case 'santos':
                flagColor1 = 0xffffff; flagColor2 = 0x000000; flagColor3 = 0xffffff;
                break;
            default:
                flagColor1 = 0xffffff; flagColor2 = 0xffffff; flagColor3 = 0xffffff;
        }

        // Create a custom striped material using Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Convert hex to rgb strings
        const hexToRgb = (hex) => `rgb(${(hex >> 16) & 255}, ${(hex >> 8) & 255}, ${hex & 255})`;
        
        ctx.fillStyle = hexToRgb(flagColor1);
        ctx.fillRect(0, 0, 85, 256);
        ctx.fillStyle = hexToRgb(flagColor2);
        ctx.fillRect(85, 0, 85, 256);
        ctx.fillStyle = hexToRgb(flagColor3);
        ctx.fillRect(170, 0, 86, 256);
        
        const tex = new THREE.CanvasTexture(canvas);
        const flagMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0, 4.5, -0.4); // Placed on top of the ladder
        
        // Flag pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2), new THREE.MeshStandardMaterial({color: 0xcccccc}));
        pole.position.set(-1.4, 3.5, -0.4);
        
        teamGroup.add(flag);
        teamGroup.add(pole);
        
        return teamGroup;
    },

    createDogeRam(color) {
        console.log("Creating Doge Ram Pickup...");
        const ramGroup = new THREE.Group();

        // Huge Pickup Body
        const bodyGeo = new THREE.BoxGeometry(5.5, 2.5, 10);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.5;
        ramGroup.add(body);

        // Cab (Front part)
        const cabGeo = new THREE.BoxGeometry(5, 2, 4);
        const cab = new THREE.Mesh(cabGeo, bodyMat);
        cab.position.set(0, 3.5, 1);
        ramGroup.add(cab);

        // Bed (Flatbed / Caçamba)
        const bedGeo = new THREE.BoxGeometry(4.5, 0.5, 4.5);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(0, 2.6, -2.5);
        ramGroup.add(bed);

        // Grid / Front
        const grill = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 1 }));
        grill.position.set(0, 2, 5);
        ramGroup.add(grill);

        // Enormous Wheels
        const wheelGeo = new THREE.CylinderGeometry(1.2, 1.2, 1, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
        const wheelPos = [
            [2.4, 1.2, 3], [-2.4, 1.2, 3],
            [2.4, 1.2, -3.5], [-2.4, 1.2, -3.5]
        ];
        wheelPos.forEach(pos => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(...pos);
            ramGroup.add(w);
        });

        // Headlights
        const eyeGeo = new THREE.PlaneGeometry(1.2, 0.8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const l1 = new THREE.Mesh(eyeGeo, eyeMat);
        l1.position.set(1.8, 2.2, 5.01);
        ramGroup.add(l1);
        const l2 = l1.clone();
        l2.position.set(-1.8, 2.2, 5.01);
        ramGroup.add(l2);

        return ramGroup;
    },

    createBatmobile() {
        console.log("Creating Batmobile...");
        const batGroup = new THREE.Group();

        const blackMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.8 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 1 });
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

        // 1. Chassis (Baixo e Largo)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 12), blackMat);
        chassis.position.y = 0.6;
        batGroup.add(chassis);

        // 2. Cockpit (Estilo Jato)
        const cockpit = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3, 4, 8), blackMat);
        cockpit.rotation.x = Math.PI / 2;
        cockpit.position.set(0, 1.2, 0);
        cockpit.scale.set(1.2, 1, 0.8);
        batGroup.add(cockpit);

        const glass = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4, metalness: 1 }));
        glass.position.set(0, 1.3, 1.5);
        glass.scale.set(0.8, 0.5, 1.2);
        batGroup.add(glass);

        // 3. Wings (Aletas Traseiras)
        const wingGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0,   // base front
            0, 3, -4,  // top tip
            0, 0, -5   // base back
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        wingGeo.computeVertexNormals();

        const leftWing = new THREE.Mesh(wingGeo, blackMat);
        leftWing.position.set(2.8, 0.8, -1);
        batGroup.add(leftWing);

        const rightWing = leftWing.clone();
        rightWing.position.set(-2.8, 0.8, -1);
        batGroup.add(rightWing);

        // 4. Massive Wheels
        const tireGeo = new THREE.CylinderGeometry(1.4, 1.4, 1.2, 16);
        const rimGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.3, 16);
        const wheelPos = [
            [2.8, 1.2, 3.5], [-2.8, 1.2, 3.5], // Front
            [3.2, 1.4, -3.5], [-3.2, 1.4, -3.5] // Rear (Larger)
        ];

        wheelPos.forEach((pos, i) => {
            const tire = new THREE.Mesh(tireGeo, new THREE.MeshStandardMaterial({ color: 0x000000 }));
            if (i >= 2) tire.scale.set(1.2, 1.2, 1.2); // Bigger back tires
            tire.rotation.z = Math.PI / 2;
            tire.position.set(...pos);
            batGroup.add(tire);

            const rim = new THREE.Mesh(rimGeo, accentMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(...pos);
            batGroup.add(rim);
        });

        // 5. Turbine Exhaust
        const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 1.5, 16), accentMat);
        turbine.rotation.x = Math.PI / 2;
        turbine.position.set(0, 0.8, -6);
        batGroup.add(turbine);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 8), fireMat);
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(0, 0.8, -7.5);
        flame.name = "bat_flame";
        batGroup.add(flame);

        // 6. Front Lights (Red/Orange menacing glow)
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
        light.position.set(1.5, 0.8, 5.8);
        batGroup.add(light);
        const light2 = light.clone();
        light2.position.set(-1.5, 0.8, 5.8);
        batGroup.add(light2);

        return batGroup;
    },

    createBMW(color) {
        console.log("Creating BMW 320i...");
        const bmwGroup = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1, metalness: 0.5 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1, roughness: 0 });

        // 1. Sleek Body (Main Chassis)
        const bodyGeo = new THREE.BoxGeometry(4.2, 1.2, 9);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        bmwGroup.add(body);

        // 2. Cabin (Aerodynamic)
        const cabinGeo = new THREE.BoxGeometry(3.8, 1.1, 4.5);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.set(0, 1.8, -0.5);
        bmwGroup.add(cabin);

        // 3. Windows
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), glassMat);
        windshield.rotation.x = -Math.PI / 4;
        windshield.position.set(0, 1.8, 1.8);
        bmwGroup.add(windshield);

        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 3.8), glassMat);
        sideWindow.position.set(0, 1.8, -0.5);
        bmwGroup.add(sideWindow);

        // 4. Front Hood (Capô inclinado)
        const hoodGeo = new THREE.BoxGeometry(4.2, 0.4, 2);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.rotation.x = -0.15;
        hood.position.set(0, 1.3, 3.5);
        bmwGroup.add(hood);

        // 5. BMW Kidneys (Grade frontal icônica)
        const kidneyGeo = new THREE.BoxGeometry(0.8, 0.5, 0.1);
        const kidneyL = new THREE.Mesh(kidneyGeo, blackMat);
        kidneyL.position.set(0.5, 0.9, 4.51);
        bmwGroup.add(kidneyL);
        const kidneyR = kidneyL.clone();
        kidneyR.position.set(-0.5, 0.9, 4.51);
        bmwGroup.add(kidneyR);

        // 6. Wheels (Sport Rims)
        const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
        const wheelPos = [
            [1.9, 0.9, 2.8], [-1.9, 0.9, 2.8], // Front
            [1.9, 0.9, -2.8], [-1.9, 0.9, -2.8] // Rear
        ];
        wheelPos.forEach(pos => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(...pos);
            bmwGroup.add(w);

            // Rim Detail
            const rim = new THREE.Mesh(new THREE.CircleGeometry(0.6, 5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            rim.position.set(pos[0] * 1.05, pos[1], pos[2]);
            rim.rotation.y = pos[0] > 0 ? Math.PI / 2 : -Math.PI / 2;
            bmwGroup.add(rim);
        });

        // 7. Headlights (LED style)
        const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const h1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.1), ledMat);
        h1.position.set(1.4, 1.1, 4.51);
        bmwGroup.add(h1);
        const h2 = h1.clone();
        h2.position.set(-1.4, 1.1, 4.51);
        bmwGroup.add(h2);

        return bmwGroup;
    },

    createCube(color) {
        console.log("Creating The Supreme Cube...");
        const cubeGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            metalness: 1,
            roughness: 0
        });
        const cube = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), mat);
        cube.position.y = 3;
        cubeGroup.add(cube);

        // Glow effect
        const glow = new THREE.Mesh(new THREE.BoxGeometry(6.5, 6.5, 6.5),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.1 }));
        glow.position.y = 3;
        cubeGroup.add(glow);

        return cubeGroup;
    },

    createMcQueen() {
        console.log("Creating Lightning McQueen...");
        const mcqGroup = new THREE.Group();

        const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.2 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0 });

        // 1. Lower Body (Aerodynamic)
        const bodyGeo = new THREE.BoxGeometry(4.5, 1.2, 9);
        const body = new THREE.Mesh(bodyGeo, redMat);
        body.position.y = 0.8;
        mcqGroup.add(body);

        // 2. Cabin
        const cabinGeo = new THREE.BoxGeometry(4, 1, 4);
        const cabin = new THREE.Mesh(cabinGeo, redMat);
        cabin.position.set(0, 1.8, -0.5);
        mcqGroup.add(cabin);

        // 3. Eyes (Windshield)
        const eyeGeo = new THREE.PlaneGeometry(3.6, 0.8);
        const eyes = new THREE.Mesh(eyeGeo, glassMat);
        eyes.rotation.x = -Math.PI / 6;
        eyes.position.set(0, 1.8, 1.4);
        mcqGroup.add(eyes);

        // Pupils
        const pupilGeo = new THREE.CircleGeometry(0.15, 8);
        const p1 = new THREE.Mesh(pupilGeo, blackMat);
        p1.position.set(0.8, 1.82, 1.41);
        p1.rotation.x = -Math.PI / 6;
        mcqGroup.add(p1);
        const p2 = p1.clone();
        p2.position.set(-0.8, 1.82, 1.41);
        mcqGroup.add(p2);

        // 4. Lightning Bolts (Sides)
        const boltGeo = new THREE.BoxGeometry(0.1, 0.8, 4);
        const boltL = new THREE.Mesh(boltGeo, yellowMat);
        boltL.position.set(2.26, 1, 0);
        boltL.rotation.z = 0.2;
        mcqGroup.add(boltL);
        const boltR = boltL.clone();
        boltR.position.set(-2.26, 1, 0);
        boltR.rotation.z = -0.2;
        mcqGroup.add(boltR);

        // 5. Spoiler (Traseira)
        const spoilerV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.5), redMat);
        spoilerV.position.set(1.8, 1.8, -4);
        mcqGroup.add(spoilerV);
        const spoilerVR = spoilerV.clone();
        spoilerVR.position.set(-1.8, 1.8, -4);
        mcqGroup.add(spoilerVR);
        const spoilerH = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 1.2), redMat);
        spoilerH.position.set(0, 2.3, -4);
        mcqGroup.add(spoilerH);

        // 6. Wheels (Racing Tires)
        const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 16);
        const wheelPos = [
            [2, 0.9, 2.8], [-2, 0.9, 2.8], // Front
            [2, 0.9, -2.8], [-2, 0.9, -2.8] // Rear
        ];
        wheelPos.forEach(pos => {
            const w = new THREE.Mesh(wheelGeo, blackMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(...pos);
            mcqGroup.add(w);

            // Red Rim
            const rim = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), redMat);
            rim.position.set(pos[0] * 1.05, pos[1], pos[2]);
            rim.rotation.y = pos[0] > 0 ? Math.PI / 2 : -Math.PI / 2;
            mcqGroup.add(rim);
        });

        return mcqGroup;
    },

    createFerrariF40(color) {
        console.log("Creating Ferrari F40...");
        const f40Group = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1, metalness: 0.4 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0 });

        // 1. Low Body (Base)
        const baseGeo = new THREE.BoxGeometry(4.5, 0.8, 10);
        const base = new THREE.Mesh(baseGeo, bodyMat);
        base.position.y = 0.4;
        f40Group.add(base);

        // 2. Tapered Front (Cunha)
        const wedgeGeo = new THREE.BoxGeometry(4.5, 0.5, 4);
        const wedge = new THREE.Mesh(wedgeGeo, bodyMat);
        wedge.rotation.x = -0.15;
        wedge.position.set(0, 0.8, 3);
        f40Group.add(wedge);

        // 3. Cabin (Squareish)
        const cabinGeo = new THREE.BoxGeometry(4, 1.2, 4);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.set(0, 1.4, -0.5);
        f40Group.add(cabin);

        // Windshield
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), glassMat);
        windshield.rotation.x = -Math.PI / 3.5;
        windshield.position.set(0, 1.4, 1.5);
        f40Group.add(windshield);

        // Rear window (Lexan slats)
        const rearWin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 3), glassMat);
        rearWin.rotation.x = 0.2;
        rearWin.position.set(0, 1.3, -2.5);
        f40Group.add(rearWin);

        // 4. ICONIC REAR WING
        const wingPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.2), bodyMat);
        wingPillarL.position.set(2.1, 1.2, -4.4);
        f40Group.add(wingPillarL);
        const wingPillarR = wingPillarL.clone();
        wingPillarR.position.set(-2.1, 1.2, -4.4);
        f40Group.add(wingPillarR);
        const wingMain = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 1.4), bodyMat);
        wingMain.position.set(0, 1.95, -4.4);
        f40Group.add(wingMain);

        // 5. Triple Exhaust (Unique F40 feature)
        const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1, roughness: 0.2 });
        const pipeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
        for (let j = -1; j <= 1; j++) {
            const pipe = new THREE.Mesh(pipeGeo, exhaustMat);
            pipe.rotation.x = Math.PI / 2;
            pipe.position.set(j * 0.4, 0.4, -5.05);
            f40Group.add(pipe);
        }

        // 6. Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.9, 16);
        const wheelPos = [
            [1.95, 0.85, 3.2], [-1.95, 0.85, 3.2], // Front
            [2.05, 0.95, -3], [-2.05, 0.95, -3]  // Rear (Slightly larger/wider)
        ];
        wheelPos.forEach((pos, i) => {
            const w = new THREE.Mesh(wheelGeo, blackMat);
            if (i >= 2) w.scale.set(1.1, 1, 1.1);
            w.rotation.z = Math.PI / 2;
            w.position.set(...pos);
            f40Group.add(w);

            // Rim (Star pattern simple)
            const rim = new THREE.Mesh(new THREE.CircleGeometry(0.6, 5), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
            rim.position.set(pos[0] * 1.05, pos[1], pos[2]);
            rim.rotation.y = pos[0] > 0 ? Math.PI / 2 : -Math.PI / 2;
            f40Group.add(rim);
        });

        // 7. POP-UP HEADLIGHTS (Closed)
        const lightGeo = new THREE.BoxGeometry(1.2, 0.1, 1);
        const l1 = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: color }));
        l1.position.set(1.4, 0.95, 4.3);
        f40Group.add(l1);
        const l2 = l1.clone();
        l2.position.set(-1.4, 0.95, 4.3);
        f40Group.add(l2);

        // Rear Lights (Classic round)
        const rLightGeo = new THREE.CircleGeometry(0.3, 16);
        const rLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const rl1 = new THREE.Mesh(rLightGeo, rLightMat);
        rl1.position.set(1.6, 0.6, -5.01);
        rl1.rotation.y = Math.PI;
        f40Group.add(rl1);
        const rl2 = rl1.clone();
        rl2.position.set(-1.6, 0.6, -5.01);
        f40Group.add(rl2);

        return f40Group;
    },

    createPlayerCar() {
        // Get selected skin color and ID from economy
        const selectedId = typeof economy !== 'undefined' ? economy.selectedSkin : 'default';
        const skinColor = typeof economy !== 'undefined' ? economy.getSelectedSkinColor() : 0x00f2ff;

        let carGroup;
        if (selectedId === 'dogeram') {
            carGroup = this.createDogeRam(skinColor);
        } else if (selectedId === 'bmw320i') {
            carGroup = this.createBMW(skinColor);
        } else if (selectedId === 'batmobile') {
            carGroup = this.createBatmobile();
        } else if (selectedId === 'the_cube') {
            carGroup = this.createCube(skinColor);
        } else if (selectedId === 'mcqueen') {
            carGroup = this.createMcQueen();
        } else if (selectedId === 'ferrari_f40') {
            carGroup = this.createFerrariF40(skinColor);
        } else if (selectedId === 'corinthians' || selectedId === 'palmeiras' || selectedId === 'saopaulo' || selectedId === 'santos') {
            carGroup = this.createTeamSkin(selectedId, skinColor);
        } else {
            carGroup = this.createFiatUno(skinColor);
        }

        // Glowing Nitro Exhaust (Added to the car group)
        const nitroGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const nitroMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
        const nitro = new THREE.Mesh(nitroGeo, nitroMat);
        nitro.name = "nitro_flame";
        nitro.position.set(0, 0.8, -4);
        nitro.visible = false;
        carGroup.add(nitro);

        this.playerCar = {
            mesh: carGroup,
            speed: 0,
            xPos: 0,
            zPos: 0,
            angle: 0,
            effects: { nitro: 1, accel: 1, grip: 1, maxSpeed: 1, handling: 1, stability: 1, brake: 1, drift: 1 }
        };
        this.scene.add(carGroup);
    },

    createOpponents() {
        this.opponents.forEach(opp => this.scene.remove(opp.mesh));
        this.opponents = [];

        const colors = [0xff3333, 0x33ff33, 0xffff33, 0xff33ff, 0xffffff];

        for (let i = 0; i < 5; i++) {
            // Variety in opponent skins
            let oppGroup;
            if (i === 0) oppGroup = this.createBMW(0xdddddd);
            else if (i === 1) oppGroup = this.createFerrariF40(0xff3333);
            else oppGroup = this.createFiatUno(colors[i]);

            // Glowing Nitro Exhaust for opponent
            const nitroGeo = new THREE.SphereGeometry(0.5, 8, 8);
            const nitroMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // Laranja/amarelo para diferir
            const nitro = new THREE.Mesh(nitroGeo, nitroMat);
            nitro.name = "nitro_flame";
            nitro.position.set(0, 0.8, -4);
            nitro.visible = false;
            oppGroup.add(nitro);

            // Grid layout: All start at speed 0, in a 2-lane grid
            const x = (i % 2 === 0 ? -18 : 18);
            const z = -10 - (Math.floor(i / 2) * 15); // Slightly behind player who is at 0

            oppGroup.position.set(x, 0, z);
            this.opponents.push({
                mesh: oppGroup,
                speed: 0,
                targetSpeed: (160 + Math.random() * 50) * 2.31,
                accel: (25 + Math.random() * 15) * 2.31,
                xPos: x,
                zPos: z,
                targetX: x,
                sideSpeed: 10 + Math.random() * 15,
                laneTimer: Math.random() * 2,
                lap: 1
            });
            this.scene.add(oppGroup);
        }
    },

    handleKeys(e, isDown) {
        const key = e.code;
        if (key === 'ArrowUp' || key === 'KeyW') this.keys.w = isDown;
        if (key === 'ArrowDown' || key === 'KeyS') this.keys.s = isDown;
        if (key === 'ArrowLeft' || key === 'KeyA') this.keys.a = isDown;
        if (key === 'ArrowRight' || key === 'KeyD') this.keys.d = isDown;
        if (key === 'Space') this.keys.space = isDown;
    },

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    startRace() {
        this.currentState = 'race';
        this.isRunning = true;

        // Play Background Music (Lo-Fi)
        const music = document.getElementById('bg-music');
        if (music) {
            music.volume = 0.4; // Lofi volume suave
            music.play().catch(e => console.log("Music autoplay blocked, waiting for interaction."));
        }

        // Re-create player car with current skin
        if (this.playerCar) {
            this.scene.remove(this.playerCar.mesh);
        }
        this.createPlayerCar();

        // Load Economy Effects
        this.playerCar.effects = economy.getCombinedEffects();

        // Update Time Objectives UI
        const currentTrack = this.tracks[this.currentTrackIndex];
        const formatTime = (sec) => {
            const m = Math.floor(sec / 60).toString().padStart(2, '0');
            const s = (sec % 60).toString().padStart(2, '0');
            return `${m}:${s}.00`;
        };
        if (document.getElementById('obj-gold')) {
            document.getElementById('obj-gold').innerText = formatTime(currentTrack.times.gold);
            document.getElementById('obj-silver').innerText = formatTime(currentTrack.times.silver);
            document.getElementById('obj-bronze').innerText = formatTime(currentTrack.times.bronze);
        }

        // UI transitions
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('skin-screen').classList.add('hidden');
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('hud-speed').classList.remove('hidden');

        // Reset Car State
        this.playerCar.speed = 0;
        this.playerCar.zPos = 0;
        this.playerCar.xPos = 0;
        this.playerCar.mesh.position.set(0, 1, 0);

        this.createOpponents();
        this.nitroLevel = this.MAX_NITRO; // Reset Nitro
        this.startTimer();
    },


    startTimer(reset = true) {
        if (reset) {
            this.startTime = Date.now();
        }
        
        this.timerInterval = setInterval(() => {
            const delta = Date.now() - this.startTime;
            const minutes = Math.floor(delta / 60000);
            const seconds = Math.floor((delta % 60000) / 1000);
            const ms = Math.floor((delta % 1000) / 10);
            document.getElementById('hud-timer').innerText =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }, 30);
    },

    update(delta) {
        if (!this.isRunning || this.isPaused) return;

        // Player Movement
        const effects = this.playerCar.effects;
        const maxSpeed = this.CAR_MAX_SPEED * effects.maxSpeed;
        const accel = this.ACCEL * effects.accel;

        if (this.keys.w) {
            this.playerCar.speed += accel * delta;
        } else if (this.keys.s) {
            this.playerCar.speed -= this.DECEL * 2 * (effects.brake || 1.0) * delta;
        } else {
            this.playerCar.speed -= this.DECEL * delta;
        }

        // Nitro Boost
        const nitroFlame = this.playerCar.mesh.getObjectByName("nitro_flame");
        if (this.keys.space && this.playerCar.speed > 0 && this.nitroLevel > 0) {
            this.playerCar.speed += (accel * 5 * effects.nitro * delta);
            this.nitroLevel -= delta; // Consome o nitro
            if (nitroFlame) {
                nitroFlame.visible = true;
                nitroFlame.scale.setScalar(1 + Math.random() * 0.5); // Flame flicker
            }
        } else {
            if (nitroFlame) nitroFlame.visible = false;
        }

        // Update Nitro HUD
        const nitroBar = document.getElementById('nitro-bar');
        if (nitroBar) {
            const nitroPercent = Math.max(0, (this.nitroLevel / this.MAX_NITRO) * 100);
            nitroBar.style.width = `${nitroPercent}%`;
            // Visual feedback when empty
            nitroBar.style.boxShadow = nitroPercent > 0 ? '0 0 20px #ff00ff' : 'none';
        }

        // Clamp Speed
        this.playerCar.speed = Math.min(Math.max(this.playerCar.speed, 0), maxSpeed);

        // Steering
        if (this.playerCar.speed > 5) {
            const handling = effects.handling;
            const driftPenalty = this.playerCar.speed > 200 ? (1.0 / (effects.stability || 1.0)) : 1.0;

            // Lateral Speed scales with forward speed (10% as requested)
            const lateralSpeed = this.playerCar.speed * 0.10;

            if (this.keys.a) this.playerCar.xPos -= lateralSpeed * handling * driftPenalty * delta;
            if (this.keys.d) this.playerCar.xPos += lateralSpeed * handling * driftPenalty * delta;

            // Apply Drift Logic
            if (this.playerCar.speed > 100 && (this.keys.a || this.keys.d)) {
                const gripFactor = 1.0 / (effects.grip || 1.0);
                const driftWeight = lateralSpeed * this.DRIFT_INTENSITY * (effects.drift || 1) * gripFactor;
                this.playerCar.xPos += (this.keys.a ? -driftWeight : driftWeight) * delta;
            }
        }

        // Road Boundaries
        this.playerCar.xPos = Math.min(Math.max(this.playerCar.xPos, -28), 28);

        // Continuous Track
        const trackLength = 10000;
        this.playerCar.zPos -= this.playerCar.speed * delta;

        // Lap Logic (Modulo track length)
        if (Math.abs(this.playerCar.zPos) >= trackLength) {
            this.playerCar.zPos = 0;
            this.playerCar.mesh.position.z = 0; // Snap to start
            this.lap++;

            // Recompensa por volta completada
            if (typeof economy !== 'undefined') {
                economy.addCoins(200);
                console.log("Lap complete! +200 coins");
            }

            if (this.lap > this.totalLaps) {
                this.finishRace();
            } else {
                document.getElementById('hud-lap').innerText = `${this.lap}/3`;
            }
        }

        // Batmobile Turbine Flame Effect
        const batFlame = this.playerCar.mesh.getObjectByName("bat_flame");
        if (batFlame) {
            if (this.keys.w && this.playerCar.speed > 10) {
                batFlame.visible = true;
                batFlame.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.8, 1 + Math.random() * 0.4);
            } else {
                batFlame.visible = false;
            }
        }

        // Update Mesh
        this.playerCar.mesh.position.z = this.playerCar.zPos;
        this.playerCar.mesh.position.x = this.playerCar.xPos;
        this.playerCar.mesh.rotation.y = -(this.keys.a ? 0.1 : (this.keys.d ? -0.1 : 0));

        // Update Camera
        this.camera.position.set(this.playerCar.xPos * 0.5, 10, this.playerCar.zPos + 25);
        this.camera.lookAt(new THREE.Vector3(this.playerCar.xPos, 0, this.playerCar.zPos - 50));

        // Update AI
        this.opponents.forEach(opp => {
            let currentTargetSpeed = opp.targetSpeed;
            const nitroFlame = opp.mesh.getObjectByName("nitro_flame");
            
            // Booster até o meio da volta (metade do trackLength)
            if (this.isRunning && Math.abs(opp.zPos) < trackLength / 2) {
                currentTargetSpeed = opp.targetSpeed * 1.5; // Ficam bem mais rápidos
                
                // Aceleração turbinada
                if (opp.speed < currentTargetSpeed) {
                    opp.speed += (opp.accel * 2.5) * delta;
                }
                
                if (nitroFlame) {
                    nitroFlame.visible = true;
                    nitroFlame.scale.setScalar(1 + Math.random() * 0.5); // Fogo piscando
                }
            } else {
                if (nitroFlame) nitroFlame.visible = false;
                
                // Desacelerar caso tenha passado da zona de boost, ou acelerar normalmente
                if (opp.speed > opp.targetSpeed) {
                    opp.speed -= (opp.accel * 0.5) * delta;
                } else if (this.isRunning && opp.speed < opp.targetSpeed) {
                    opp.speed += opp.accel * delta;
                }
            }

            opp.zPos -= opp.speed * delta;

            // IA: Movimentação Lateral
            opp.laneTimer -= delta;
            if (opp.laneTimer <= 0) {
                opp.targetX = (Math.random() - 0.5) * 52; // Range da pista
                opp.laneTimer = 3 + Math.random() * 5;
            }

            const dx = opp.targetX - opp.xPos;
            if (Math.abs(dx) > 0.5) {
                const moveAmount = opp.sideSpeed * delta;
                const step = Math.sign(dx) * Math.min(Math.abs(dx), moveAmount);
                opp.xPos += step;
                opp.mesh.rotation.y = Math.sign(dx) * 0.1; // Inclina para o lado que está indo
            } else {
                opp.mesh.rotation.y = 0;
            }

            // Bot Lap Logic
            if (Math.abs(opp.zPos) >= trackLength) {
                opp.zPos = 0;
                opp.lap++;
            }

            opp.mesh.position.z = opp.zPos;
            opp.mesh.position.x = opp.xPos;

            // Basic Collision Check
            const dist = this.playerCar.mesh.position.distanceTo(opp.mesh.position);
            if (dist < 6) {
                this.playerCar.speed *= 0.8;
                opp.speed *= 0.9;
                console.log('COLLISION!');
            }
        });

        // Update Flying Traffic & Animations
        this.scene.traverse(obj => {
            if (obj.userData.speed) {
                obj.position.z += obj.userData.speed * delta;
                if (obj.position.z > 100) obj.position.z = obj.userData.zStart;
            }
            if (obj.name === "hologram") {
                obj.position.y += Math.sin(Date.now() * 0.002) * 0.1;
                obj.rotation.y += 0.005;
            }
            if (obj.name === "blinking_light") {
                obj.visible = Math.floor(Date.now() / 500) % 2 === 0;
            }
        });

        // Update HUD Speed (Guaranteed update)
        const speedEl = document.getElementById('speed-val');
        if (speedEl) {
            const currentSpeed = Math.floor(this.playerCar.speed);
            speedEl.textContent = currentSpeed.toString().padStart(3, '0');

            // Force HUD visibility during race
            const hudSpeed = document.getElementById('hud-speed');
            if (hudSpeed && hudSpeed.classList.contains('hidden')) {
                hudSpeed.classList.remove('hidden');
            }
        }

        // Accurate Position Tracking (Laps + Progress)
        const trackLen = 10000;
        let pos = 1;
        const playerProgress = (this.lap - 1) * trackLen + Math.abs(this.playerCar.zPos);

        this.opponents.forEach(opp => {
            const oppProgress = (opp.lap - 1) * trackLen + Math.abs(opp.zPos);
            if (oppProgress > playerProgress) pos++;
        });
        document.getElementById('hud-pos').innerText = `${pos}/6`;
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    },

    finishRace() {
        this.isRunning = false;
        clearInterval(this.timerInterval);

        const delta = Date.now() - this.startTime;
        const totalSeconds = delta / 1000;
        const currentTrack = this.tracks[this.currentTrackIndex];

        let timeBonus = 0;
        let starEarned = "";
        if (totalSeconds <= currentTrack.times.gold) {
            timeBonus = 1000;
            starEarned = "⭐⭐⭐ (Ouro)";
        } else if (totalSeconds <= currentTrack.times.silver) {
            timeBonus = 500;
            starEarned = "⭐⭐ (Prata)";
        } else if (totalSeconds <= currentTrack.times.bronze) {
            timeBonus = 200;
            starEarned = "⭐ (Bronze)";
        } else {
            timeBonus = 0;
            starEarned = "(Tempo Superior ao Bronze)";
        }

        const trackLen = 10000;
        let finalPos = 1;
        const playerProgress = (this.totalLaps) * trackLen; // Player just finished

        this.opponents.forEach(opp => {
            const oppProgress = (opp.lap - 1) * trackLen + Math.abs(opp.zPos);
            if (oppProgress > playerProgress) finalPos++;
        });

        // REWARDS
        const positionReward = Math.max(0, 1000 - (finalPos - 1) * 200);
        const mandatoryBonus = 200; // OBRIGATÓRIO: Ganha sempre que termina
        const totalReward = positionReward + mandatoryBonus + timeBonus;

        if (typeof economy !== 'undefined') {
            economy.incrementRacesCount();
            economy.addCoins(totalReward);
        } else {
            console.log("Economy is not defined. Reward not added.");
        }

        this.showLeaderboard(finalPos, totalReward, starEarned, timeBonus);
    },

    showLeaderboard(playerPos, reward, starEarned, timeBonus) {
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('hud-speed').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');

        // Atualizar o título para mostrar os objetivos
        const titleEl = document.getElementById('final-result-title');
        if (titleEl) {
            titleEl.innerHTML = `RESULTADOS DA CORRIDA<br>
                <div style="font-size: 1rem; color: #ffd700; margin-top: 10px; text-shadow: none; font-weight: bold; font-family: sans-serif;">
                    Objetivo Concluído: ${starEarned || "Nenh"} <span style="color: var(--success); margin-left: 10px;">+${timeBonus || 0} 🪙</span>
                </div>`;
        }

        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';

        // Generic AI times for flair
        const contestants = [
            { name: `VOCÊ (${economy.selectedTitle})`, pos: playerPos, time: document.getElementById('hud-timer').innerText, reward: reward },
            { name: 'Drift King (Pro)', pos: playerPos === 1 ? 2 : 1, time: '01:12.45', reward: playerPos === 1 ? 800 : 1000 },
            { name: 'Neon Bolt (Racer)', pos: 3, time: '01:15.20', reward: 600 },
            { name: 'Cyber Rogue (Hack)', pos: 4, time: '01:18.10', reward: 400 },
            { name: 'Speed Demon (Evil)', pos: 5, time: '01:21.05', reward: 200 },
            { name: 'Turbo Titan (Boss)', pos: 6, time: '01:25.88', reward: 0 }
        ];

        contestants.sort((a, b) => a.pos - b.pos);

        contestants.forEach(c => {
            const tr = document.createElement('tr');
            if (c.name === 'VOCÊ') tr.className = 'highlight';
            tr.innerHTML = `
                <td>${c.pos}º</td>
                <td>${c.name}</td>
                <td>${c.time}</td>
                <td>${c.reward}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    showShop() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.remove('hidden');
        economy.updateUI();
    },

    hideShop() {
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    showSkins() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('skin-screen').classList.remove('hidden');
        economy.updateSkinsUI();
    },

    hideSkins() {
        document.getElementById('skin-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    goToMenu() {
        console.log("Returning to menu...");
        try {
            this.isRunning = false;
            this.isPaused = false;
            this.currentState = 'menu';
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }

            const btnPause = document.getElementById('btn-pause');
            if (btnPause) btnPause.innerText = "PAUSAR";

            // Stop sounds/Reset volume
            const music = document.getElementById('bg-music');
            if (music) music.volume = 0.2;

            // Cleanup opponents
            if (this.opponents) {
                this.opponents.forEach(opp => {
                    if (opp.mesh && opp.mesh.parent) {
                        this.scene.remove(opp.mesh);
                    }
                });
                this.opponents = [];
            }

            // Hide all UI screens safely
            const screens = [
                'hud', 'hud-speed', 'results-screen', 'skin-screen', 
                'objective-screen', 'credits-screen', 'shop-screen', 'battlepass-screen'
            ];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) mainMenu.classList.remove('hidden');

            // Force update UI
            if (typeof economy !== 'undefined') {
                economy.updateUI();
            }
        } catch (err) {
            console.error("Critical error in goToMenu:", err);
            // Emergency fallback: just show the menu if everything else fails
            const menu = document.getElementById('main-menu');
            if (menu) menu.classList.remove('hidden');
        }
    },
    
    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        
        const btn = document.getElementById('btn-pause');
        if (this.isPaused) {
            if (btn) btn.innerText = "RETOMAR";
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
        } else {
            if (btn) btn.innerText = "PAUSAR";
            // Retomar timer recalculando "startTime" subtraindo o tempo já decorrido para evitar saltos.
            // Para ser simples e já que o text formatado do timer tem os mm:ss.ms
            // Nós podemos adaptar salvando algo como:
            // This could be improved, but for now we'll do a simple offset workaround
            const timerTxt = document.getElementById('hud-timer').innerText;
            const parts = timerTxt.match(/(\d+):(\d+)\.(\d+)/);
            if (parts) {
               const m = parseInt(parts[1], 10);
               const s = parseInt(parts[2], 10);
               const ms = parseInt(parts[3], 10);
               const totalDelta = m * 60000 + s * 1000 + ms * 10;
               this.startTime = Date.now() - totalDelta;
               this.startTimer(false); // don't write new Date.now() to startTime
            }
        }
    },

    showCredits() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('credits-screen').classList.remove('hidden');
    },

    hideCredits() {
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    showObjectives() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('objective-screen').classList.remove('hidden');
        economy.updateObjectivesUI();
    },

    hideObjectives() {
        document.getElementById('objective-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }
};

// Start Engine
game.init();
