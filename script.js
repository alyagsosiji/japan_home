import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// 파이어베이스 모듈 가져오기 (인증 기능 추가)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 1. 파이어베이스 초기화 (본인 정보 입력)
// ==========================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

let currentUser = null; // 로그인 세션 변수

// ==========================================
// 2. Three.js 기본 월드 세팅 (12x12 대형 스케일)
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0d); // 깊은 밤 분위기 배경
scene.fog = new THREE.FogExp2(0x0a0a0d, 0.025);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(14, 11, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

// 조명 (밤의 고즈넉한 광원 묘사)
const ambientLight = new THREE.AmbientLight(0xfff2e6, 0.55);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xdbe9ff, 1.3); // 은은한 푸른 달빛
moonLight.position.set(15, 22, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.bias = -0.0003;
scene.add(moonLight);

// ==========================================
// 3. 디테일 업 일본식 전통 대형 가옥 건축
// ==========================================
const roomGroup = new THREE.Group();
const roomSize = 12; // 12미터 대형 스케일 방

// 다다미 바닥 매트 구조화 생성
for(let x = -(roomSize/2 - 1); x <= (roomSize/2 - 1); x += 2) {
    for(let z = -(roomSize/2 - 0.5); z <= (roomSize/2 - 0.5); z += 1) {
        const tatamiGeo = new THREE.BoxGeometry(1.96, 0.08, 0.96);
        const tatamiMat = new THREE.MeshStandardMaterial({ color: 0xc4cb9a, roughness: 0.85 });
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x223322, roughness: 0.9 });
        
        const tatami = new THREE.Mesh(tatamiGeo, tatamiMat);
        tatami.position.set(x, -0.04, z);
        tatami.receiveShadow = true;
        roomGroup.add(tatami);
    }
}

// 고퀄리티 전통 쇼지 미닫이 벽 (격자 형태 코드 디자인)
function createShojiWall() {
    const wallGroup = new THREE.Group();
    // 투명 창호지 배경
    const paperGeo = new THREE.BoxGeometry(roomSize, 5, 0.02);
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.95 });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.y = 2.5;
    wallGroup.add(paper);

    // 격자 나무 프레임 세부 묘사
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.6 });
    for (let i = -roomSize/2; i <= roomSize/2; i += 0.8) {
        const vertFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 5, 0.04), woodMat);
        vertFrame.position.set(i, 2.5, 0.02);
        wallGroup.add(vertFrame);
    }
    for (let j = 0; j <= 5; j += 0.6) {
        const horizFrame = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 0.04, 0.04), woodMat);
        horizFrame.position.set(0, j, 0.02);
        wallGroup.add(horizFrame);
    }
    return wallGroup;
}

const backWall = createShojiWall();
backWall.position.set(0, 0, -roomSize/2);
roomGroup.add(backWall);

const leftWall = createShojiWall();
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-roomSize/2, 0, 0);
roomGroup.add(leftWall);

scene.add(roomGroup);

// 가구 배치용 투명 트래킹 면
const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), new THREE.MeshBasicMaterial({ visible: false }));
floorPlane.rotateX(-Math.PI / 2);
scene.add(floorPlane);

// ==========================================
// 4. 확장 가구 오브젝트 8종 절차적 빌드 함수
// ==========================================
function createFurniture(type) {
    const group = new THREE.Group();
    group.name = type;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x3a2312, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });

    if (type === 'table') {
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.1), woodDark);
        top.position.y = 0.36;
        top.castShadow = true; top.receiveShadow = true;
        group.add(top);
        for(let x of [-0.7, 0.7]) {
            for(let z of [-0.4, 0.4]) {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36), woodDark);
                leg.position.set(x, 0.18, z);
                leg.castShadow = true;
                group.add(leg);
            }
        }
    } 
    else if (type === 'cushion') {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.9 }));
        cushion.position.y = 0.04;
        cushion.castShadow = true;
        group.add(cushion);
    } 
    else if (type === 'lantern') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0xfffaed, emissive: 0xffaa44, emissiveIntensity: 0.6 }));
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);
        const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), woodDark); fTop.position.y = 0.7; group.add(fTop);
        const fBot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), woodDark); fBot.position.y = 0.02; group.add(fBot);
    } 
    else if (type === 'bonsai') {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.14), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        pot.position.y = 0.07; pot.castShadow = true; group.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
        trunk.position.set(0, 0.25, 0); trunk.rotation.z = 0.3; trunk.castShadow = true; group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.16), new THREE.MeshStandardMaterial({ color: 0x1e3f20 }));
        leaves.position.set(-0.08, 0.42, 0); leaves.scale.set(1.5, 0.7, 1.2); group.add(leaves);
    } 
    else if (type === 'sakura') {
        // 분홍빛 벚꽃 화분
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
        pot.position.y = 0.15; pot.castShadow = true; group.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5), woodDark);
        trunk.position.set(0, 0.4, 0); group.add(trunk);
        const blossoms = new THREE.Mesh(new THREE.SphereGeometry(0.28), new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.9 }));
        blossoms.position.set(0, 0.65, 0); blossoms.castShadow = true; group.add(blossoms);
    } 
    else if (type === 'katana') {
        // 전통 무기 거치대 및 검 거치 표현
        const standBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.15), woodDark);
        standBack.position.y = 0.2; standBack.castShadow = true; group.add(standBack);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }));
        blade.position.set(0, 0.28, 0.05); blade.rotation.z = 0.02; group.add(blade);
        const scabbard = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 }));
        scabbard.position.set(0, 0.15, 0.06); group.add(scabbard);
    } 
    else if (type === 'scroll') {
        // 벽면에 밀착 배치하는 걸개 수묵 족자
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.02), new THREE.MeshStandardMaterial({ color: 0xf0ebd8 }));
        paper.position.set(0, 1.5, -roomSize/2 + 0.05); group.add(paper);
        const frameT = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), woodDark);
        frameT.rotation.z = Math.PI / 2; frameT.position.set(0, 2.4, -roomSize/2 + 0.06); group.add(frameT);
        const frameB = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), woodDark);
        frameB.rotation.z = Math.PI / 2; frameB.position.set(0, 0.6, -roomSize/2 + 0.06); group.add(frameB);
    } 
    else if (type === 'partition') {
        // 화려한 화조도가 그려진 금빛 폴딩 병풍
        for(let i = -2; i <= 1; i++) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.03), goldMat);
            panel.position.set(i * 0.42 + 0.2, 0.8, (i % 2 === 0 ? 0.05 : -0.05));
            panel.rotation.y = (i % 2 === 0 ? 0.15 : -0.15);
            panel.castShadow = true;
            group.add(panel);
        }
    }
    return group;
}

