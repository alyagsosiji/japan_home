import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// 파이어베이스 인증 및 DB 모듈
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 1. 파이어베이스 설정 (본인 정보로 치환 필요)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDxmONNIEeIz8dYIhkYyl3WcPQIGhkdCq0", // 꼭 실제 키로 변경!
    authDomain: "japan-home-make.firebaseapp.com",
    databaseURL: "https://japan-home-make-default-rtdb.firebaseio.com",
    projectId: "japan-home-makeD",
    storageBucket: "japan-home-make.firebasestorage.app",
    messagingSenderId: "1001166062274",
    appId: "1:1001166062274:web:594038d7fca7670463715bD"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
let currentUser = null;

// ==========================================
// 2. Three.js 기본 엔진 및 안개/달빛 세팅
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0d);
scene.fog = new THREE.FogExp2(0x0a0a0d, 0.025);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(13, 10, 15);

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

// 따뜻한 조명과 푸른 달빛 레이어링
const ambientLight = new THREE.AmbientLight(0xfff2e6, 0.6);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xdbe9ff, 1.2);
moonLight.position.set(12, 20, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.bias = -0.0003;
scene.add(moonLight);

// ==========================================
// 3. 12x12 대형 스케일 다다미방 구조 생성
// ==========================================
const roomGroup = new THREE.Group();
const roomSize = 12;

// 다다미 격자 바닥 깔기
for(let x = -(roomSize/2 - 1); x <= (roomSize/2 - 1); x += 2) {
    for(let z = -(roomSize/2 - 0.5); z <= (roomSize/2 - 0.5); z += 1) {
        const tatamiGeo = new THREE.BoxGeometry(1.96, 0.08, 0.96);
        const tatamiMat = new THREE.MeshStandardMaterial({ color: 0xc4cb9a, roughness: 0.85 });
        const tatami = new THREE.Mesh(tatamiGeo, tatamiMat);
        tatami.position.set(x, -0.04, z);
        tatami.receiveShadow = true;
        roomGroup.add(tatami);
    }
}

// 전통 격자 쇼지(창호지) 미닫이 벽면 생성기
function createShojiWall() {
    const wallGroup = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 4.5, 0.02), new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.95 }));
    paper.position.y = 2.25;
    wallGroup.add(paper);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.6 });
    for (let i = -roomSize/2; i <= roomSize/2; i += 0.75) {
        const vert = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.5, 0.04), woodMat);
        vert.position.set(i, 2.25, 0.02);
        wallGroup.add(vert);
    }
    for (let j = 0; j <= 4.5; j += 0.5) {
        const horiz = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 0.04, 0.04), woodMat);
        horiz.position.set(0, j, 0.02);
        wallGroup.add(horiz);
    }
    return wallGroup;
}

const backWall = createShojiWall(); backWall.position.set(0, 0, -roomSize/2); roomGroup.add(backWall);
const leftWall = createShojiWall(); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-roomSize/2, 0, 0); roomGroup.add(leftWall);
scene.add(roomGroup);

// 가구 추적 감지용 투명 바닥
const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), new THREE.MeshBasicMaterial({ visible: false }));
floorPlane.rotateX(-Math.PI / 2);
scene.add(floorPlane);

