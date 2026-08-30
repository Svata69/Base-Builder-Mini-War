let currentSlot = 1;
const uiElement = document.getElementById('ui');

if (uiElement) {
    uiElement.addEventListener('wheel', (e) => {
        e.stopPropagation();
    });
}

function switchUpgradeTab(tabBtn, targetId) {
    const container = tabBtn.closest('.upgrade-container');
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    tabBtn.classList.add('active');

    container.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = content.id === targetId ? 'block' : 'none';
    });
}

function filterBuildings() {
    const query = document.getElementById('search-box').value.toLowerCase();
    const sections = document.querySelectorAll('.building-section');

    sections.forEach(section => {
        const buttons = section.querySelectorAll('.btn');
        let hasVisibleButtons = false;

        buttons.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            if (text.includes(query)) {
                btn.style.display = 'block';
                hasVisibleButtons = true;
            } else {
                btn.style.display = 'none';
            }
        });

        section.style.display = hasVisibleButtons ? 'block' : 'none';
    });
}

// Inicializace Three.js scény
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a3318);

const gridWidth = 160;
const gridHeight = 128;

const aspect = window.innerWidth / window.innerHeight;
let d = 90;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(0, 120, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Mřížka a podklad
const boardGroup = new THREE.Group();
const tileSize = 4;
const cols = gridWidth / tileSize;
const rows = gridHeight / tileSize;

const matGreen1 = new THREE.MeshBasicMaterial({ color: 0x2e6628 });
const matGreen2 = new THREE.MeshBasicMaterial({ color: 0x255420 });
const tileGeo = new THREE.PlaneGeometry(tileSize, tileSize);
tileGeo.rotateX(-Math.PI / 2);

for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const isEven = (r + c) % 2 === 0;
        const tileMesh = new THREE.Mesh(tileGeo, isEven ? matGreen1 : matGreen2);
        const x = -gridWidth / 2 + c * tileSize + tileSize / 2;
        const z = -gridHeight / 2 + r * tileSize + tileSize / 2;
        tileMesh.position.set(x, -0.01, z);
        boardGroup.add(tileMesh);
    }
}
scene.add(boardGroup);

const gridMat = new THREE.LineBasicMaterial({ color: 0x183815, transparent: true, opacity: 0.5 });
const gridGeo = new THREE.BufferGeometry();
const points = [];

for (let i = -gridWidth / 2; i <= gridWidth / 2; i++) {
    points.push(i, 0, -gridHeight / 2, i, 0, gridHeight / 2);
}
for (let j = -gridHeight / 2; j <= gridHeight / 2; j++) {
    points.push(-gridWidth / 2, 0, j, gridWidth / 2, 0, j);
}
gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
const customGrid = new THREE.LineSegments(gridGeo, gridMat);
scene.add(customGrid);

const planeGeo = new THREE.PlaneGeometry(gridWidth, gridHeight);
planeGeo.rotateX(-Math.PI / 2);
const groundPlane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
scene.add(groundPlane);

// Textura na horní straně budovy
function createTopTexture(text, bgColorHexStr, textColor, boosts = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColorHexStr;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, 512, 512);

    const words = text.split(' ');
    let lines = [];
    if (words.length > 2) {
        lines.push(words.slice(0, 2).join(' '));
        lines.push(words.slice(2).join(' '));
    } else if (words.length > 1) {
        lines.push(words[0]);
        lines.push(words.slice(1).join(' '));
    } else {
        lines.push(text);
    }

    if (boosts) {
        let boostTexts = [];
        if (boosts.prodSpeed > 0) boostTexts.push(`+${boosts.prodSpeed}% EFF`);
        if (boosts.hpBonus > 0) boostTexts.push(`+${boosts.hpBonus}% HP`);
        if (boosts.dmgBonus > 0) boostTexts.push(`+${boosts.dmgBonus}% DMG`);
        if (boosts.vehicleHp > 0) boostTexts.push(`+${boosts.vehicleHp}% V-HP`);
        if (boosts.flyingHp > 0) boostTexts.push(`+${boosts.flyingHp}% F-HP`);

        if (boostTexts.length > 0) {
            lines.push(`${boostTexts.join(' | ')}`);
        }
    }

    let fontSize = lines.length > 2 ? 42 : 54;
    ctx.font = 'bold ' + fontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = fontSize * 1.25;
    const startY = 256 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        const isBoostLine = line.includes('%');

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.strokeText(line, 256, y);

        ctx.fillStyle = isBoostLine ? '#00ffff' : textColor;
        ctx.fillText(line, 256, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Vytvoření žlutého okruhu dosahu (viditelný PŘES VŠECHNY BUDOVY)
function createRadiusRing(radius) {
    if (!radius || radius <= 0) return null;

    const segments = 64;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = 2.0;
        positions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.9,
        depthTest: false,
        depthWrite: false
    });

    const line = new THREE.LineLoop(geometry, material);
    line.renderOrder = 9999;
    return line;
}

