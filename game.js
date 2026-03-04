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
        { name: 'DESERT ROAD', color: 0xff7700, envColor: 0x442200, fog: 0x110500 },
        { name: 'RIO DE JANEIRO', color: 0xffff00, envColor: 0x0088ff, fog: 0x004488 }
    ],


    // Racing Metrics
    lap: 1,
    totalLaps: 3,
    startTime: 0,
    bestLap: Infinity,
    timerInterval: null,
    isInfiniteMode: false,
    coinInterval: null,

    // Configuration
    TRACK_SEGMENT_LENGTH: 100,
    CAR_MAX_SPEED: 320, // Aumentado para sensação Asphalt
    ACCEL: 80,          // Base acceleration (multiplied by delta)
    DECEL: 40,          // Base deceleration
    DRIFT_INTENSITY: 0.15,

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
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 50, 50);
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

        console.log("Building environment for:", track.name);

        // Cyber Skybox
        const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: track.envColor,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.3
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.name = 'track_element';
        this.scene.add(sky);

        // Starry Sky
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        for (let i = 0; i < 2000; i++) {
            starPos.push((Math.random() - 0.5) * 2000, Math.random() * 1000, -(Math.random()) * 5000);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 });
        const stars = new THREE.Points(starGeo, starMat);
        stars.name = 'track_element';
        this.scene.add(stars);

        // Futuristic Buildings - BROUGHT CLOSER
        for (let i = 0; i < 120; i++) {
            const w = 15 + Math.random() * 25;
            const h = 60 + Math.random() * 200;
            const d = 15 + Math.random() * 25;
            const geo = new THREE.BoxGeometry(w, h, d);

            const mat = new THREE.MeshStandardMaterial({
                color: 0x0a0a0a,
                roughness: 0.1,
                metalness: 0.9,
                emissive: i % 4 === 0 ? track.color : 0x111111,
                emissiveIntensity: 0.4
            });

            const building = new THREE.Mesh(geo, mat);
            building.name = 'track_element';

            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (45 + Math.random() * 150); // Closest is 45 units (Road is 30)
            const z = -Math.random() * length;
            building.position.set(x, h / 2 - 5, z);

            // Neon strips
            const stripGeo = new THREE.BoxGeometry(w + 0.5, 1, d + 0.5);
            const stripMat = new THREE.MeshBasicMaterial({ color: track.color });
            for (let j = 0; j < 3; j++) {
                const strip = new THREE.Mesh(stripGeo, stripMat);
                strip.position.y = (j - 1) * (h / 3);
                building.add(strip);
            }

            this.scene.add(building);
        }

        // Update HUD
        const msgEl = document.getElementById('hud-msg');
        if (msgEl) msgEl.innerText = track.name;
    },

    createFiatUno(color) {
        console.log("Creating Fiat Uno with color:", color);
        const unoGroup = new THREE.Group();

        // Pilot Integration
        const driver = this.createDriver();
        driver.position.set(0.8, 1.4, -0.4); // Right hand drive for firm car!
        unoGroup.add(driver);

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

        // Driver
        const driver = this.createDriver();
        driver.position.set(1.4, 2.5, 1.2);
        driver.scale.set(1.2, 1.2, 1.2);
        ramGroup.add(driver);

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

    createDriver() {
        const charColor = typeof economy !== 'undefined' ? economy.getSelectedCharColor() : 0xffffff;
        const driverGroup = new THREE.Group();

        // Body (Shirt)
        const bodyGeo = new THREE.BoxGeometry(1.2, 1.2, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: charColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        driverGroup.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.0;
        driverGroup.add(head);

        // Arms (Simplified)
        const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const armL = new THREE.Mesh(armGeo, bodyMat);
        armL.position.set(0.8, 0.1, 0.4);
        armL.rotation.x = -Math.PI / 4;
        driverGroup.add(armL);
        const armR = armL.clone();
        armR.position.set(-0.8, 0.1, 0.4);
        driverGroup.add(armR);

        return driverGroup;
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

        // Driver
        const driver = this.createDriver();
        driver.position.set(0.8, 1.2, -0.5);
        bmwGroup.add(driver);

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
        } else {
            carGroup = this.createFiatUno(skinColor);
        }

        // Glowing Nitro Exhaust (Added to the Uno group)
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
            effects: { nitro: 1, accel: 1, grip: 1, maxSpeed: 1, handling: 1 }
        };
        this.scene.add(carGroup);
    },

    createOpponents() {
        this.opponents.forEach(opp => this.scene.remove(opp.mesh));
        this.opponents = [];

        const colors = [0xff3333, 0x33ff33, 0xffff33, 0xff33ff, 0xffffff];

        for (let i = 0; i < 5; i++) {
            const oppGroup = this.createFiatUno(colors[i]);

            // Grid layout: All start at speed 0, in a 2-lane grid
            const x = (i % 2 === 0 ? -18 : 18);
            const z = -10 - (Math.floor(i / 2) * 15); // Slightly behind player who is at 0

            oppGroup.position.set(x, 0, z);
            this.opponents.push({
                mesh: oppGroup,
                speed: 0,
                targetSpeed: (160 + Math.random() * 50) * 1.1, // 10% mais rápido que antes
                accel: (25 + Math.random() * 15) * 1.1,       // 10% mais aceleração
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
        document.getElementById('char-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('hud-speed').classList.remove('hidden');

        // Reset Car State
        this.playerCar.speed = 0;
        this.playerCar.zPos = 0;
        this.playerCar.xPos = 0;
        this.playerCar.mesh.position.set(0, 1, 0);

        this.createOpponents();
        this.startTimer();
    },

    startInfiniteMode() {
        this.currentState = 'race';
        this.isRunning = true;
        this.isInfiniteMode = true;

        // Selecionar Rio de Janeiro (índice 3 adicionado antes)
        this.currentTrackIndex = 3;
        this.createTrack();

        // Música
        const music = document.getElementById('bg-music');
        if (music) {
            music.volume = 0.4;
            music.play().catch(e => console.log("Music blocked."));
        }

        // Criar carro com skin atual
        if (this.playerCar) this.scene.remove(this.playerCar.mesh);
        this.createPlayerCar();
        this.playerCar.effects = economy.getCombinedEffects();

        // UI
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('char-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('hud-speed').classList.remove('hidden');
        document.getElementById('hud-lap').innerText = 'INFINITO';

        // Reset Estado
        this.playerCar.speed = 0;
        this.playerCar.zPos = 0;
        this.playerCar.xPos = 0;
        this.playerCar.mesh.position.set(0, 1, 0);

        // Sem oponentes
        this.opponents.forEach(opp => this.scene.remove(opp.mesh));
        this.opponents = [];

        this.startTimer();

        // Ganhar 100 moedas por segundo
        if (this.coinInterval) clearInterval(this.coinInterval);
        this.coinInterval = setInterval(() => {
            if (this.isRunning && this.isInfiniteMode) {
                economy.addCoins(100);
            }
        }, 1000);
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
            this.playerCar.speed -= this.DECEL * 2 * delta;
        } else {
            this.playerCar.speed -= this.DECEL * delta;
        }

        // Nitro Boost
        const nitroFlame = this.playerCar.mesh.getObjectByName("nitro_flame");
        if (this.keys.space && this.playerCar.speed > 0) {
            this.playerCar.speed += (accel * 5 * effects.nitro * delta);
            if (nitroFlame) {
                nitroFlame.visible = true;
                nitroFlame.scale.setScalar(1 + Math.random() * 0.5); // Flame flicker
            }
            document.getElementById('nitro-bar').style.width = '100%';
        } else {
            if (nitroFlame) nitroFlame.visible = false;
        }

        // Clamp Speed
        this.playerCar.speed = Math.min(Math.max(this.playerCar.speed, 0), maxSpeed);

        // Steering
        if (this.playerCar.speed > 5) {
            const handling = effects.handling;
            if (this.keys.a) this.playerCar.xPos -= 1 * handling;
            if (this.keys.d) this.playerCar.xPos += 1 * handling;
        }

        // Apply Drift (Loose traction if turning hard at speed)
        if (this.playerCar.speed > 100 && (this.keys.a || this.keys.d)) {
            this.playerCar.xPos += (this.keys.a ? -1 : 1) * this.DRIFT_INTENSITY * (effects.drift || 1);
        }

        // Road Boundaries
        this.playerCar.xPos = Math.min(Math.max(this.playerCar.xPos, -28), 28);

        // Continuous Track
        this.playerCar.zPos -= this.playerCar.speed * 0.1;

        // Lap Logic (Modulo track length)
        const trackLength = 10000;
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

            opp.zPos -= opp.speed * 0.1;

            // Bot Lap Logic
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
        if (this.coinInterval) clearInterval(this.coinInterval);

        if (this.isInfiniteMode) {
            this.goToMenu();
            return;
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
        document.getElementById('shop-screen').classList.remove('hidden');
        economy.updateUI();
    },

    hideShop() {
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    showSkins() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('skin-screen').classList.remove('hidden');
        economy.updateSkinsUI();
    },

    hideSkins() {
        document.getElementById('skin-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    showChars() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('char-screen').classList.remove('hidden');
        economy.updateCharsUI();
    },

    hideChars() {
        document.getElementById('char-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    },

    goToMenu() {
        this.lap = 1;
        this.isInfiniteMode = false;
        if (this.coinInterval) clearInterval(this.coinInterval);

        // Lower music volume for menu
        const music = document.getElementById('bg-music');
        if (music) music.volume = 0.2;

        // Switch track for next round
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.createTrack(); // Rebuild track for new environment

        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('skin-screen').classList.add('hidden');
        document.getElementById('char-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        economy.updateUI();
    }
};

// Start Engine
game.init();