// ==========================================
// 4. 일본 전통 가구 8종 코드 모델링 데이터
// ==========================================
function createFurniture(type) {
    const group = new THREE.Group();
    group.name = type;

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x3a2312, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });

    if (type === 'table') {
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.1), woodDark); top.position.y = 0.36; top.castShadow = true; top.receiveShadow = true; group.add(top);
        for(let x of [-0.7, 0.7]) { for(let z of [-0.4, 0.4]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36), woodDark); leg.position.set(x, 0.18, z); leg.castShadow = true; group.add(leg);
        }}
    } 
    else if (type === 'cushion') {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.9 })); cushion.position.y = 0.04; cushion.castShadow = true; group.add(cushion);
    } 
    else if (type === 'lantern') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0xfffaed, emissive: 0xffaa44, emissiveIntensity: 0.5 })); body.position.y = 0.35; body.castShadow = true; group.add(body);
        const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), woodDark); fTop.position.y = 0.7; group.add(fTop);
        const fBot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), woodDark); fBot.position.y = 0.02; group.add(fBot);
    } 
    else if (type === 'bonsai') {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.14), new THREE.MeshStandardMaterial({ color: 0x444444 })); pot.position.y = 0.07; pot.castShadow = true; group.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0x5c4033 })); trunk.position.set(0, 0.25, 0); trunk.rotation.z = 0.3; trunk.castShadow = true; group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.16), new THREE.MeshStandardMaterial({ color: 0x1e3f20 })); leaves.position.set(-0.08, 0.42, 0); leaves.scale.set(1.5, 0.7, 1.2); group.add(leaves);
    } 
    else if (type === 'sakura') {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); pot.position.y = 0.15; pot.castShadow = true; group.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5), woodDark); trunk.position.set(0, 0.4, 0); group.add(trunk);
        const blossoms = new THREE.Mesh(new THREE.SphereGeometry(0.28), new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.9 })); blossoms.position.set(0, 0.65, 0); blossoms.castShadow = true; group.add(blossoms);
    } 
    else if (type === 'katana') {
        const standBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.15), woodDark); standBack.position.y = 0.2; standBack.castShadow = true; group.add(standBack);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })); blade.position.set(0, 0.28, 0.05); blade.rotation.z = 0.02; group.add(blade);
        const scabbard = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 })); scabbard.position.set(0, 0.15, 0.06); group.add(scabbard);
    } 
    else if (type === 'scroll') {
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.02), new THREE.MeshStandardMaterial({ color: 0xf0ebd8 })); paper.position.set(0, 1.5, -roomSize/2 + 0.04); group.add(paper);
        const frameT = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), woodDark); frameT.rotation.z = Math.PI / 2; frameT.position.set(0, 2.4, -roomSize/2 + 0.05); group.add(frameT);
        const frameB = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), woodDark); frameB.rotation.z = Math.PI / 2; frameB.position.set(0, 0.6, -roomSize/2 + 0.05); group.add(frameB);
    } 
    else if (type === 'partition') {
        for(let i = -2; i <= 1; i++) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.03), goldMat); panel.position.set(i * 0.42 + 0.2, 0.8, (i % 2 === 0 ? 0.04 : -0.04)); panel.rotation.y = (i % 2 === 0 ? 0.15 : -0.15); panel.castShadow = true; group.add(panel);
        }
    }
    return group;
}

// ==========================================
// 5. [편의성 패치] 실시간 프리뷰 고스트 & 조작 시스템
// ==========================================
let currentSelectedType = 'table';
let currentRotation = 0; // 라디안 단위 회전각값
let placedItems = [];
let selectedItem = null; // 현재 마우스로 선택한 배치완료 가구 오프셋
let previewGroup = null; // 실시간 반투명 가구 고스트

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 반투명 미리보기 모델 생성 갱신
function updatePreviewObject() {
    if (previewGroup) scene.remove(previewGroup);
    
    previewGroup = createFurniture(currentSelectedType);
    previewGroup.traverse(child => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.45; // 반투명 설정
        }
    });
    previewGroup.rotation.y = currentRotation;
    scene.add(previewGroup);
}
updatePreviewObject();

// 가구 변경 시 프리뷰 교체
document.querySelectorAll('.btn-item').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-item').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedType = e.target.getAttribute('data-item');
        
        // 개별 가구 선택 상태 해제
        deselectItem();
        updatePreviewObject();
    });
});

// 마우스 움직임에 반응하는 고스트 무브 및 그리드 스냅 (0.5m 단위 정렬)
window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floorPlane);

    if (intersects.length > 0 && previewGroup) {
        const p = intersects[0].point;
        
        // 0.5미터 단위 자석 스냅 공식 적용
        const snapX = Math.round(p.x / 0.5) * 0.5;
        const snapZ = Math.round(p.z / 0.5) * 0.5;

        const boundary = roomSize / 2 - 0.2;
        if (Math.abs(snapX) < boundary && Math.abs(snapZ) < boundary) {
            previewGroup.position.set(snapX, 0, snapZ);
            previewGroup.visible = true;
        } else {
            previewGroup.visible = false;
        }
    }
});