let currentName = 'The Manor';
let baseWidth = 8;
let baseDepth = 8;
let currentRadius = 0;
let currentCategory = 'Houses';
let isRotated = false;

let currentColorStr = '#cf4d3c';
let currentTextColor = '#ffffff';
let canPlace = true;

const placedBuildings = [];

function getCurrentWidth() { return isRotated ? baseDepth : baseWidth; }
function getCurrentDepth() { return isRotated ? baseWidth : baseDepth; }

let previewGroup = new THREE.Group();
scene.add(previewGroup);

let previewMat = new THREE.MeshBasicMaterial({ color: currentColorStr, transparent: true, opacity: 0.5 });
let previewMesh = new THREE.Mesh(new THREE.BoxGeometry(getCurrentWidth(), 1, getCurrentDepth()), previewMat);
previewGroup.add(previewMesh);
let previewRadiusRing = null;

function updatePreviewMesh() {
    previewGroup.clear();
    const curW = getCurrentWidth();
    const curD = getCurrentDepth();

    previewMesh = new THREE.Mesh(new THREE.BoxGeometry(curW, 1, curD), previewMat);
    previewMesh.position.set(0, 0.5, 0);
    previewGroup.add(previewMesh);

    if (currentRadius > 0) {
        previewRadiusRing = createRadiusRing(currentRadius);
        if (previewRadiusRing) previewGroup.add(previewRadiusRing);
    }
}

function selectBuilding(name, w, d, colorStr, textColor, radius, category, btn) {
    currentName = name;
    baseWidth = w;
    baseDepth = d;
    currentRadius = radius || 0;
    currentCategory = category || 'Houses';
    isRotated = false;
    currentColorStr = colorStr;
    currentTextColor = textColor;

    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    previewMat.color.setStyle(currentColorStr);
    updatePreviewMesh();
    updatePreviewPosition();
}

function rotateBuilding() {
    isRotated = !isRotated;
    updatePreviewMesh();
    updatePreviewPosition();
}

window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && document.activeElement.id !== 'search-box') {
        rotateBuilding();
    }
});

function createBuildingMesh(name, w, d, colorStr, textColor, radius, category, boosts = null) {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, 1.2, d);
    const topTexture = createTopTexture(name, colorStr, textColor, boosts);

    const sideMat = new THREE.MeshBasicMaterial({ color: colorStr });
    const topMat = new THREE.MeshBasicMaterial({ map: topTexture });

    const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];

    const buildingMesh = new THREE.Mesh(geo, materials);
    buildingMesh.position.set(0, 0.6, 0);
    group.add(buildingMesh);

    if (radius > 0) {
        const ring = createRadiusRing(radius);
        if (ring) group.add(ring);
    }

    group.userData = { 
        name: name,
        width: w, 
        depth: d, 
        radius: radius,
        category: category,
        colorStr: colorStr,
        textColor: textColor,
        mainMesh: buildingMesh,
        boosts: boosts || { prodSpeed: 0, hpBonus: 0, dmgBonus: 0, vehicleHp: 0, flyingHp: 0 }
    };

    return group;
}

function updateBuildingStatsUI() {
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;

    const counts = {};
    placedBuildings.forEach(b => {
        const name = b.userData.name;
        counts[name] = (counts[name] || 0) + 1;
    });

    const names = Object.keys(counts);
    if (names.length === 0) {
        statsList.innerHTML = '<i>Žádné budovy</i>';
        return;
    }

    let html = '';
    names.sort().forEach(name => {
        html += `<div class="stat-item"><span>${name}</span><span class="stat-count">${counts[name]}×</span></div>`;
    });
    statsList.innerHTML = html;
}

