let currentSlot = 1;
const uiElement = document.getElementById('ui');

if (uiElement) {
    uiElement.addEventListener('wheel', (e) => e.stopPropagation());
}

// === OBSLUHA TUTORIÁLU A TABŮ ===
function closeTutorial() {
    const tutorialElement = document.getElementById('tutorial') 
                         || document.getElementById('instructions')
                         || document.querySelector('.tutorial-overlay')
                         || document.querySelector('.tutorial-box');
    if (tutorialElement) {
        tutorialElement.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-tutorial-btn') 
                  || document.querySelector('.tutorial-close')
                  || document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTutorial);
    }
});

function switchUpgradeTab(tabBtn, targetId) {
    const container = tabBtn.closest('.upgrade-container');
    if(!container) return;
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

// === SCÉNA A KAMERA ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a3318);

const gridWidth = 160;
const gridHeight = 128;

const aspect = window.innerWidth / window.innerHeight;
let d = 90;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(0, 120, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === MŘÍŽKA ===
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

// === POMOCNÉ FUNKCE ===
function getEffectiveRadius(name, defaultRadius) {
    const lower = name.toLowerCase();
    if (lower.includes('spider') || lower.includes('tank') || lower.includes('helicopter') || lower.includes('soldier')) {
        return 16;
    }
    return defaultRadius || 0;
}

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

// === PROMĚNNÉ STAVU ===
let currentName = null;
let baseWidth = 8;
let baseDepth = 8;
let currentRadius = 0;
let currentCategory = 'Houses';
let isRotated = false;

let currentColorStr = '#cf4d3c';
let currentTextColor = '#ffffff';
let canPlace = false;
let isMouseDown = false;

const placedBuildings = [];
let selectedBuildings = [];
let copiedBuildingData = null;

// HISTORIE (UNDO/REDO)
const historyStack = [];
let historyIndex = -1;

function saveHistoryState() {
    const state = placedBuildings.map(b => ({
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

    historyStack.splice(historyIndex + 1);
    historyStack.push(JSON.stringify(state));
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(historyStack[historyIndex]);
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        restoreState(historyStack[historyIndex]);
    }
}

function restoreState(jsonState) {
    placedBuildings.forEach(b => scene.remove(b));
    placedBuildings.length = 0;
    deselectAllPlaced();

    const data = JSON.parse(jsonState);
    data.forEach(item => {
        const buildingGroup = createBuildingMesh(
            item.name, item.w, item.d, item.colorStr, 
            item.textColor, item.radius, item.category
        );
        buildingGroup.position.set(item.x, 0, item.z);
        scene.add(buildingGroup);
        placedBuildings.push(buildingGroup);
    });
    recalculateStatueBoosts();
}

function getCurrentWidth() { return isRotated ? baseDepth : baseWidth; }
function getCurrentDepth() { return isRotated ? baseWidth : baseDepth; }

// NÁHLED STAVBY
let previewGroup = new THREE.Group();
previewGroup.visible = false;
scene.add(previewGroup);

let previewMat = new THREE.MeshBasicMaterial({ 
    color: currentColorStr, 
    transparent: true, 
    opacity: 0.6,
    depthTest: false,
    depthWrite: false
});

let previewMesh = new THREE.Mesh(new THREE.BoxGeometry(getCurrentWidth(), 1, getCurrentDepth()), previewMat);
previewMesh.renderOrder = 9999;
previewGroup.add(previewMesh);
let previewRadiusRing = null;

function deselectBuilding() {
    currentName = null;
    previewGroup.visible = false;
    isMouseDown = false;
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
}

function updatePreviewMesh() {
    previewGroup.clear();
    if (!currentName) {
        previewGroup.visible = false;
        return;
    }
    previewGroup.visible = true;

    const curW = getCurrentWidth();
    const curD = getCurrentDepth();

    previewMesh = new THREE.Mesh(new THREE.BoxGeometry(curW, 1.5, curD), previewMat);
    previewMesh.renderOrder = 9999;
    previewMesh.position.set(0, 0.75, 0);
    previewGroup.add(previewMesh);

    if (currentRadius > 0) {
        previewRadiusRing = createRadiusRing(currentRadius);
        if (previewRadiusRing) previewGroup.add(previewRadiusRing);
    }
}

function selectBuilding(name, w, d, colorStr, textColor, radius, category, btn) {
    deselectAllPlaced();
    currentName = name;
    baseWidth = w;
    baseDepth = d;
    currentRadius = getEffectiveRadius(name, radius);
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
    if (selectedBuildings.length > 0) {
        selectedBuildings.forEach(b => {
            const oldW = b.userData.width;
            b.userData.width = b.userData.depth;
            b.userData.depth = oldW;
            b.userData.mainMesh.geometry.dispose();
            b.userData.mainMesh.geometry = new THREE.BoxGeometry(b.userData.width, 1.2, b.userData.depth);
        });
        recalculateStatueBoosts();
        saveHistoryState();
    } else if (currentName) {
        isRotated = !isRotated;
        updatePreviewMesh();
        updatePreviewPosition();
    }
}

function createBuildingMesh(name, w, d, colorStr, textColor, radius, category, boosts = null) {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, 1.2, d);
    const effectiveRadius = getEffectiveRadius(name, radius);

    const topTexture = createTopTexture(name, colorStr, textColor, boosts);

    const sideMat = new THREE.MeshBasicMaterial({ color: colorStr });
    const topMat = new THREE.MeshBasicMaterial({ map: topTexture });

    const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];

    const buildingMesh = new THREE.Mesh(geo, materials);
    buildingMesh.position.set(0, 0.6, 0);
    group.add(buildingMesh);

    if (effectiveRadius > 0) {
        const ring = createRadiusRing(effectiveRadius);
        if (ring) group.add(ring);
    }

    group.userData = { 
        name: name,
        width: w, 
        depth: d, 
        radius: effectiveRadius,
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

function recalculateStatueBoosts() {
    const statues = placedBuildings.filter(b => b.userData.category === 'Statue');
    
    placedBuildings.forEach(building => {
        const data = building.userData;
        data.boosts = { prodSpeed: 0, hpBonus: 0, dmgBonus: 0, vehicleHp: 0, flyingHp: 0 };

        if (data.category !== 'Statue' && data.name !== 'Vault' && data.name !== 'Nuclear Vault') {
            let hasGold = false, hasSilver = false, hasManager = false;
            let hasSpider = false, hasSoldier = false, hasTank = false, hasHelicopter = false;

            const bX = building.position.x;
            const bZ = building.position.z;

            statues.forEach(statue => {
                const stData = statue.userData;
                const statueName = stData.name.toLowerCase();
                const effectiveStatueRadius = getEffectiveRadius(stData.name, stData.radius);

                const stX = statue.position.x;
                const stZ = statue.position.z;

                const tileDistX = Math.abs(bX - stX) / tileSize;
                const tileDistZ = Math.abs(bZ - stZ) / tileSize;

                const maxTileRadius = Math.round(effectiveStatueRadius / tileSize);
                const bHalfTilesW = (data.width / 2) / tileSize;
                const bHalfTilesD = (data.depth / 2) / tileSize;

                if (tileDistX <= maxTileRadius + bHalfTilesW && tileDistZ <= maxTileRadius + bHalfTilesD) {
                    const exactGridDist = Math.sqrt(Math.pow(bX - stX, 2) + Math.pow(bZ - stZ, 2));
                    if (exactGridDist <= effectiveStatueRadius + (tileSize * 0.25)) {
                        if (statueName.includes('gold')) hasGold = true;
                        if (statueName.includes('silver')) hasSilver = true;
                        if (statueName.includes('manager')) hasManager = true;
                        if (statueName.includes('spider')) hasSpider = true;
                        if (statueName.includes('soldier')) hasSoldier = true;
                        if (statueName.includes('tank')) hasTank = true;
                        if (statueName.includes('helicopter')) hasHelicopter = true;
                    }
                }
            });

            if (data.category === 'Factory') {
                if (hasGold) data.boosts.prodSpeed = 50;
                else if (hasSilver) data.boosts.prodSpeed = 30;
                else if (hasManager) data.boosts.prodSpeed = 25;
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

function checkCollision(posX, posZ, w, d, ignoreBuildings = []) {
    const newMinX = posX - w / 2;
    const newMaxX = posX + w / 2;
    const newMinZ = posZ - d / 2;
    const newMaxZ = posZ + d / 2;

    for (let b of placedBuildings) {
        if (ignoreBuildings.includes(b)) continue;
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

function tryPlaceBuilding() {
    if (!canPlace || !currentName) return;

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
    saveHistoryState();

    canPlace = false;
    previewMat.color.setStyle('#ff0000');
}

// === MULTISELECT & KOPÍROVÁNÍ ===
function selectPlacedBuilding(buildingGroup, add = false) {
    if (!add) deselectAllPlaced();
    if (!selectedBuildings.includes(buildingGroup)) {
        selectedBuildings.push(buildingGroup);
        const box = new THREE.BoxHelper(buildingGroup.userData.mainMesh, 0x00ffff);
        box.name = 'selectionOutline';
        buildingGroup.add(box);
    }
}

function deselectAllPlaced() {
    selectedBuildings.forEach(b => {
        const outline = b.getObjectByName('selectionOutline');
        if (outline) b.remove(outline);
    });
    selectedBuildings = [];
}

function deleteSelectedBuildings() {
    if (selectedBuildings.length === 0) return;
    selectedBuildings.forEach(b => {
        scene.remove(b);
        const idx = placedBuildings.indexOf(b);
        if (idx > -1) placedBuildings.splice(idx, 1);
    });
    selectedBuildings = [];
    recalculateStatueBoosts();
    saveHistoryState();
}

function copySelectedBuilding() {
    if (selectedBuildings.length > 0) {
        const target = selectedBuildings[0];
        copiedBuildingData = { ...target.userData };
    }
}

function pasteCopiedBuilding() {
    if (copiedBuildingData) {
        selectBuilding(
            copiedBuildingData.name, 
            copiedBuildingData.width, 
            copiedBuildingData.depth, 
            copiedBuildingData.colorStr, 
            copiedBuildingData.textColor, 
            copiedBuildingData.radius, 
            copiedBuildingData.category
        );
    }
}

// === NÁSTROJE: STATUE COVERAGE & MEASURE TOOL ===
let isStatueCoverageActive = false;
let coverageRingsGroup = new THREE.Group();
scene.add(coverageRingsGroup);

function toggleStatueCoverage() {
    isStatueCoverageActive = !isStatueCoverageActive;
    const btn = document.getElementById('tool-coverage-btn');
    if (btn) btn.classList.toggle('active', isStatueCoverageActive);

    coverageRingsGroup.clear();
    if (isStatueCoverageActive) {
        placedBuildings.forEach(b => {
            if (b.userData.category === 'Statue' || b.userData.radius > 0) {
                const ring = createRadiusRing(b.userData.radius);
                if (ring) {
                    ring.position.copy(b.position);
                    coverageRingsGroup.add(ring);
                }
            }
        });
    }
}

let isMeasureToolActive = false;
let measurePoints = [];
let measureLine = null;

function toggleMeasureTool() {
    isMeasureToolActive = !isMeasureToolActive;
    const btn = document.getElementById('tool-measure-btn');
    if (btn) btn.classList.toggle('active', isMeasureToolActive);

    if (!isMeasureToolActive && measureLine) {
        scene.remove(measureLine);
        measureLine = null;
        measurePoints = [];
    }
}

function handleMeasureClick(point) {
    if (!isMeasureToolActive) return;

    measurePoints.push(point.clone());
    if (measurePoints.length === 2) {
        if (measureLine) scene.remove(measureLine);

        const geom = new THREE.BufferGeometry().setFromPoints(measurePoints);
        const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 3 });
        measureLine = new THREE.Line(geom, mat);
        scene.add(measureLine);

        const distance = measurePoints[0].distanceTo(measurePoints[1]).toFixed(1);
        const tiles = (distance / tileSize).toFixed(1);
        alert(`📏 Vzdálenost: ${distance} jednotek (${tiles} políček)`);

        measurePoints = [];
    }
}

// === EXPORT / IMPORT / SCREENSHOT ===
function takeScreenshot() {
    deselectAllPlaced();
    deselectBuilding();
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `base-layout-slot-${currentSlot}.png`;
    link.href = dataURL;
    link.click();
}

function exportJSON() {
    const data = placedBuildings.map(b => ({
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

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `base-slot-${currentSlot}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
}

function importJSON() {
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            restoreState(event.target.result);
            saveHistoryState();
            saveCurrentSlot();
        } catch (err) {
            alert("Chyba při načítání souboru JSON!");
        }
    };
    reader.readAsText(file);
}

// === ULOŽENÉ SLOTY ===
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
            restoreState(dataStr);
        } catch(e) {
            console.error("Chyba při načítání:", e);
        }
    }
    historyStack.length = 0;
    historyIndex = -1;
    saveHistoryState();
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
        deselectAllPlaced();
        localStorage.removeItem(`base_slot_${currentSlot}`);
        recalculateStatueBoosts();
        saveHistoryState();
    }
}

// === INTERAKCE A KLÁVESNICE ===
const keysPressed = {};

window.addEventListener('keydown', (e) => {
    if (document.activeElement.id === 'search-box') return;

    const key = e.key.toLowerCase();
    keysPressed[key] = true;

    if (e.key === 'r' || e.key === 'R') rotateBuilding();
    if (e.key === 'Escape') { deselectBuilding(); deselectAllPlaced(); hideContextMenu(); }
    
    // OPRAVA MAZÁNÍ: Při zmáčknutí Delete se bezpečně odznačí aktivní stavba
    if (e.key === 'Delete') {
        deselectBuilding();
        deleteSelectedBuildings();
    }
    
    if (e.key === 'm' || e.key === 'M') toggleMeasureTool();
    if (e.key === 'g' || e.key === 'G') toggleStatueCoverage();

    if (e.ctrlKey && key === 'c') copySelectedBuilding();
    if (e.ctrlKey && key === 'v') pasteCopiedBuilding();
    if (e.ctrlKey && key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && key === 'y') { e.preventDefault(); redo(); }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// === KONTEXTOVÉ MENU ===
const contextMenu = document.getElementById('context-menu');

function showContextMenu(x, y) {
    if (contextMenu) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    }
}

function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
}

function contextCopy() { copySelectedBuilding(); hideContextMenu(); }
function contextRotate() { rotateBuilding(); hideContextMenu(); }
function contextDelete() { deleteSelectedBuildings(); hideContextMenu(); }

// === MYŠ A POHYB KAMERY ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isPanning = false;
let startMouseX = 0, startMouseY = 0;
let hasMovedMouse = false;

// Multiselect Drag Box
let isSelecting = false;
let selectStartX = 0, selectStartY = 0;
const selectionBox = document.getElementById('selection-box');

function updatePreviewPosition() {
    if (!currentName) {
        previewGroup.visible = false;
        return;
    }
    previewGroup.visible = true;

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

            // Roznášení s přitaženým levým tlačítkem
            if (isMouseDown) {
                tryPlaceBuilding();
            }
        }
    }
}

window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Multiselect drag
    if (isSelecting && selectionBox) {
        const currentX = event.clientX;
        const currentY = event.clientY;

        const width = Math.abs(currentX - selectStartX);
        const height = Math.abs(currentY - selectStartY);
        const left = Math.min(currentX, selectStartX);
        const top = Math.min(currentY, selectStartY);

        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        return;
    }

    if (isPanning) {
        const deltaX = (event.clientX - startMouseX) * (1 / camera.zoom) * 0.2;
        const deltaY = (event.clientY - startMouseY) * (1 / camera.zoom) * 0.2;

        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            hasMovedMouse = true;
        }

        camera.position.x -= deltaX;
        camera.position.z -= deltaY;

        startMouseX = event.clientX;
        startMouseY = event.clientY;
        return;
    }

    updatePreviewPosition();
});

window.addEventListener('pointerdown', (event) => {
    if (event.clientX > window.innerWidth - 320 && event.clientY < 600) return;
    hideContextMenu();

    // Shift + LMB = Multiselect box
    if (event.button === 0 && event.shiftKey) {
        isSelecting = true;
        selectStartX = event.clientX;
        selectStartY = event.clientY;
        if (selectionBox) {
            selectionBox.style.display = 'block';
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
        }
        return;
    }

    // LMB Stavění / Výběr
    if (event.button === 0) {
        isMouseDown = true;
        
        raycaster.setFromCamera(mouse, camera);
        const intersectsGround = raycaster.intersectObject(groundPlane);
        if (intersectsGround.length > 0 && isMeasureToolActive) {
            handleMeasureClick(intersectsGround[0].point);
            return;
        }

        const buildingMeshes = placedBuildings.map(b => b.userData.mainMesh);
        const intersects = raycaster.intersectObjects(buildingMeshes);

        if (intersects.length > 0 && !currentName) {
            const hitGroup = intersects[0].object.parent;
            selectPlacedBuilding(hitGroup, event.ctrlKey);
        } else if (!currentName) {
            deselectAllPlaced();
        }

        updatePreviewPosition();
    }

    // RMB nebo MMB = Pan Kamery
    if (event.button === 2 || event.button === 1) {
        isPanning = true;
        startMouseX = event.clientX;
        startMouseY = event.clientY;
        hasMovedMouse = false;
    }
});

window.addEventListener('pointerup', (event) => {
    if (event.button === 0) {
        isMouseDown = false;

        // Dokončení multiselect dragu
        if (isSelecting) {
            isSelecting = false;
            if (selectionBox) selectionBox.style.display = 'none';

            deselectAllPlaced();
            const minX = Math.min(event.clientX, selectStartX);
            const maxX = Math.max(event.clientX, selectStartX);
            const minY = Math.min(event.clientY, selectStartY);
            const maxY = Math.max(event.clientY, selectStartY);

            placedBuildings.forEach(b => {
                const vector = b.position.clone().project(camera);
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    selectPlacedBuilding(b, true);
                }
            });
            return;
        }
    }

    if (event.clientX > window.innerWidth - 320 && event.clientY < 600) return;

    raycaster.setFromCamera(mouse, camera);

    // OPRAVA PRAVÉHO TLAČÍTKA:
    if (event.button === 2) {
        if (!hasMovedMouse) {
            // Pokud stavíme budovu, pravé tlačítko storno/zruší stavění
            if (currentName) {
                deselectBuilding();
                return;
            }

            // Pokud nestavíme, zkontrolujeme kliknutí na označenou budovu
            const buildingMeshes = placedBuildings.map(b => b.userData.mainMesh);
            const intersects = raycaster.intersectObjects(buildingMeshes);

            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                const buildingGroup = hitMesh.parent;
                selectPlacedBuilding(buildingGroup);
                showContextMenu(event.clientX, event.clientY);
            } else {
                deselectAllPlaced();
            }
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

// Zajištění aktualizace renderovací smyčky scény
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Načtení počátečních dat
loadCurrentSlot();