// ==========================================
// 6. 배치 클릭 및 가구 개별 선택 판정
// ==========================================
window.addEventListener('pointerdown', onPointerDown);
let pointerDownTime = 0;

function onPointerDown(event) {
    if(event.target.closest('#ui-container')) return;
    pointerDownTime = performance.now();
    window.addEventListener('pointerup', (e) => onPointerUp(e), { once: true });
}

function onPointerUp(event) {
    if (performance.now() - pointerDownTime > 200) return; // 드래그 회전 시 작동 무시

    raycaster.setFromCamera(mouse, camera);
    
    // 편의성: 배치된 가구를 먼저 클릭했는지 여부 검사
    const allMeshes = [];
    placedItems.forEach(item => {
        item.mesh.traverse(child => { if(child.isMesh) { child.userData.parentItem = item; allMeshes.push(child); } });
    });

    const clickIntersects = raycaster.intersectObjects(allMeshes);

    if (clickIntersects.length > 0) {
        // 이미 깔린 가구를 클릭했을 때 -> 개별 가구 선택 모드 진입
        const clickedItem = clickIntersects[0].object.userData.parentItem;
        selectItem(clickedItem);
    } else {
        // 바닥을 클릭했을 때 -> 신규 가구 배치
        const floorIntersects = raycaster.intersectObject(floorPlane);
        if (floorIntersects.length > 0) {
            const p = floorIntersects[0].point;
            const snapX = Math.round(p.x / 0.5) * 0.5;
            const snapZ = Math.round(p.z / 0.5) * 0.5;
            const boundary = roomSize / 2 - 0.2;
            
            if (Math.abs(snapX) < boundary && Math.abs(snapZ) < boundary) {
                placeFurnitureElement(currentSelectedType, snapX, snapZ, currentRotation);
                deselectItem();
            }
        }
    }
}

function placeFurnitureElement(type, x, z, rotY) {
    const furniture = createFurniture(type);
    furniture.position.set(x, 0, z);
    furniture.rotation.y = rotY;
    scene.add(furniture);
    placedItems.push({ mesh: furniture, type: type, x: x, z: z, rotationY: rotY });
}

// 가구 선택 및 외곽 이펙트 우회용 발광 표현
function selectItem(item) {
    deselectItem();
    selectedItem = item;
    
    selectedItem.mesh.traverse(child => {
        if(child.isMesh) {
            child.material.userData.oldColor = child.material.color.getHex();
            child.material.color.setHex(0xffaaaa); // 선택된 오브젝트를 붉은 빛으로 강조 표시
        }
    });

    // 편집 UI 표출
    document.getElementById('selected-control-panel').style.display = 'block';
    document.getElementById('selected-item-name').innerText = `선택됨: ${getKoreanName(item.type)}`;
    if (previewGroup) previewGroup.visible = false; // 선택 중에는 신규 배치용 고스트를 잠시 숨김
}

function deselectItem() {
    if (selectedItem) {
        selectedItem.mesh.traverse(child => {
            if(child.isMesh && child.material.userData.oldColor !== undefined) {
                child.material.color.setHex(child.material.userData.oldColor);
            }
        });
    }
    selectedItem = null;
    document.getElementById('selected-control-panel').style.display = 'none';
    if (previewGroup) previewGroup.visible = true;
}

function getKoreanName(type) {
    const mapping = { table:'낮은 테이블', cushion:'방석', lantern:'안돈 조명', bonsai:'미니 분재', sakura:'벚꽃 화분', katana:'카타나 거치대', scroll:'수묵화 족자', partition:'금박 병풍' };
    return mapping[type] || type;
}