// DETEKCE PŘEKRYVU KRUHU SOCHY A BOXU BUDOVY (KOLIZE AABB S KRUHEM)
function recalculateStatueBoosts() {
    const statues = placedBuildings.filter(b => b.userData.category === 'Statue');
    
    placedBuildings.forEach(building => {
        const data = building.userData;
        
        data.boosts = { prodSpeed: 0, hpBonus: 0, dmgBonus: 0, vehicleHp: 0, flyingHp: 0 };

        if (data.category !== 'Statue' && data.name !== 'Vault' && data.name !== 'Nuclear Vault') {
            let hasGold = false;
            let hasSilver = false;
            let hasManager = false;
            let hasSpider = false;
            let hasSoldier = false;
            let hasTank = false;
            let hasHelicopter = false;

            // Hranice budovy
            const bMinX = building.position.x - data.width / 2;
            const bMaxX = building.position.x + data.width / 2;
            const bMinZ = building.position.z - data.depth / 2;
            const bMaxZ = building.position.z + data.depth / 2;

            statues.forEach(statue => {
                const stData = statue.userData;
                const statueName = stData.name.toLowerCase();
                
                const stX = statue.position.x;
                const stZ = statue.position.z;

                // Najdeme nejbližší bod na obvodu/uvnitř budovy vzhledem ke středu sochy
                const closestX = Math.max(bMinX, Math.min(stX, bMaxX));
                const closestZ = Math.max(bMinZ, Math.min(stZ, bMaxZ));

                // Vzdálenost středu sochy k tomuto nejbližšímu bodu budovy
                const distX = stX - closestX;
                const distZ = stZ - closestZ;
                const distanceSq = (distX * distX) + (distZ * distZ);

                // Pokud je nejbližší bod v dosahu poloměru sochy, budova dostává boost
                if (distanceSq <= (stData.radius * stData.radius)) {
                    if (statueName.includes('gold')) hasGold = true;
                    if (statueName.includes('silver')) hasSilver = true;
                    if (statueName.includes('manager')) hasManager = true;
                    if (statueName.includes('spider')) hasSpider = true;
                    if (statueName.includes('soldier')) hasSoldier = true;
                    if (statueName.includes('tank')) hasTank = true;
                    if (statueName.includes('helicopter')) hasHelicopter = true;
                }
            });

            if (data.category === 'Factory') {
                if (hasGold) {
                    data.boosts.prodSpeed = 50;
                } else if (hasSilver) {
                    data.boosts.prodSpeed = 30;
                } else if (hasManager) {
                    data.boosts.prodSpeed = 25;
                }
            }

            if (data.category === 'Military') {
                if (hasSpider) data.boosts.hpBonus = 20;
                if (hasSoldier) data.boosts.dmgBonus = 10;
                if (hasTank) data.boosts.vehicleHp = 10;
                if (hasHelicopter) data.boosts.flyingHp = 10;
            }
        }

        const newTexture = createTopTexture(data.name, data.colorStr, data.textColor, data.boosts);
        if (data.mainMesh.material[2].map) {
            data.mainMesh.material[2].map.dispose();
        }
        data.mainMesh.material[2].map = newTexture;
        data.mainMesh.material[2].needsUpdate = true;
    });

    updateBuildingStatsUI();
    saveCurrentSlot();
}

function checkCollision(posX, posZ, w, d) {
    const newMinX = posX - w / 2;
    const newMaxX = posX + w / 2;
    const newMinZ = posZ - d / 2;
    const newMaxZ = posZ + d / 2;

    for (let b of placedBuildings) {
        const bWidth = b.userData.width;
        const bDepth = b.userData.depth;
        const bMinX = b.position.x - bWidth / 2;
        const bMaxX = b.position.x + bWidth / 2;
        const bMinZ = b.position.z - bDepth / 2;
        const bMaxZ = b.position.z + bDepth / 2;

        if (newMinX < bMaxX && newMaxX > bMinX && newMinZ < bMaxZ && newMaxZ > bMinZ) {
            return true;
        }
    }
    return false;
}

function saveCurrentSlot() {
    const saveData = placedBuildings.map(b => ({
        name: b.userData.name,
        x: b.position.x,
        z: b.position.z,
        w: b.userData.width,
        d: b.userData.depth,
        colorStr: b.userData.colorStr,
        textColor: b.userData.textColor,
        radius: b.userData.radius,
        category: b.userData.category
    }));
    localStorage.setItem(`base_slot_${currentSlot}`, JSON.stringify(saveData));
}

function loadCurrentSlot() {
    placedBuildings.forEach(b => scene.remove(b));
    placedBuildings.length = 0;

    const dataStr = localStorage.getItem(`base_slot_${currentSlot}`);
    if (dataStr) {
        try {
            const saveData = JSON.parse(dataStr);
            saveData.forEach(item => {
                const buildingGroup = createBuildingMesh(
                    item.name, item.w, item.d, item.colorStr, 
                    item.textColor, item.radius, item.category
                );
                buildingGroup.position.set(item.x, 0, item.z);
                scene.add(buildingGroup);
                placedBuildings.push(buildingGroup);
            });
        } catch(e) {
            console.error("Chyba při načítání:", e);
        }
    }
    recalculateStatueBoosts();
}