// ==========================================
// 5. 배치 및 레이캐스터 제어 인터랙션
// ==========================================
let currentSelectedType = 'table';
let placedItems = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.querySelectorAll('.btn-item').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-item').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedType = e.target.getAttribute('data-item');
    });
});

window.addEventListener('pointerdown', onPointerDown);
let pointerDownTime = 0;

function onPointerDown(event) {
    if(event.target.closest('#ui-container')) return;
    pointerDownTime = performance.now();
    window.addEventListener('pointerup', (e) => onPointerUp(e, event), { once: true });
}

function onPointerUp(event, startEvent) {
    if (performance.now() - pointerDownTime > 200) return; // 드래그 회전 차단

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floorPlane);

    if (intersects.length > 0) {
        const p = intersects[0].point;
        const boundary = roomSize / 2 - 0.2;
        if (Math.abs(p.x) < boundary && Math.abs(p.z) < boundary) {
            placeFurnitureElement(currentSelectedType, p.x, p.z);
        }
    }
}

function placeFurnitureElement(type, x, z) {
    const furniture = createFurniture(type);
    furniture.position.set(x, 0, z);
    scene.add(furniture);
    placedItems.push({ mesh: furniture, type: type, x: x, z: z });
}

// ==========================================
// 6. 파이어베이스 인증 관리 (사용자별 개별 매핑)
// ==========================================
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const loggedOutDiv = document.getElementById('auth-logged-out');
const loggedInDiv = document.getElementById('auth-logged-in');
const userInfoP = document.getElementById('user-info');

// 회원가입
document.getElementById('btn-signup').addEventListener('click', () => {
    const email = emailInput.value; const password = passwordInput.value;
    if(!email || !password) return alert("이메일과 비밀번호를 채워주세요.");
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert("회원가입 완료 및 자동 로그인되었습니다!"))
        .catch(err => alert("에러: " + err.message));
});

// 로그인
document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value; const password = passwordInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => alert("성공적으로 로그인되었습니다!"))
        .catch(err => alert("로그인 실패: " + err.message));
});

// 로그아웃
document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).then(() => {
        clearAllFurniture();
        alert("로그아웃되었습니다. 화면이 초기화됩니다.");
    });
});

// 실시간 인증 상태 변경 감지 리스너
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loggedOutDiv.style.display = 'none';
        loggedInDiv.style.display = 'block';
        userInfoP.innerText = `접속 계정: ${user.email}`;
        // 로그인 성공 시 자동으로 파이어베이스 클라우드에서 해당 사용자의 이전 방 상태 로드
        loadUserRoom(user.uid);
    } else {
        currentUser = null;
        loggedOutDiv.style.display = 'block';
        loggedInDiv.style.display = 'none';
    }
});

// ==========================================
// 7. 유저 ID별 영구 데이터베이스 세이브/로드 구현
// ==========================================
document.getElementById('btn-save').addEventListener('click', async () => {
    if (!currentUser) return alert("로그인 세션이 만료되었거나 비로그인 상태입니다. 로그인 후 저장해 주세요!");
    if (placedItems.length === 0) return alert("배치된 아이템이 존재하지 않습니다.");

    const dataToSave = placedItems.map(item => ({
        type: item.type,
        x: item.x,
        z: item.z
    }));

    try {
        // 중요: 'rooms/유저고유UID' 경로에 저장하여 계정 분리를 완벽히 보장합니다.
        await set(ref(database, 'user_rooms/' + currentUser.uid), dataToSave);
        alert("🔒 회원님 계정 전용 클라우드 공간에 방 상태가 안전하게 저장되었습니다!");
    } catch (error) {
        alert("저장 에러: " + error.message);
    }
});

document.getElementById('btn-load').addEventListener('click', () => {
    if (!currentUser) return alert("로그인 후 이용할 수 있는 기능입니다.");
    loadUserRoom(currentUser.uid);
});

async function loadUserRoom(uid) {
    try {
        const snapshot = await get(ref(database, 'user_rooms/' + uid));
        clearAllFurniture();
        if (snapshot.exists()) {
            const loadedData = snapshot.val();
            loadedData.forEach(item => {
                placeFurnitureElement(item.type, item.x, item.z);
            });
        }
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if(confirm("화면의 모든 가구를 비우시겠습니까?")) clearAllFurniture();
});

function clearAllFurniture() {
    placedItems.forEach(item => scene.remove(item.mesh));
    placedItems = [];
}

// ==========================================
// 8. 윈도우 조절 및 렌더링 루프
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
