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
        { name: 'NEON CITY', color: 0x00f2ff, envColor: 0x004444, fog: 0x000000 },
        { name: 'CYBER DESERT', color: 0xff7700, envColor: 0x442200, fog: 0x110500 },
        { name: 'VOID NIGHT', color: 0xff00ff, envColor: 0x440044, fog: 0x050005 }
    ],


    // Racing Metrics
    lap: 1,
    totalLaps: 3,
    startTime: 0,
    bestLap: Infinity,
    timerInterval: null,

    // Configuration
    TRACK_SEGMENT_LENGTH: 100,
    CAR_MAX_SPEED: 200,
    ACCEL: 0.1,
    DECEL: 0.05,
    DRIFT_INTENSITY: 0.05,

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

        // Create a simple procedural loop track
        const trackLength = 5000;
        const width = 60;

        const roadGeo = new THREE.PlaneGeometry(width, trackLength);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });

        const road = new THREE.Mesh(roadGeo, roadMat);
        road.name = 'track_element';
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        this.scene.add(road);

        // Lines
        const lineGeo = new THREE.PlaneGeometry(1, trackLength);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftLine = new THREE.Mesh(lineGeo, lineMat);
        leftLine.position.set(-width / 2 + 1, 0.01, 0);
        leftLine.rotation.x = -Math.PI / 2;
        road.add(leftLine);

        const rightLine = new THREE.Mesh(lineGeo, lineMat);
        rightLine.position.set(width / 2 - 1, 0.01, 0);
        rightLine.rotation.x = -Math.PI / 2;
        road.add(rightLine);

        // Center dashed line
        const dashedGeo = new THREE.PlaneGeometry(0.5, trackLength);
        const dashedMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const centerLine = new THREE.Mesh(dashedGeo, dashedMat);
        centerLine.position.set(0, 0.01, 0);
        centerLine.rotation.x = -Math.PI / 2;
        road.add(centerLine);

        // Track Environment
        this.createEnv(trackLength);
    },

    createEnv(length) {
        const track = this.tracks[this.currentTrackIndex];
        this.scene.background = new THREE.Color(track.fog);
        this.scene.fog = new THREE.FogExp2(track.fog, 0.0005);

        // Add some glowing pillars for "Neon" feel
        for (let i = 0; i < 150; i++) {
            const h = 5 + Math.random() * 50;
            const geo = new THREE.BoxGeometry(5, h, 5);
            const mat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? track.color : 0xffffff,
                emissive: i % 2 === 0 ? track.envColor : 0x222222,
                emissiveIntensity: 1
            });
            const pillar = new THREE.Mesh(geo, mat);
            pillar.name = 'track_element';
            pillar.position.set((Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 120), h / 2, -Math.random() * length);
            this.scene.add(pillar);
        }

        // Update HUD with track name
        const msgEl = document.getElementById('hud-msg');
        if (msgEl) msgEl.innerText = track.name;
    },


    createPlayerCar() {
        const carGroup = new THREE.Group();

        // Simplified Body
        const bodyGeo = new THREE.BoxGeometry(4, 2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        carGroup.add(body);

        // Glowing Nitro Exhaust
        const nitroGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const nitroMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
        const nitro = new THREE.Mesh(nitroGeo, nitroMat);
        nitro.position.set(0, 0, -4);
        carGroup.add(nitro);

        carGroup.position.set(0, 1, 0);
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

        for (let i = 0; i < 5; i++) {
            const oppGroup = new THREE.Group();
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 8), bodyMat);
            oppGroup.add(body);

            oppGroup.position.set((i - 2) * 10, 1, -100 - (i * 20));
            this.opponents.push({
                mesh: oppGroup,
                speed: 150 + Math.random() * 20,
                xPos: (i - 2) * 10,
                zPos: -100 - (i * 20),
                lane: (i - 2) * 10
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

        // Load Economy Effects
        this.playerCar.effects = economy.getCombinedEffects();

        // UI transitions
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('hud-speed').classList.remove('hidden');

        // Reset Car
        this.playerCar.speed = 0;
        this.playerCar.zPos = 0;
        this.playerCar.xPos = 0;
        this.playerCar.mesh.position.set(0, 1, 0);

        this.createOpponents();
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
            this.playerCar.speed += accel;
        } else if (this.keys.s) {
            this.playerCar.speed -= this.DECEL * 2;
        } else {
            this.playerCar.speed -= this.DECEL;
        }

        // Nitro Boost
        if (this.keys.space && this.playerCar.speed > 0) {
            this.playerCar.speed += (accel * 4 * effects.nitro);
            // Visual Nitro Bar
            document.getElementById('nitro-bar').style.width = '100%';
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
        const trackLength = 5000;
        if (Math.abs(this.playerCar.zPos) >= trackLength) {
            this.playerCar.zPos = 0;
            this.lap++;
            if (this.lap > this.totalLaps) {
                this.finishRace();
            } else {
                document.getElementById('hud-lap').innerText = `${this.lap}/3`;
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
            opp.zPos -= opp.speed * 0.1;
            if (Math.abs(opp.zPos) >= trackLength) opp.zPos = 0;
            opp.mesh.position.z = opp.zPos;

            // Basic Collision Check
            const dist = this.playerCar.mesh.position.distanceTo(opp.mesh.position);
            if (dist < 6) {
                this.playerCar.speed *= 0.8;
                console.log('COLLISION!');
            }
        });

        // Update HUD
        document.getElementById('speed-val').innerText = Math.floor(this.playerCar.speed);

        // Position Tracking (Simple distance based)
        let pos = 1;
        this.opponents.forEach(opp => {
            if (opp.zPos < this.playerCar.zPos) pos++;
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

        // Calculate Position and Reward
        let finalPos = 1;
        this.opponents.forEach(opp => {
            if (opp.zPos < this.playerCar.zPos) finalPos++;
        });

        const reward = Math.max(0, 1000 - (finalPos - 1) * 200);
        economy.addCoins(reward);

        this.showLeaderboard(finalPos, reward);
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

    goToMenu() {
        this.lap = 1;
        // Switch track for next round
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.createTrack(); // Rebuild track for new environment

        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        economy.updateUI();
    }
};

// Start Engine
game.init();