function switchSlot(slotNumber) {
    currentSlot = slotNumber;
    document.querySelectorAll('.slot-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx + 1 === slotNumber);
    });
    loadCurrentSlot();
}

function clearCurrentSlot() {
    if (confirm(`Opravdu chceš smazat celou základnu ve Slotu ${currentSlot}?`)) {
        placedBuildings.forEach(b => scene.remove(b));
        placedBuildings.length = 0;
        localStorage.removeItem(`base_slot_${currentSlot}`);
        recalculateStatueBoosts();
    }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isPanning = false;
let startMouseX = 0;
let startMouseY = 0;
let hasMovedMouse = false;

function updatePreviewPosition() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundPlane);

    if (intersects.length > 0) {
        const intersect = intersects[0];

        const curW = getCurrentWidth();
        const curD = getCurrentDepth();

        let posX = Math.floor(intersect.point.x + 0.5) + (curW % 2 === 0 ? 0 : 0.5);
        let posZ = Math.floor(intersect.point.z + 0.5) + (curD % 2 === 0 ? 0 : 0.5);

        const maxX = (gridWidth / 2) - (curW / 2);
        const maxZ = (gridHeight / 2) - (curD / 2);

        posX = Math.max(-maxX, Math.min(maxX, posX));
        posZ = Math.max(-maxZ, Math.min(maxZ, posZ));

        previewGroup.position.set(posX, 0, posZ);

        if (checkCollision(posX, posZ, curW, curD)) {
            previewMat.color.setStyle('#ff0000');
            canPlace = false;
        } else {
            previewMat.color.setStyle(currentColorStr);
            canPlace = true;
        }
    }
}

window.addEventListener('pointermove', (event) => {
    if (isPanning) {
        const deltaX = (event.clientX - startMouseX) * (1 / camera.zoom) * 0.2;
        const deltaY = (event.clientY - startMouseY) * (1 / camera.zoom) * 0.2;

        camera.position.x -= deltaX;
        camera.position.z -= deltaY;

        startMouseX = event.clientX;
        startMouseY = event.clientY;
        hasMovedMouse = true;
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    updatePreviewPosition();
});

window.addEventListener('pointerdown', (event) => {
    if (event.clientX > window.innerWidth - 300 && event.clientY < 600) return;

    if (event.button === 2 || event.button === 1) {
        isPanning = true;
        startMouseX = event.clientX;
        startMouseY = event.clientY;
        hasMovedMouse = false;
    }
});

window.addEventListener('pointerup', (event) => {
    if (event.clientX > window.innerWidth - 300 && event.clientY < 600) return;

    raycaster.setFromCamera(mouse, camera);

    if (event.button === 2 && !hasMovedMouse) {
        const buildingMeshes = placedBuildings.map(b => b.userData.mainMesh);
        const intersects = raycaster.intersectObjects(buildingMeshes);
        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const buildingGroup = hitMesh.parent;
            scene.remove(buildingGroup);
            placedBuildings.splice(placedBuildings.indexOf(buildingGroup), 1);
            recalculateStatueBoosts();
        }
    }

    if (event.button === 0 && canPlace) {
        const intersects = raycaster.intersectObject(groundPlane);
        if (intersects.length > 0) {
            const curW = getCurrentWidth();
            const curD = getCurrentDepth();

            const buildingGroup = createBuildingMesh(
                currentName, curW, curD, currentColorStr, 
                currentTextColor, currentRadius, currentCategory
            );
            buildingGroup.position.copy(previewGroup.position);
            scene.add(buildingGroup);
            placedBuildings.push(buildingGroup);

            recalculateStatueBoosts();

            canPlace = false;
            previewMat.color.setStyle('#ff0000');
        }
    }

    if (event.button === 2 || event.button === 1) {
        isPanning = false;
    }
});

window.addEventListener('contextmenu', event => event.preventDefault());

window.addEventListener('wheel', (event) => {
    camera.zoom -= event.deltaY * 0.001;
    camera.zoom = Math.max(0.2, Math.min(camera.zoom, 5));
    camera.updateProjectionMatrix();
    updatePreviewPosition();
});

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

loadCurrentSlot();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

const welcomeModal = document.getElementById('welcome-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

if (welcomeModal) {
    welcomeModal.addEventListener('pointerdown', (e) => e.stopPropagation());
    welcomeModal.addEventListener('pointerup', (e) => e.stopPropagation());
    welcomeModal.addEventListener('wheel', (e) => e.stopPropagation());

    if (localStorage.getItem('hideWelcomeModal') === 'true') {
        welcomeModal.style.display = 'none';
    }
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        welcomeModal.style.display = 'none';
        localStorage.setItem('hideWelcomeModal', 'true');
    });
}
