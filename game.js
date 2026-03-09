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
    currentState: 'menu',
    playerCar: null,
    opponents: [],
    track: [],
    currentTrackIndex: 0,
    tracks: [
        { name: 'SÃO PAULO 2077', color: 0x00f2ff, envColor: 0x004444, fog: 0x000000 },
        { name: 'CYBER NORTH', color: 0xff00ff, envColor: 0x440044, fog: 0x050005 },
        { name: 'DESERT ROAD', color: 0xff7700, envColor: 0x442200, fog: 0x110500 }
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

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

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
        this.scene.fog = new THREE.FogExp2(track.fog, 0.0008);

        console.log("Building high-performance optimized environment for:", track.name);

        // --- OPTIMIZATION: Share Textures and Materials ---
        if (!this.sharedAssets) {
            const winCanvas = document.createElement('canvas');
            winCanvas.width = 128; winCanvas.height = 128;
            const wCtx = winCanvas.getContext('2d');
            wCtx.fillStyle = '#050505'; wCtx.fillRect(0, 0, 128, 128);
            const winColors = [0x00f2ff, 0xff00ff, 0xffff00, 0xffffff];
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 16; j++) {
                    if (Math.random() > 0.3) {
                        const c = winColors[Math.floor(Math.random() * winColors.length)];
                        wCtx.globalAlpha = 0.5; wCtx.fillStyle = `#${c.toString(16).padStart(6, '0')}`;
                        wCtx.fillRect(i * 16 + 2, j * 8 + 2, 12, 4);
                    }
                }
            }
            const winTex = new THREE.CanvasTexture(winCanvas);
            winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;

            this.sharedAssets = {
                winTex,
                bodyMat: new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.2, metalness: 0.8 }),
                winMat: new THREE.MeshLambertMaterial({ map: winTex, emissive: 0xffffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 })
            };
        }

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

        // --- NEW: Antennas/Spires ---
        const spireGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
        const instancedSpires = new THREE.InstancedMesh(spireGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), buildCount + towerCount);
        instancedSpires.name = 'track_element';

        const dummy = new THREE.Object3D();
        const trackColors = [track.color, 0x00f2ff, 0xff00ff, 0xffff00];

        // 1. Regular Buildings
        for (let i = 0; i < buildCount; i++) {
            const w = 20 + Math.random() * 20;
            const h = 80 + Math.random() * 200;
            const d = 20 + Math.random() * 20;

            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (80 + Math.random() * 320);
            const z = -Math.random() * length;

            dummy.position.set(x, h / 2 - 5, z);
            dummy.scale.set(w, h, d);
            dummy.updateMatrix();
            instancedBuildings.setMatrixAt(i, dummy.matrix);

            // Spire on top
            dummy.position.set(x, h, z);
            dummy.scale.set(1, 20 + Math.random() * 40, 1);
            dummy.updateMatrix();
            instancedSpires.setMatrixAt(i, dummy.matrix);

            // Neon strip
            const neonMat = new THREE.MeshBasicMaterial({ color: trackColors[i % 4] });
            const neon = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.5), neonMat);
            neon.position.set(x + (w / 2 * side), h / 2 - 5, z);
            neon.name = 'track_element';
            this.scene.add(neon);

            if (i % 15 === 0) {
                const holoGeo = new THREE.PlaneGeometry(50, 40);
                const holoMat = new THREE.MeshBasicMaterial({ color: trackColors[Math.floor(Math.random() * 4)], transparent: true, opacity: 0.3, side: THREE.DoubleSide });
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
            const x = side * (150 + Math.random() * 400);
            const z = -Math.random() * length;

            dummy.position.set(x, h / 2 - 5, z);
            dummy.scale.set(radius, h, radius);
            dummy.updateMatrix();
            instancedTowers.setMatrixAt(i, dummy.matrix);

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

        this.scene.add(instancedBuildings);
        this.scene.add(instancedTowers);
        this.scene.add(instancedSpires);

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

            // Grid layout: All start at speed 0, in a 2-lane grid
            const x = (i % 2 === 0 ? -18 : 18);
            const z = -10 - (Math.floor(i / 2) * 15); // Slightly behind player who is at 0

            oppGroup.position.set(x, 0, z);
            this.opponents.push({
                mesh: oppGroup,
                speed: 0,
                targetSpeed: (160 + Math.random() * 50) * 2.1, // Mais 30% (1.6 * 1.3 ≈ 2.1)
                accel: (25 + Math.random() * 15) * 2.1,       // Mais 30%
                xPos: x,
                zPos: z,
                lap: 1 // Start at lap 1 like player
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


    startTimer() {
        const start = Date.now();
        this.startTime = start;
        this.timerInterval = setInterval(() => {
            const delta = Date.now() - start;
            const minutes = Math.floor(delta / 60000);
            const seconds = Math.floor((delta % 60000) / 1000);
            const ms = Math.floor((delta % 1000) / 10);
            document.getElementById('hud-timer').innerText =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }, 30);
    },

    update(delta) {
        if (!this.isRunning) return;

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
            // Accelerate to target speed
            if (this.isRunning && opp.speed < opp.targetSpeed) {
                opp.speed += opp.accel * delta;
            }

            opp.zPos -= opp.speed * delta;

            // Bot Lap Logic
            const trackLength = 10000;
            if (Math.abs(opp.zPos) >= trackLength) {
                opp.zPos = 0;
                opp.lap++;
            }

            opp.mesh.position.z = opp.zPos;

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
        const totalReward = positionReward + mandatoryBonus;

        economy.addCoins(totalReward);

        this.showLeaderboard(finalPos, totalReward);
    },

    showLeaderboard(playerPos, reward) {
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('hud-speed').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');

        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';

        // Generic AI times for flair
        const contestants = [
            { name: 'VOCÊ', pos: playerPos, time: document.getElementById('hud-timer').innerText, reward: reward },
            { name: 'Drift King', pos: playerPos === 1 ? 2 : 1, time: '01:12.45', reward: playerPos === 1 ? 800 : 1000 },
            { name: 'Neon Bolt', pos: 3, time: '01:15.20', reward: 600 },
            { name: 'Cyber Rogue', pos: 4, time: '01:18.10', reward: 400 },
            { name: 'Speed Demon', pos: 5, time: '01:21.05', reward: 200 },
            { name: 'Turbo Titan', pos: 6, time: '01:25.88', reward: 0 }
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
        this.lap = 1;

        // Lower music volume for menu
        const music = document.getElementById('bg-music');
        if (music) music.volume = 0.2;

        // Switch track for next round
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.createTrack(); // Rebuild track for new environment

        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('skin-screen').classList.add('hidden');
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        economy.updateUI();
    },

    showCredits() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('credits-screen').classList.remove('hidden');
    },

    hideCredits() {
        document.getElementById('credits-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }
};

// Start Engine
game.init();