// ==========================================
// 7. 가구 조작 로직 (회전 / 삭제 / 단축키)
// ==========================================
function rotateAction() {
    if (selectedItem) {
        selectedItem.rotationY += Math.PI / 2;
        selectedItem.mesh.rotation.y = selectedItem.rotationY;
    } else {
        currentRotation += Math.PI / 2;
        if (previewGroup) previewGroup.rotation.y = currentRotation;
    }
}

function deleteAction() {
    if (selectedItem) {
        scene.remove(selectedItem.mesh);
        placedItems = placedItems.filter(i => i !== selectedItem);
        deselectItem();
    }
}

// UI 클릭 연동
document.getElementById('btn-rotate-selected').addEventListener('click', rotateAction);
document.getElementById('btn-delete-selected').addEventListener('click', deleteAction);

// 키보드 단축키 핸들러 패치
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // 입력창 칠때는 제외
    if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') rotateAction();
    if (e.key === 'Delete' || e.key === 'Backspace') deleteAction();
});

// ==========================================
// 8. 파이어베이스 계정 연동 및 클라우드 데이터 관리
// ==========================================
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const loggedOutDiv = document.getElementById('auth-logged-out');
const loggedInDiv = document.getElementById('auth-logged-in');
const userInfoP = document.getElementById('user-info');

document.getElementById('btn-signup').addEventListener('click', () => {
    const email = emailInput.value; const password = passwordInput.value;
    if(!email || !password) return alert("이메일과 비밀번호를 작성하세요.");
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert("가입 및 로그인에 성공했습니다!"))
        .catch(err => alert("오류: " + err.message));
});

document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value; const password = passwordInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => alert("반갑습니다, 로그인되었습니다!"))
        .catch(err => alert("로그인 실패: " + err.message));
});

document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).then(() => { clearAllFurniture(); alert("로그아웃되어 화면이 초기화되었습니다."); });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loggedOutDiv.style.display = 'none'; loggedInDiv.style.display = 'block';
        userInfoP.innerText = `접속 계정: ${user.email}`;
        loadUserRoom(user.uid); // 유저 접속 시 자동 데이터 패치
    } else {
        currentUser = null;
        loggedOutDiv.style.display = 'block'; loggedInDiv.style.display = 'none';
    }
});

// 영구 DB 클라우드 세이브 및 로드
document.getElementById('btn-save').addEventListener('click', async () => {
    if (!currentUser) return alert("저장하려면 먼저 우측 패널에서 로그인을 진행해주세요!");
    
    // 개별 저장 스키마 데이터 가공 (회전값 데이터셋 포함 필수)
    const dataToSave = placedItems.map(item => ({
        type: item.type, x: item.x, z: item.z, rotationY: item.rotationY
    }));

    try {
        await set(ref(database, 'user_rooms/' + currentUser.uid), dataToSave);
        alert("🎉 나만의 일본식 하우스 배치가 실시간 클라우드 DB에 영구 저장되었습니다.");
    } catch (error) {
        alert("DB 저장 에러: " + error.message);
    }
});

document.getElementById('btn-load').addEventListener('click', () => {
    if (!currentUser) return alert("로그인 세션이 없습니다.");
    loadUserRoom(currentUser.uid);
});

async function loadUserRoom(uid) {
    try {
        const snapshot = await get(ref(database, 'user_rooms/' + uid));
        clearAllFurniture();
        if (snapshot.exists()) {
            const loadedData = snapshot.val();
            loadedData.forEach(item => {
                // 저장 데이터에 이전 회전값 백업본 유무 분기 연산 처리
                const rY = item.rotationY !== undefined ? item.rotationY : 0;
                placeFurnitureElement(item.type, item.x, item.z, rY);
            });
        }
    } catch (error) {
        console.error("클라우드 로드 미스:", error);
    }
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if(confirm("배치된 가구를 전부 비우시겠습니까?")) { clearAllFurniture(); deselectItem(); }
});

function clearAllFurniture() {
    placedItems.forEach(item => scene.remove(item.mesh));
    placedItems = [];
}

// ==========================================
// 9. 리사이즈 및 실시간 루프 렌더링
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
