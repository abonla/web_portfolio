/**
 * 幸運物物語 ✦ 蘋果與小熊 (Apple & Bear Lucky Charm)
 * 3D 低面數 (Low-Poly) 互動場景與動畫腳本
 */

(function () {
  'use strict';

  // --- 音效模組 (Web Audio API 合成音效，無需外部檔案) ---
  class SoundManager {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // 咀嚼脆甜蘋果聲
    playCrunch() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    }

    // 歡呼開心音
    playCheer() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    }

    // 蘋果彈跳生成聲
    playPop() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    // 懸停清脆點擊音
    playHover() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  const sound = new SoundManager();

  // --- Three.js 場景變數 ---
  let scene, camera, renderer, controls;
  let bearGroup, headGroup, rightArmGroup, leftArmGroup, ears = [];
  let appleGroup, appleMesh, appleInitialPos, stumpGroup;
  let particleSystem;
  let raycaster, mouse;
  let hoveredObject = null;
  let isEating = false;
  let eatenCount = 0;

  const container = document.getElementById('canvas-container');
  const appleTooltip = document.getElementById('apple-tooltip');
  const bearTooltip = document.getElementById('bear-tooltip');
  const eatenCounterEl = document.getElementById('eaten-count');
  const luckyScoreEl = document.getElementById('lucky-score');
  const meterFillEl = document.getElementById('meter-fill');
  const soundBtn = document.getElementById('sound-btn');
  const resetCamBtn = document.getElementById('reset-cam-btn');
  const feedBtn = document.getElementById('feed-action-btn');
  const fortuneBtn = document.getElementById('fortune-btn');
  const fortuneModal = document.getElementById('fortune-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const acceptFortuneBtn = document.getElementById('accept-fortune-btn');

  // 初始化場景
  function initScene() {
    scene = new THREE.Scene();
    scene.background = null; // 透明背景，顯現 CSS 精緻暖調漸層

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3.2, 8.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 視角控制器 OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // 限制不能轉到地底
    controls.minDistance = 4.5;
    controls.maxDistance = 14;
    controls.target.set(0, 1.2, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupLights();
    buildEnvironment();
    buildLowPolyBear();
    buildLowPolyApple();
    buildLuckyParticles();

    setupEvents();
    animate();
  }

  // 燈光配置：柔和暖光與立體陰影
  function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 1.1);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffeedd, 0x5a6855, 0.8);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xfffaf0, 1.3);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // 側邊粉橘色邊緣光 (Rim light)
    const rimLight = new THREE.DirectionalLight(0xffaa77, 0.6);
    rimLight.position.set(-6, 4, -4);
    scene.add(rimLight);
  }

  // 低面數草地基座與小裝飾
  function buildEnvironment() {
    const envGroup = new THREE.Group();

    // 圓形懸浮低面數綠地 (Flat Shaded)
    const islandGeo = new THREE.CylinderGeometry(3.6, 2.8, 0.7, 14);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x76a957,
      flatShading: true,
      roughness: 0.8
    });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.y = -0.35;
    islandMesh.receiveShadow = true;
    envGroup.add(islandMesh);

    // 下層泥土邊緣
    const soilGeo = new THREE.CylinderGeometry(2.8, 1.8, 0.9, 14);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x7a5035,
      flatShading: true,
      roughness: 0.9
    });
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.position.y = -0.95;
    envGroup.add(soilMesh);

    // 裝飾小物：低面數小蘑菇與四葉幸運草
    buildMushrooms(envGroup);
    buildClovers(envGroup);

    scene.add(envGroup);
  }

  // 低面數紅傘小蘑菇
  function buildMushrooms(parent) {
    const positions = [
      { x: -2.3, z: 1.2, s: 0.75 },
      { x: -2.6, z: 0.8, s: 0.55 },
      { x: 2.4, z: -1.3, s: 0.85 }
    ];

    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.45, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff3e3, flatShading: true });
    const capGeo = new THREE.ConeGeometry(0.3, 0.35, 7);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xe63946, flatShading: true });

    positions.forEach(pos => {
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.22;
      stem.castShadow = true;
      mush.add(stem);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.42;
      cap.castShadow = true;
      mush.add(cap);

      mush.position.set(pos.x, 0, pos.z);
      mush.scale.setScalar(pos.s);
      parent.add(mush);
    });
  }

  // 綠草地上的幸運草
  function buildClovers(parent) {
    const cloverGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const cloverMat = new THREE.MeshStandardMaterial({ color: 0x4f8a3d, flatShading: true });

    for (let i = 0; i < 9; i++) {
      const clover = new THREE.Mesh(cloverGeo, cloverMat);
      const angle = (i / 9) * Math.PI * 2;
      const radius = 2.4 + Math.random() * 0.7;
      clover.position.set(Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius);
      clover.scale.set(1 + Math.random() * 0.6, 0.5, 1 + Math.random() * 0.6);
      clover.rotation.y = Math.random() * Math.PI;
      parent.add(clover);
    }
  }

  // --- 建立低面數小熊 (Low-Poly Bear) ---
  function buildLowPolyBear() {
    bearGroup = new THREE.Group();
    bearGroup.position.set(-0.7, 0, -0.2);
    bearGroup.userData = { isBear: true, name: 'bear' };

    // 材質庫 (全數採用 flatShading 展現低面數質感)
    const furMat = new THREE.MeshStandardMaterial({ color: 0x935c34, flatShading: true, roughness: 0.7 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf5e2cb, flatShading: true, roughness: 0.8 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xf8ebd9, flatShading: true, roughness: 0.8 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x22130c, flatShading: true, roughness: 0.4 });
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xd98670, flatShading: true, roughness: 0.8 });

    // 1. 身體 (肥嘟嘟的低面數圓桶)
    const bodyGeo = new THREE.CylinderGeometry(0.68, 0.88, 1.3, 8);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
    bodyMesh.position.y = 0.85;
    bodyMesh.castShadow = true;
    bearGroup.add(bodyMesh);

    // 肚皮白色斑塊
    const bellyGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.85, 7);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, 0.82, 0.28);
    bellyMesh.scale.set(0.9, 1, 0.4);
    bearGroup.add(bellyMesh);

    // 2. 坐姿雙腿 (平放盤坐)
    const legGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.8, 6);
    legGeo.rotateX(Math.PI / 2);

    const leftLeg = new THREE.Mesh(legGeo, furMat);
    leftLeg.position.set(-0.75, 0.28, 0.45);
    leftLeg.rotation.y = -Math.PI / 5;
    leftLeg.castShadow = true;
    bearGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMat);
    rightLeg.position.set(0.75, 0.28, 0.45);
    rightLeg.rotation.y = Math.PI / 5;
    rightLeg.castShadow = true;
    bearGroup.add(rightLeg);

    // 腳掌肉球
    const padGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const leftPad = new THREE.Mesh(padGeo, bellyMat);
    leftPad.position.set(-0.85, 0.28, 0.85);
    leftPad.scale.set(1, 1, 0.4);
    bearGroup.add(leftPad);

    const rightPad = new THREE.Mesh(padGeo, bellyMat);
    rightPad.position.set(0.85, 0.28, 0.85);
    rightPad.scale.set(1, 1, 0.4);
    bearGroup.add(rightPad);

    // 3. 可愛短短的尾巴
    const tailGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const tailMesh = new THREE.Mesh(tailGeo, furMat);
    tailMesh.position.set(0, 0.4, -0.9);
    bearGroup.add(tailMesh);

    // 4. 頭部結構 (建立在 headGroup 上，便於實現點頭、晃動與眼神追蹤)
    headGroup = new THREE.Group();
    headGroup.position.set(0, 1.7, 0.1);

    const headGeo = new THREE.DodecahedronGeometry(0.78, 1);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // 吻部 (Muzzle)
    const muzzleGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzleMesh.position.set(0, -0.12, 0.65);
    muzzleMesh.scale.set(1.1, 0.85, 0.9);
    headGroup.add(muzzleMesh);

    // 黑亮鼻子
    const noseGeo = new THREE.IcosahedronGeometry(0.14, 0);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, -0.04, 1.02);
    headGroup.add(noseMesh);

    // 烏黑眼睛
    const eyeGeo = new THREE.IcosahedronGeometry(0.09, 0);
    const leftEye = new THREE.Mesh(eyeGeo, noseMat);
    leftEye.position.set(-0.32, 0.15, 0.68);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, noseMat);
    rightEye.position.set(0.32, 0.15, 0.68);
    headGroup.add(rightEye);

    // 圓耳朵 (左右耳各有一個 Group，可做輕微抖動動畫)
    const earOuterGeo = new THREE.DodecahedronGeometry(0.28, 0);
    const earInnerGeo = new THREE.DodecahedronGeometry(0.18, 0);

    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.55, 0.65, 0);
    const leftEarOuter = new THREE.Mesh(earOuterGeo, furMat);
    const leftEarInner = new THREE.Mesh(earInnerGeo, earInnerMat);
    leftEarInner.position.set(0, 0, 0.1);
    leftEarGroup.add(leftEarOuter, leftEarInner);
    headGroup.add(leftEarGroup);

    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.55, 0.65, 0);
    const rightEarOuter = new THREE.Mesh(earOuterGeo, furMat);
    const rightEarInner = new THREE.Mesh(earInnerGeo, earInnerMat);
    rightEarInner.position.set(0, 0, 0.1);
    rightEarGroup.add(rightEarOuter, rightEarInner);
    headGroup.add(rightEarGroup);

    ears = [leftEarGroup, rightEarGroup];
    bearGroup.add(headGroup);

    // 5. 手臂關節 (以肩膀為樞軸 Pivot，做拿蘋果動作)
    // 左手臂（待機搭在身旁或歡呼）
    leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.75, 1.25, 0.1);
    const leftArmGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 6);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, furMat);
    leftArmMesh.position.y = -0.38;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);
    leftArmGroup.rotation.z = Math.PI / 10;
    bearGroup.add(leftArmGroup);

    // 右手臂（拿蘋果吃的主要手臂）
    rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.75, 1.25, 0.1);
    const rightArmGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 6);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, furMat);
    rightArmMesh.position.y = -0.38;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);
    rightArmGroup.rotation.z = -Math.PI / 10;
    bearGroup.add(rightArmGroup);

    scene.add(bearGroup);
  }

  // --- 建立低面數幸運蘋果 (Low-Poly Apple) 與木樁桌 ---
  function buildLowPolyApple() {
    // 蘋果放置的樹樁台
    stumpGroup = new THREE.Group();
    stumpGroup.position.set(1.4, 0, 0.5);

    const stumpGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.6, 7);
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true, roughness: 0.9 });
    const stumpMesh = new THREE.Mesh(stumpGeo, stumpMat);
    stumpMesh.position.y = 0.3;
    stumpMesh.receiveShadow = true;
    stumpMesh.castShadow = true;
    stumpGroup.add(stumpMesh);
    scene.add(stumpGroup);

    // 蘋果主體
    appleGroup = new THREE.Group();
    appleInitialPos = new THREE.Vector3(1.4, 0.88, 0.5);
    appleGroup.position.copy(appleInitialPos);
    appleGroup.userData = { isApple: true, name: 'apple' };

    // 紅色蘋果身
    const appleGeo = new THREE.DodecahedronGeometry(0.42, 1);
    const appleMat = new THREE.MeshStandardMaterial({
      color: 0xe63946,
      flatShading: true,
      roughness: 0.45,
      metalness: 0.1
    });
    appleMesh = new THREE.Mesh(appleGeo, appleMat);
    appleMesh.castShadow = true;
    appleGroup.add(appleMesh);

    // 蘋果蒂 (Stem)
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, flatShading: true });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.set(0.02, 0.42, 0);
    stemMesh.rotation.z = -0.2;
    appleGroup.add(stemMesh);

    // 幸運綠葉 (Leaf)
    const leafGeo = new THREE.ConeGeometry(0.14, 0.3, 4);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x70c158, flatShading: true });
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(0.14, 0.45, 0.05);
    leafMesh.rotation.set(0.4, 0, -1.2);
    leafMesh.scale.set(1, 0.3, 1);
    appleGroup.add(leafMesh);

    scene.add(appleGroup);
  }

  // 飄動的微光幸運粒子
  function buildLuckyParticles() {
    const count = 45;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 5 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      scales[i] = Math.random() * 0.8 + 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // 使用低面數微型幾何做粒子
    const pGroup = new THREE.Group();
    const pGeo = new THREE.TetrahedronGeometry(0.06, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.65 });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      p.userData = {
        origY: positions[i * 3 + 1],
        speed: 0.008 + Math.random() * 0.015,
        rotSpeed: 0.02 + Math.random() * 0.03
      };
      pGroup.add(p);
    }

    particleSystem = pGroup;
    scene.add(particleSystem);
  }

  // --- 動畫核心：小熊拿蘋果吃 (Eat Apple Animation) ---
  function eatAppleAction() {
    if (isEating) return;
    isEating = true;
    feedBtn.disabled = true;

    sound.playHover();

    // 隱藏浮動 Tooltips
    appleTooltip.classList.remove('active');
    bearTooltip.classList.remove('active');

    const tl = gsap.timeline({
      onComplete: () => {
        isEating = false;
        feedBtn.disabled = false;
      }
    });

    // 1. 小熊開心注目：頭看向蘋果、耳朵興奮豎起
    tl.to(headGroup.rotation, {
      x: 0.15,
      y: -0.4,
      duration: 0.4,
      ease: 'back.out(2)'
    });
    tl.to(ears[0].rotation, { z: -0.2, duration: 0.25, yoyo: true, repeat: 1 }, 0);
    tl.to(ears[1].rotation, { z: 0.2, duration: 0.25, yoyo: true, repeat: 1 }, 0);

    // 2. 右手伸出拿起蘋果
    tl.to(rightArmGroup.rotation, {
      x: 0.8,
      y: -0.6,
      z: -0.4,
      duration: 0.5,
      ease: 'power2.out'
    });

    // 蘋果飛到小熊掌心
    tl.to(appleGroup.position, {
      x: 0.2,
      y: 1.35,
      z: 0.7,
      duration: 0.5,
      ease: 'power2.inOut'
    }, '-=0.35');

    // 3. 手臂將蘋果送至嘴邊、頭靠近
    tl.to(rightArmGroup.rotation, {
      x: 1.6,
      y: -0.85,
      z: -0.2,
      duration: 0.45,
      ease: 'power3.out'
    });
    tl.to(appleGroup.position, {
      x: -0.1,
      y: 1.65,
      z: 0.85,
      duration: 0.45,
      ease: 'power3.out'
    }, '<');
    tl.to(headGroup.rotation, {
      x: 0.35,
      y: -0.1,
      duration: 0.4
    }, '<');

    // 4. 咬第一大口！(咀嚼動作 1)
    tl.add(() => sound.playCrunch());
    tl.to(headGroup.position, { y: 1.6, duration: 0.08, yoyo: true, repeat: 3 });
    tl.to(appleGroup.scale, { x: 0.75, y: 0.75, z: 0.75, duration: 0.25, ease: 'back.in(1.5)' });

    // 5. 咬第二大口！(咀嚼動作 2)
    tl.to({}, { duration: 0.15 });
    tl.add(() => sound.playCrunch());
    tl.to(headGroup.rotation, { z: 0.15, duration: 0.09, yoyo: true, repeat: 3 });
    tl.to(appleGroup.scale, { x: 0.35, y: 0.35, z: 0.35, duration: 0.25, ease: 'back.in(2)' });

    // 6. 吃光光！(縮小消失)
    tl.to({}, { duration: 0.12 });
    tl.add(() => sound.playCrunch());
    tl.to(appleGroup.scale, { x: 0, y: 0, z: 0, duration: 0.18, ease: 'power2.in' });

    // 7. 幸福大歡呼！雙手舉起、放彩花 (Confetti)
    tl.add(() => {
      sound.playCheer();
      triggerConfetti();
      updateLuckyMeter();
    });

    tl.to(headGroup.rotation, { x: -0.2, y: 0, z: 0, duration: 0.4, ease: 'back.out(2)' });
    tl.to(rightArmGroup.rotation, { x: 2.7, y: 0, z: -0.5, duration: 0.4, ease: 'back.out(2)' }, '<');
    tl.to(leftArmGroup.rotation, { x: 2.7, y: 0, z: 0.5, duration: 0.4, ease: 'back.out(2)' }, '<');
    tl.to(bearGroup.position, { y: 0.3, duration: 0.25, yoyo: true, repeat: 2 }, '<');

    // 8. 歡呼收尾，雙臂放鬆
    tl.to(rightArmGroup.rotation, { x: 0, y: 0, z: -Math.PI / 10, duration: 0.6, ease: 'power2.out' }, '+=0.4');
    tl.to(leftArmGroup.rotation, { x: 0, y: 0, z: Math.PI / 10, duration: 0.6, ease: 'power2.out' }, '<');
    tl.to(headGroup.rotation, { x: 0, y: 0, z: 0, duration: 0.6 }, '<');

    // 9. 一顆全新的幸運蘋果從樹梢蹦跳誕生！
    tl.add(() => {
      sound.playPop();
      appleGroup.position.set(appleInitialPos.x, appleInitialPos.y + 2.5, appleInitialPos.z);
      appleGroup.scale.set(0.1, 0.1, 0.1);
    });

    tl.to(appleGroup.position, {
      y: appleInitialPos.y,
      duration: 0.6,
      ease: 'bounce.out'
    });
    tl.to(appleGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)'
    }, '<');
  }

  // 彩帶特效
  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#e63946', '#ffb703', '#70c158', '#f5e2cb']
      });
    }
  }

  // 更新計數與幸運值
  function updateLuckyMeter() {
    eatenCount++;
    eatenCounterEl.textContent = eatenCount;

    const baseLucky = 100 + eatenCount * 50;
    luckyScoreEl.textContent = `${baseLucky}%`;
    meterFillEl.style.width = '100%';

    // 微彈跳動畫
    luckyScoreEl.style.transform = 'scale(1.3)';
    setTimeout(() => { luckyScoreEl.style.transform = 'scale(1)'; }, 200);
  }

  // --- 事件監聽與滑鼠互動 ---
  function setupEvents() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onCanvasClick);

    // 核心動作按鈕
    feedBtn.addEventListener('click', eatAppleAction);

    // 重置視角
    resetCamBtn.addEventListener('click', () => {
      sound.playHover();
      gsap.to(camera.position, { x: 0, y: 3.2, z: 8.5, duration: 0.8, ease: 'power2.inOut' });
      controls.target.set(0, 1.2, 0);
    });

    // 音效切換
    soundBtn.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      const label = soundBtn.querySelector('.btn-label');
      const icon = soundBtn.querySelector('.btn-icon');
      if (sound.enabled) {
        label.textContent = '音效開啟';
        icon.textContent = '🔊';
        sound.playPop();
      } else {
        label.textContent = '靜音模式';
        icon.textContent = '🔇';
      }
    });

    // 抽籤 Modal
    fortuneBtn.addEventListener('click', drawFortune);
    closeModalBtn.addEventListener('click', () => fortuneModal.classList.add('hidden'));
    acceptFortuneBtn.addEventListener('click', () => {
      fortuneModal.classList.add('hidden');
      eatAppleAction(); // 順便吃一顆
    });
    fortuneModal.addEventListener('click', (e) => {
      if (e.target === fortuneModal) fortuneModal.classList.add('hidden');
    });
  }

  // 視窗尺寸重置
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // 滑鼠懸停與小熊目光追蹤
  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 小熊頭部與目光跟隨滑鼠 (當沒有在做吃蘋果動作時)
    if (!isEating && headGroup) {
      const targetRotY = mouse.x * 0.45;
      const targetRotX = -mouse.y * 0.25;
      gsap.to(headGroup.rotation, {
        y: targetRotY,
        x: targetRotX,
        duration: 0.4,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }

    // 懸停射線檢測
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([appleGroup, bearGroup], true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let targetObj = hit.object;

      // 向上尋找是蘋果還是小熊
      while (targetObj.parent && !targetObj.userData.isApple && !targetObj.userData.isBear) {
        targetObj = targetObj.parent;
      }

      if (targetObj.userData.isApple) {
        if (hoveredObject !== 'apple') {
          hoveredObject = 'apple';
          sound.playHover();
          container.style.cursor = 'pointer';
          appleTooltip.classList.add('active');
          gsap.to(appleMesh.rotation, { y: appleMesh.rotation.y + 0.8, duration: 0.3 });
        }
      } else if (targetObj.userData.isBear) {
        if (hoveredObject !== 'bear') {
          hoveredObject = 'bear';
          sound.playHover();
          container.style.cursor = 'pointer';
          bearTooltip.classList.add('active');
          // 逗耳朵
          gsap.to(ears[0].rotation, { z: -0.35, duration: 0.15, yoyo: true, repeat: 1 });
          gsap.to(ears[1].rotation, { z: 0.35, duration: 0.15, yoyo: true, repeat: 1 });
        }
      }
    } else {
      if (hoveredObject) {
        hoveredObject = null;
        container.style.cursor = 'grab';
        appleTooltip.classList.remove('active');
        bearTooltip.classList.remove('active');
      }
    }

    updateTooltips(event.clientX, event.clientY);
  }

  let pointerDownPos = { x: 0, y: 0 };
  window.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  // 點擊場景中的 3D 物件 (點擊蘋果或小熊皆可觸發吃蘋果)
  function onCanvasClick(event) {
    // 若為旋轉視角的拖曳動作（移動超過 6px），不判定為點擊
    const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
    if (dist > 6) return;

    // 若點擊的是 UI 按鈕，則交給一般 DOM 事件處理
    if (event.target.closest('.interactive-overlay') || event.target.closest('.hud-header') || event.target.closest('.modal-backdrop') || event.target.closest('.lucky-meter-panel')) {
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([appleGroup, bearGroup], true);

    if (intersects.length > 0) {
      eatAppleAction();
    }
  }

  // 更新 3D 浮動標籤位置
  function updateTooltips(screenX, screenY) {
    if (appleTooltip.classList.contains('active')) {
      appleTooltip.style.left = `${screenX}px`;
      appleTooltip.style.top = `${screenY - 18}px`;
    }
    if (bearTooltip.classList.contains('active')) {
      bearTooltip.style.left = `${screenX}px`;
      bearTooltip.style.top = `${screenY - 18}px`;
    }
  }

  // 抽幸運籤內容庫
  const fortunes = [
    {
      title: '蘋安大吉・熊有元氣',
      desc: '小熊咬了一口多汁的蘋果，將滿滿的甜美與幸運送給努力的你。今天做什麼事都無比順利！',
      color: '蘋果紅 & 暖焦糖'
    },
    {
      title: '碩果豐收・事事順遂',
      desc: '樹上的金蘋果正在成熟，耐心等待必有驚喜。帶著好心情前進，幸運之神就在轉角處微笑！',
      color: '翡翠綠 & 蜜橙黃'
    },
    {
      title: '心滿意足・溫暖相伴',
      desc: '即使是一顆小小的蘋果，也能帶來大大的滿足。今天適合給自己一個溫柔的擁抱與好吃的甜點！',
      color: '奶油白 & 象牙金'
    }
  ];

  function drawFortune() {
    sound.playPop();
    const item = fortunes[Math.floor(Math.random() * fortunes.length)];
    document.getElementById('fortune-title').textContent = item.title;
    document.getElementById('fortune-desc').textContent = item.desc;
    document.getElementById('lucky-color').textContent = item.color;
    fortuneModal.classList.remove('hidden');
    triggerConfetti();
  }

  // --- 主渲染循環 (Animation Loop) ---
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // 1. 小熊呼吸閒置動畫 (Idle)
    if (!isEating && bearGroup) {
      bearGroup.position.y = Math.sin(elapsedTime * 2.2) * 0.03;
      leftArmGroup.rotation.z = Math.PI / 10 + Math.sin(elapsedTime * 1.8) * 0.04;
    }

    // 2. 蘋果在木樁上微微呼吸浮動
    if (!isEating && appleGroup) {
      appleGroup.position.y = appleInitialPos.y + Math.sin(elapsedTime * 2.8) * 0.035;
      appleMesh.rotation.y = elapsedTime * 0.4;
    }

    // 3. 飄動幸運粒子旋轉與飄升
    if (particleSystem) {
      particleSystem.children.forEach(p => {
        p.position.y += p.userData.speed;
        p.rotation.x += p.userData.rotSpeed;
        p.rotation.y += p.userData.rotSpeed;
        if (p.position.y > 5.5) {
          p.position.y = 0.2;
        }
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }

  // 啟動
  initScene();
})();
