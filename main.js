import * as THREE from 'three';

// --- Global State ---
const state = {
    currentScreen: 'intro', // intro, diagnostic, construction, activation
    energyType: null,
    shield: {
        color: null,
        symbol: null,
        sigil: null,
    },
    choicesMade: {
        color: false,
        symbol: false,
        sigil: false
    }
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let transitionSoundBuffer;
let activationSoundBuffer;

// --- Asset Loading ---
async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

function playSound(buffer) {
    if (!buffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

window.addEventListener('load', async () => {
    try {
        transitionSoundBuffer = await loadSound('transition_sound.mp3');
        activationSoundBuffer = await loadSound('activation_sound.mp3');
    } catch (e) {
        console.error("Could not load sounds", e);
    }
});


// --- UI Navigation ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    playSound(transitionSoundBuffer);
}

// --- THREE.js Scene Setup ---
let scene, camera, renderer, starfield, aura, shieldSphere, symbolObjects = [];
const textureLoader = new THREE.TextureLoader();

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = 5;

    // Starfield
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(200);
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 0.05 });
    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);

    // Aura (initially invisible)
    const auraGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const auraMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x8a2be2,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0
    });
    aura = new THREE.Mesh(auraGeometry, auraMaterial);
    scene.add(aura);

    // Shield (initially invisible)
    const shieldGeometry = new THREE.SphereGeometry(1.7, 32, 32);
    const shieldMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        shininess: 100
    });
    shieldSphere = new THREE.Mesh(shieldGeometry, shieldMaterial);
    scene.add(shieldSphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    starfield.rotation.x += 0.0001;
    starfield.rotation.y += 0.0002;

    if (aura.material.emissiveIntensity > 0) {
        const time = Date.now() * 0.002;
        aura.material.opacity = (Math.sin(time) * 0.1 + 0.3) * aura.material.emissiveIntensity;
    }
    
    symbolObjects.forEach(obj => {
        obj.rotation.z += 0.01;
        // complex orbit would go here
    });


    renderer.render(scene, camera);
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Shield Construction Logic ---
function updateShieldVisuals() {
    // Color
    if (state.shield.color) {
        shieldSphere.material.color.set(state.shield.color);
        shieldSphere.material.emissive.set(state.shield.color);
        shieldSphere.material.emissiveIntensity = 0.5;
        shieldSphere.material.opacity = 0.2;
    }

    // Symbol
    if (state.shield.symbol) {
        // Clear previous symbols
        symbolObjects.forEach(obj => scene.remove(obj));
        symbolObjects = [];
        const symbolTexture = textureLoader.load(state.shield.symbol);
        const symbolMaterial = new THREE.SpriteMaterial({ map: symbolTexture, color: 0xffffff, transparent: true, opacity: 0.8 });
        
        for(let i = 0; i < 3; i++) {
            const symbolSprite = new THREE.Sprite(symbolMaterial);
            const angle = (i/3) * Math.PI * 2;
            symbolSprite.position.set(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0);
            symbolSprite.scale.set(0.5, 0.5, 0.5);
            scene.add(symbolSprite);
            symbolObjects.push(symbolSprite);
        }
    }
    
     // Sigil
    if (state.shield.sigil) {
        const sigilTexture = new THREE.CanvasTexture(state.shield.sigil);
        shieldSphere.material.map = sigilTexture;
        shieldSphere.material.map.wrapS = THREE.RepeatWrapping;
        shieldSphere.material.map.wrapT = THREE.RepeatWrapping;
        shieldSphere.material.map.repeat.set(3, 2);
        shieldSphere.material.opacity = Math.max(shieldSphere.material.opacity, 0.3);
    }
}

function checkConstructionComplete() {
    const { color, symbol, sigil } = state.choicesMade;
    const activateBtn = document.getElementById('activate-shield-btn');
    if (color && symbol && sigil) {
        activateBtn.disabled = false;
    } else {
        activateBtn.disabled = true;
    }
}


// --- Sigil Generation ---
function generateSigil(word) {
    const canvas = document.getElementById('sigil-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    
    if(!word || word.trim() === '') return;

    const chars = word.toUpperCase().split('');
    const points = chars.map((char, index) => {
        const charCode = char.charCodeAt(0) - 65; // A=0, B=1...
        const angle = (index / chars.length) * Math.PI * 2;
        const radius = (width / 2 - 10) * ( (charCode % 10) / 10 * 0.5 + 0.5);
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        return { x, y };
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    if (points.length > 2) {
       ctx.closePath();
    }
    ctx.stroke();
    
    state.shield.sigil = canvas;
    state.choicesMade.sigil = true;
    updateShieldVisuals();
    checkConstructionComplete();
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initThree();
    window.addEventListener('resize', handleResize);

    // --- Intro Screen ---
    document.getElementById('start-diagnostic-btn').addEventListener('click', () => {
        switchScreen('diagnostic-screen');
        aura.material.emissiveIntensity = 0.5;
    });

    // --- Diagnostic Screen ---
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.energyType = e.target.dataset.type;
            document.getElementById('final-energy-type').textContent = state.energyType;
            switchScreen('construction-screen');
        });
    });

    // --- Construction Screen ---
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            e.target.classList.add('selected');
            state.shield.color = parseInt(e.target.dataset.color);
            state.choicesMade.color = true;
            updateShieldVisuals();
            checkConstructionComplete();
        });
    });

    document.querySelectorAll('.symbol-option').forEach(symbol => {
        symbol.addEventListener('click', (e) => {
            document.querySelectorAll('.symbol-option').forEach(s => s.classList.remove('selected'));
            e.target.classList.add('selected');
            state.shield.symbol = e.target.dataset.symbol;
            state.choicesMade.symbol = true;
            updateShieldVisuals();
            checkConstructionComplete();
        });
    });

    document.getElementById('generate-sigil-btn').addEventListener('click', () => {
        const input = document.getElementById('sigil-input').value;
        generateSigil(input);
    });
    
    document.getElementById('activate-shield-btn').addEventListener('click', () => {
        switchScreen('activation-screen');
        playSound(activationSoundBuffer);
        // Final animation
        shieldSphere.material.opacity = 0.7;
        aura.material.emissiveIntensity = 1.0;
    });
    
    // --- Activation Screen ---
    document.getElementById('restart-btn').addEventListener('click', () => {
        // Reset state
        state.energyType = null;
        state.shield = { color: null, symbol: null, sigil: null };
        state.choicesMade = { color: false, symbol: false, sigil: false };
        
        // Reset visuals
        shieldSphere.material.opacity = 0;
        shieldSphere.material.map = null;
        aura.material.emissiveIntensity = 0;
        symbolObjects.forEach(obj => scene.remove(obj));
        symbolObjects = [];
        
        // Reset UI
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.getElementById('sigil-input').value = '';
        const sigilCanvas = document.getElementById('sigil-canvas');
        sigilCanvas.getContext('2d').clearRect(0,0,sigilCanvas.width, sigilCanvas.height);
        document.getElementById('activate-shield-btn').disabled = true;

        switchScreen('intro-screen');
    });
});

