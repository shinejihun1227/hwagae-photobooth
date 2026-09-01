(() => {
  const filters = {
    soft: { label: "SOFT FLASH", copy: "피부 톤은 부드럽게, 하이라이트는 살짝", css: "brightness(1.08) contrast(.94) saturate(1.08)" },
    warm: { label: "AUTUMN HONEY", copy: "가을빛을 한 스푼 더한 따뜻한 웜톤", css: "sepia(.1) saturate(1.15) contrast(1.02) brightness(1.06)" },
    film: { label: "FILM GRAIN", copy: "따뜻한 입자감과 빈티지 텍스처", css: "sepia(.18) contrast(1.08) saturate(.95) brightness(1.02)" },
    vivid: { label: "COLOR POP", copy: "축제의 색을 또렷하고 선명하게", css: "saturate(1.35) contrast(1.1) brightness(1.02)" },
    cool: { label: "BLUE HOUR", copy: "밤공기처럼 맑고 차분한 블루톤", css: "saturate(.9) contrast(1.04) brightness(1.04) hue-rotate(12deg)" },
    mono: { label: "MONO MOOD", copy: "표정과 실루엣만 선명하게", css: "grayscale(1) contrast(1.12) brightness(1.04)" },
    retro: { label: "MELLOW RETRO", copy: "바랜 사진처럼 부드러운 레트로", css: "sepia(.24) saturate(.86) contrast(.96) brightness(1.04)" },
    night: { label: "NIGHT GLOW", copy: "등불과 무대 조명을 깊게 담아서", css: "saturate(1.3) contrast(1.08) brightness(.95) hue-rotate(8deg)" }
  };

  const frameLabels = { market: "MARKET NIGHT", pierrot: "PIERROT CIRCUS" };
  const poses = [
    ["엔딩요정 포즈", "마지막 컷에는 손 하트, 기억해두기!"],
    ["삐에로 모드", "눈 크게, 턱 살짝! 과감할수록 귀여워요."],
    ["시장 한바퀴", "서로의 어깨를 톡, 시선은 반대로."],
    ["무심한 브이", "카메라보다 15도 옆을 바라봐요."],
    ["친구 인증샷", "팔짱 끼고 웃음은 120%로!"],
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const body = document.body;
  const stage = $("#captureStage");
  const themeScreen = $("#themeScreen");
  const themePreview = $("#themePreview");
  const themePreviewLabel = $("#themePreviewLabel");
  const video = $("#video");
  const cameraWindow = $(".camera-window");
  const cameraComposite = $("#cameraComposite");
  const fallback = $("#cameraFallback");
  const countdown = $("#countdown");
  const flash = $("#flash");
  const cameraPoongGuide = $("#cameraPoongGuide");
  const cameraPoongGuideCanvas = $("#cameraPoongGuideCanvas");
  const cameraPoongGuideLabel = $("#cameraPoongGuideLabel");
  const accessoryList = $("#accessoryList");
  const shotCount = $("#shotCount");
  const shotDots = $$("#shotDots i");
  const cameraStatus = $("#cameraStatus");
  const resultImage = $("#resultImage");
  const resultFrameLabel = $("#resultFrameLabel");
  const autoEnhanceToggle = $("#autoEnhance");
  const cauAnniversaryMark = $("#cauAnniversaryMark");
  const frameSwatchArt = { market: $("#frameSwatchMarket"), pierrot: $("#frameSwatchPierrot") };
  const controlPanel = $("#controlPanel");
  const boothActions = $("#boothActions");
  const resultActions = $("#resultActions");
  const startButton = $("#btnStart");
  const enterButton = $("#btnEnterBooth");
  const captureButton = $("#btnCapture");
  const backThemeButton = $("#btnBackTheme");
  const cameraActions = $("#cameraActions");
  const startLabel = $("#startLabel");
  const actionNote = $("#actionNote");
  const toast = $("#toast");
  const downloadLink = $("#downloadLink");
  const accessoryPreviewModal = $("#accessoryPreviewModal");
  const accessoryModalCanvas = $("#accessoryModalCanvas");
  const accessoryModalTitle = $("#accessoryModalTitle");
  const accessoryModalDescription = $("#accessoryModalDescription");
  const accessoryModalClose = $("#accessoryModalClose");
  const accessoryModalConfirm = $("#accessoryModalConfirm");

  let selectedFrame = "market";
  let selectedFilter = "soft";
  let selectedAccessory = "poong-band";
  let autoEnhance = true;
  let currentPose = 0;
  let facingMode = "user";
  let stream = null;
  let shots = [];
  let resultDataUrl = "";
  let demoMode = false;
  let busy = false;
  let activeShotIndex = 0;
  let previewPoong = null;
  let themedPoong = { market: null, pierrot: null };
  let themedExpressions = { market: null, pierrot: null };
  let marketBackground = null;
  let pierrotBackground = null;
  let expressionPoong = [];
  let segmentationModel = null;
  let segmentationSetupPromise = null;
  let pendingSegmentation = null;
  let liveSegmentationTimer = null;
  let liveSegmentationBusy = false;
  let faceDetector = null;
  let faceDetectionSetupPromise = null;
  let pendingFaceDetection = null;
  let liveFaceDetectionTimer = null;
  let liveFaceDetectionBusy = false;
  let latestLiveMask = null;
  let latestFaceDetections = [];
  const expressionModes = ["pink", "dark", "black", "pink"];
  const poongArtworkCache = new WeakMap();
  const accessoryLabels = {
    "poong-band": { title: "푸앙 머리띠", description: "푸앙이 얼굴을 기준으로 머리띠가 이렇게 씌워져요." },
    "maple-pin": { title: "낙엽 핀", description: "푸앙이 얼굴 옆에 낙엽 핀이 이렇게 꽂혀요." },
    "star-clip": { title: "별 머리핀", description: "푸앙이 얼굴 옆에 반짝이는 별 핀이 이렇게 보여요." },
    "flower-clip": { title: "꽃 머리핀", description: "푸앙이 얼굴 옆에 작은 꽃 장식이 이렇게 피어요." },
    "heart-cheek": { title: "하트 스티커", description: "푸앙이 양 볼에 귀여운 하트 포인트가 이렇게 남아요." },
    none: { title: "액세서리 없음", description: "푸앙이 얼굴에 아무 액세서리도 없이 깔끔하게 보여요." },
  };
  let accessoryModalTrigger = null;

  function setFlow(flow) {
    const mode = flow === "camera" ? "camera" : flow === "result" ? "result" : "home";
    body.dataset.flow = flow;
    stage.dataset.mode = mode;
    stage.hidden = flow !== "camera" && flow !== "result";
    themeScreen.hidden = flow !== "theme";
    const step = flow === "camera" ? 2 : flow === "result" ? 3 : 1;
    $$(".step").forEach((el) => el.classList.toggle("active", Number(el.dataset.step) === step));
    controlPanel.hidden = flow !== "theme";
    boothActions.hidden = flow !== "theme";
    cameraActions.hidden = flow !== "camera";
    resultActions.hidden = flow !== "result";
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function sleep(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

  function loadSegmentationScript() {
    if (window.SelfieSegmentation) return Promise.resolve(true);
    if (segmentationSetupPromise) return segmentationSetupPromise;
    segmentationSetupPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      let settled = false;
      const finish = (available) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(available);
      };
      const timeout = window.setTimeout(() => finish(false), 7000);
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";
      script.crossOrigin = "anonymous";
      script.onload = () => finish(Boolean(window.SelfieSegmentation));
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    });
    return segmentationSetupPromise;
  }

  function loadFaceDetectionScript() {
    if (window.FaceDetection) return Promise.resolve(true);
    if (faceDetectionSetupPromise) return faceDetectionSetupPromise;
    faceDetectionSetupPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      let settled = false;
      const finish = (available) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(available);
      };
      const timeout = window.setTimeout(() => finish(false), 7000);
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js";
      script.crossOrigin = "anonymous";
      script.onload = () => finish(Boolean(window.FaceDetection));
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    });
    return faceDetectionSetupPromise;
  }

  async function prepareSegmentation() {
    if (segmentationModel) return true;
    const available = await loadSegmentationScript();
    if (!available) return false;
    try {
      const model = new window.SelfieSegmentation({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
      model.setOptions({ modelSelection: 1 });
      model.onResults((results) => {
        const mask = results?.segmentationMask || null;
        latestLiveMask = mask;
        if (pendingSegmentation) {
          const resolve = pendingSegmentation;
          pendingSegmentation = null;
          resolve(mask);
        }
        if (mask && !busy && !demoMode && body.dataset.flow === "camera") {
          renderLiveCamera(mask, latestFaceDetections);
        }
      });
      if (typeof model.initialize === "function") await model.initialize();
      segmentationModel = model;
      return true;
    } catch (error) {
      console.warn("Person background segmentation is unavailable", error);
      segmentationModel = null;
      return false;
    }
  }

  async function prepareFaceDetection() {
    if (faceDetector) return true;
    const available = await loadFaceDetectionScript();
    if (!available) return false;
    try {
      const detector = new window.FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.0/${file}`,
      });
      detector.setOptions({ model: "short", minDetectionConfidence: 0.55 });
      detector.onResults((results) => {
        const detections = results?.detections || [];
        latestFaceDetections = detections;
        if (pendingFaceDetection) {
          const resolve = pendingFaceDetection;
          pendingFaceDetection = null;
          resolve(detections);
        }
        if (!busy && !demoMode && body.dataset.flow === "camera") {
          if (latestLiveMask) renderLiveCamera(latestLiveMask, detections);
          else renderLiveAccessories(detections);
        }
      });
      faceDetector = detector;
      return true;
    } catch (error) {
      console.warn("Face accessory detection is unavailable", error);
      faceDetector = null;
      return false;
    }
  }

  function requestSegmentation() {
    if (!segmentationModel || !video.videoWidth) return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (mask) => {
        if (settled) return;
        settled = true;
        if (pendingSegmentation === finish) pendingSegmentation = null;
        window.clearTimeout(timeout);
        resolve(mask);
      };
      const timeout = window.setTimeout(() => finish(null), 1600);
      pendingSegmentation = finish;
      segmentationModel.send({ image: video }).catch(() => finish(null));
    });
  }

  function requestFaceDetections() {
    if (!faceDetector || !video.videoWidth) return Promise.resolve([]);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (detections) => {
        if (settled) return;
        settled = true;
        if (pendingFaceDetection === finish) pendingFaceDetection = null;
        window.clearTimeout(timeout);
        resolve(detections || []);
      };
      const timeout = window.setTimeout(() => finish([]), 1400);
      pendingFaceDetection = finish;
      faceDetector.send({ image: video }).catch(() => finish([]));
    });
  }

  function stopStream() {
    stopLiveSegmentation();
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }

  function mapFacePoint(point, crop, width, height) {
    if (!point || !crop?.sourceWidth || !crop?.sourceHeight) return null;
    const rawX = point.x * video.videoWidth;
    const rawY = point.y * video.videoHeight;
    const croppedX = (rawX - crop.sourceX) / crop.sourceWidth;
    const croppedY = (rawY - crop.sourceY) / crop.sourceHeight;
    const outputX = facingMode === "user" ? 1 - croppedX : croppedX;
    return { x: outputX * width, y: croppedY * height };
  }

  function getFaceGeometry(detection, crop, width, height) {
    const landmarks = detection?.landmarks || [];
    const mapped = landmarks.map((point) => mapFacePoint(point, crop, width, height));
    const eyeOne = mapped[0];
    const eyeTwo = mapped[1];
    if (eyeOne && eyeTwo) {
      const eyeDistance = Math.hypot(eyeTwo.x - eyeOne.x, eyeTwo.y - eyeOne.y);
      const earOne = mapped[4];
      const earTwo = mapped[5];
      const earDistance = earOne && earTwo ? Math.hypot(earTwo.x - earOne.x, earTwo.y - earOne.y) : 0;
      const faceWidth = Math.max(eyeDistance * 2.2, earDistance * 1.08);
      return {
        x: (eyeOne.x + eyeTwo.x) / 2,
        y: (eyeOne.y + eyeTwo.y) / 2 - eyeDistance * .9,
        width: faceWidth,
        angle: Math.atan2(eyeTwo.y - eyeOne.y, eyeTwo.x - eyeOne.x),
      };
    }
    const box = detection?.locationData?.relativeBoundingBox || detection?.boundingBox;
    if (!box) return null;
    const x = box.xMin != null ? box.xMin + box.width / 2 : box.xCenter;
    const y = box.yMin != null ? box.yMin : box.yCenter - box.height / 2;
    if (![x, y, box.width, box.height].every(Number.isFinite)) return null;
    const boxX = (facingMode === "user" ? 1 - x : x) * width;
    return { x: boxX, y: y * height, width: box.width * width * 1.08, angle: 0 };
  }

  function drawPoongHeadband(ctx, width) {
    const bandWidth = width * 1.08;
    const bandHeight = Math.max(17, width * .13);
    const bandGradient = ctx.createLinearGradient(-bandWidth / 2, 0, bandWidth / 2, bandHeight);
    bandGradient.addColorStop(0, "#ffd76a");
    bandGradient.addColorStop(.48, "#ef9c58");
    bandGradient.addColorStop(1, "#d34b53");
    ctx.save();
    ctx.shadowColor = "rgba(23, 7, 15, .36)";
    ctx.shadowBlur = Math.max(5, width * .04);
    roundedRect(ctx, -bandWidth / 2, 0, bandWidth, bandHeight, bandHeight / 2);
    ctx.fillStyle = bandGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 244, 207, .86)";
    ctx.lineWidth = Math.max(2, width * .012);
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255, 246, 210, .9)";
    for (let x = -bandWidth * .34; x <= bandWidth * .34; x += bandWidth * .22) {
      ctx.beginPath();
      ctx.arc(x, bandHeight / 2, Math.max(2, width * .018), 0, Math.PI * 2);
      ctx.fill();
    }

    const poongRadius = Math.max(16, width * .14);
    const poongY = -poongRadius * .82;
    ctx.fillStyle = "#5cc3e8";
    ctx.beginPath(); ctx.arc(0, poongY, poongRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#173451";
    ctx.lineWidth = Math.max(1.5, width * .01);
    ctx.stroke();
    ctx.fillStyle = "#f5fbf5";
    ctx.beginPath(); ctx.ellipse(-poongRadius * .36, poongY - poongRadius * .35, poongRadius * .2, poongRadius * .28, -.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(poongRadius * .36, poongY - poongRadius * .35, poongRadius * .2, poongRadius * .28, .35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#163451";
    ctx.beginPath(); ctx.arc(-poongRadius * .34, poongY - poongRadius * .02, poongRadius * .11, 0, Math.PI * 2); ctx.arc(poongRadius * .34, poongY - poongRadius * .02, poongRadius * .11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#173451";
    ctx.lineWidth = Math.max(1.3, width * .008);
    ctx.beginPath(); ctx.arc(0, poongY + poongRadius * .12, poongRadius * .22, .15, Math.PI - .15); ctx.stroke();
    ctx.strokeStyle = "#5cc3e8";
    ctx.lineWidth = Math.max(2, width * .012);
    ctx.beginPath(); ctx.moveTo(-poongRadius * .6, poongY - poongRadius * .62); ctx.lineTo(-poongRadius * .98, poongY - poongRadius * 1.22); ctx.moveTo(poongRadius * .6, poongY - poongRadius * .62); ctx.lineTo(poongRadius * .98, poongY - poongRadius * 1.22); ctx.stroke();
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath(); ctx.arc(-poongRadius * .98, poongY - poongRadius * 1.22, poongRadius * .12, 0, Math.PI * 2); ctx.arc(poongRadius * .98, poongY - poongRadius * 1.22, poongRadius * .12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMapleHairpin(ctx, width) {
    ctx.save();
    ctx.translate(width * .42, -width * .16);
    ctx.rotate(.22);
    drawMapleLeaf(ctx, 0, 0, Math.max(7, width * .075), -.18, "#e45a4f");
    ctx.strokeStyle = "#ffd76a";
    ctx.lineWidth = Math.max(2, width * .012);
    ctx.beginPath(); ctx.moveTo(0, width * .07); ctx.lineTo(0, width * .3); ctx.stroke();
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath(); ctx.arc(0, width * .33, Math.max(3, width * .025), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawStarShape(ctx, x, y, outerRadius, innerRadius, fill, stroke = "rgba(255, 244, 207, .85)") {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      const pointX = Math.cos(angle) * radius;
      const pointY = Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(pointX, pointY);
      else ctx.lineTo(pointX, pointY);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.shadowColor = "rgba(255, 208, 93, .42)";
    ctx.shadowBlur = Math.max(3, outerRadius * .32);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(.8, outerRadius * .08);
    ctx.stroke();
    ctx.restore();
  }

  function drawHeartShape(ctx, x, y, size, fill, stroke = "rgba(255, 239, 224, .8)") {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size * .86);
    ctx.bezierCurveTo(-size * .12, size * .65, -size * .78, size * .2, -size * .58, -size * .24);
    ctx.bezierCurveTo(-size * .46, -size * .7, -.05 * size, -size * .66, 0, -size * .3);
    ctx.bezierCurveTo(.05 * size, -size * .66, size * .46, -size * .7, size * .58, -size * .24);
    ctx.bezierCurveTo(size * .78, size * .2, size * .12, size * .65, 0, size * .86);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.shadowColor = "rgba(235, 80, 116, .35)";
    ctx.shadowBlur = Math.max(3, size * .2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(.8, size * .08);
    ctx.stroke();
    ctx.restore();
  }

  function drawStarClip(ctx, width) {
    const size = Math.max(8, width * .105);
    ctx.save();
    ctx.translate(-width * .4, -width * .14);
    ctx.rotate(-.18);
    drawStarShape(ctx, 0, 0, size, size * .42, "#ffd05d");
    drawStarShape(ctx, size * .72, size * .45, size * .28, size * .1, "#f07a5c", "rgba(255, 244, 207, .65)");
    ctx.strokeStyle = "#e9a74f";
    ctx.lineWidth = Math.max(1.5, width * .012);
    ctx.beginPath(); ctx.moveTo(-size * .2, size * .72); ctx.lineTo(size * .34, size * 1.24); ctx.stroke();
    ctx.restore();
  }

  function drawFlowerClip(ctx, width) {
    const size = Math.max(8, width * .115);
    ctx.save();
    ctx.translate(width * .39, -width * .12);
    ctx.rotate(.16);
    ctx.shadowColor = "rgba(255, 120, 126, .32)";
    ctx.shadowBlur = Math.max(3, size * .2);
    for (let petal = 0; petal < 6; petal += 1) {
      const angle = petal * Math.PI / 3;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = petal % 2 ? "#f59b9b" : "#ffcf70";
      ctx.beginPath();
      ctx.ellipse(0, -size * .42, size * .3, size * .48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#8d4a55";
    ctx.beginPath(); ctx.arc(0, 0, size * .24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath(); ctx.arc(-size * .06, -size * .06, size * .09, 0, Math.PI * 2); ctx.fill();
    drawMapleLeaf(ctx, -size * 1.05, size * .86, size * .32, -.7, "#86bd86");
    ctx.restore();
  }

  function drawHeartCheek(ctx, width) {
    const size = Math.max(8, width * .075);
    ctx.save();
    drawHeartShape(ctx, -width * .31, width * .1, size, "#f47f9a");
    drawHeartShape(ctx, width * .31, width * .1, size * .88, "#f47f9a");
    ctx.restore();
  }

  function drawAccessory(ctx, accessory, width) {
    if (accessory === "maple-pin") drawMapleHairpin(ctx, width);
    else if (accessory === "poong-band") drawPoongHeadband(ctx, width);
    else if (accessory === "star-clip") drawStarClip(ctx, width);
    else if (accessory === "flower-clip") drawFlowerClip(ctx, width);
    else if (accessory === "heart-cheek") drawHeartCheek(ctx, width);
  }

  function drawFaceAccessories(ctx, detections, crop, width, height) {
    if (selectedAccessory === "none" || !detections?.length) return;
    detections.slice(0, 4).forEach((detection) => {
      const face = getFaceGeometry(detection, crop, width, height);
      if (!face || face.width < width * .035) return;
      ctx.save();
      ctx.translate(face.x, face.y);
      ctx.rotate(face.angle);
      drawAccessory(ctx, selectedAccessory, face.width);
      ctx.restore();
    });
  }

  function drawAccessoryPreviews() {
    $$('[data-accessory-preview]').forEach((canvas) => {
      const ctx = configureCanvasContext(canvas.getContext("2d"));
      if (!ctx) return;
      drawAccessoryPreviewScene(ctx, canvas.dataset.accessoryPreview, canvas.width, canvas.height);
    });
  }

  function drawVectorAccessoryPreviewScene(ctx, accessory, width, height) {
    const faceWidth = Math.min(width * .48, height * .58);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height * .64);

    const faceGradient = ctx.createLinearGradient(0, -height * .28, 0, height * .1);
    faceGradient.addColorStop(0, "rgba(111, 207, 235, .98)");
    faceGradient.addColorStop(1, "rgba(49, 139, 190, .98)");
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.ellipse(0, 2, faceWidth * .4, height * .3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(14, 44, 73, .78)";
    ctx.lineWidth = Math.max(1.4, width * .0022);
    ctx.stroke();
    ctx.fillStyle = "rgba(247, 253, 245, .9)";
    ctx.beginPath();
    ctx.ellipse(-faceWidth * .14, -height * .09, faceWidth * .08, height * .1, -.25, 0, Math.PI * 2);
    ctx.ellipse(faceWidth * .14, -height * .09, faceWidth * .08, height * .1, .25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#163451";
    ctx.beginPath();
    ctx.arc(-faceWidth * .14, 1, Math.max(2, width * .022), 0, Math.PI * 2);
    ctx.arc(faceWidth * .14, 1, Math.max(2, width * .022), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(22, 52, 81, .9)";
    ctx.lineWidth = Math.max(1.2, width * .002);
    ctx.beginPath();
    ctx.arc(0, height * .07, faceWidth * .13, .15, Math.PI - .15);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 159, 168, .7)";
    ctx.beginPath();
    ctx.arc(-faceWidth * .31, height * .06, faceWidth * .07, 0, Math.PI * 2);
    ctx.arc(faceWidth * .31, height * .06, faceWidth * .07, 0, Math.PI * 2);
    ctx.fill();

    drawAccessory(ctx, accessory, faceWidth);
    ctx.restore();
  }

  function drawAccessoryPreviewScene(ctx, accessory, width, height) {
    const artworkSource = themedPoong[selectedFrame] || previewPoong;
    const sourceWidth = artworkSource?.naturalWidth || artworkSource?.width;
    const sourceHeight = artworkSource?.naturalHeight || artworkSource?.height;
    if (artworkSource && sourceWidth && sourceHeight) {
      const artwork = getPoongArtwork(artworkSource, "neutral");
      const aspectRatio = sourceWidth / sourceHeight;
      const artWidth = Math.min(width * .76, height * aspectRatio * .94);
      const artHeight = artWidth / aspectRatio;
      const artX = (width - artWidth) / 2;
      const artY = height - artHeight - height * .01;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, .28)";
      ctx.shadowBlur = Math.max(4, width * .02);
      ctx.drawImage(artwork, artX, artY, artWidth, artHeight);
      ctx.restore();
      ctx.save();
      ctx.translate(width / 2, artY + artHeight * .245);
      drawAccessory(ctx, accessory, artWidth * .55);
      ctx.restore();
      return;
    }
    drawVectorAccessoryPreviewScene(ctx, accessory, width, height);
  }

  function openAccessoryPreview(accessory, trigger) {
    if (!accessoryPreviewModal || !accessoryModalCanvas) return;
    const copy = accessoryLabels[accessory] || accessoryLabels.none;
    accessoryModalTrigger = trigger || null;
    accessoryModalTitle.textContent = copy.title;
    accessoryModalDescription.textContent = copy.description;
    const ctx = configureCanvasContext(accessoryModalCanvas.getContext("2d"));
    if (ctx) drawAccessoryPreviewScene(ctx, accessory, accessoryModalCanvas.width, accessoryModalCanvas.height);
    accessoryPreviewModal.hidden = false;
    document.body.classList.add("accessory-modal-open");
    accessoryModalClose?.focus();
  }

  function closeAccessoryPreview() {
    if (!accessoryPreviewModal) return;
    accessoryPreviewModal.hidden = true;
    document.body.classList.remove("accessory-modal-open");
    accessoryModalTrigger?.focus();
    accessoryModalTrigger = null;
  }

  function renderLiveCamera(mask, detections = latestFaceDetections) {
    if (!cameraComposite || !mask || !video.videoWidth || !cameraComposite.getContext("2d")) return;
    const canvas = cameraComposite;
    const ctx = configureCanvasContext(canvas.getContext("2d"));
    if (!ctx) return;
    const crop = getVideoCrop();
    const background = document.createElement("canvas");
    background.width = canvas.width; background.height = canvas.height;
    const backgroundCtx = configureCanvasContext(background.getContext("2d"));
    backgroundCtx.filter = filters[selectedFilter].css;
    drawPreviewPhoto(backgroundCtx, 0, 0, canvas.width, canvas.height, selectedFrame, activeShotIndex);
    backgroundCtx.filter = "none";

    const subject = document.createElement("canvas");
    subject.width = canvas.width; subject.height = canvas.height;
    const subjectCtx = configureCanvasContext(subject.getContext("2d"));
    subjectCtx.filter = filters[selectedFilter].css;
    drawVideoFrame(subjectCtx, subject, crop);
    subjectCtx.filter = "none";

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width; maskCanvas.height = canvas.height;
    const maskCtx = configureCanvasContext(maskCanvas.getContext("2d"));
    drawSegmentationMask(maskCtx, maskCanvas, mask, crop);
    subjectCtx.globalCompositeOperation = "destination-in";
    subjectCtx.drawImage(maskCanvas, 0, 0);
    subjectCtx.globalCompositeOperation = "source-over";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0);
    ctx.drawImage(subject, 0, 0);
    drawFaceAccessories(ctx, detections, crop, canvas.width, canvas.height);
    cameraComposite.classList.add("ready");
  }

  function renderLiveAccessories(detections = latestFaceDetections) {
    if (!cameraComposite || !video.videoWidth || !cameraComposite.getContext("2d")) return;
    const ctx = configureCanvasContext(cameraComposite.getContext("2d"));
    if (!ctx) return;
    const crop = getVideoCrop();
    ctx.clearRect(0, 0, cameraComposite.width, cameraComposite.height);
    drawFaceAccessories(ctx, detections, crop, cameraComposite.width, cameraComposite.height);
    cameraComposite.classList.toggle("ready", selectedAccessory !== "none" && detections.length > 0);
  }

  function stopLiveSegmentation() {
    if (liveSegmentationTimer) window.clearTimeout(liveSegmentationTimer);
    if (liveFaceDetectionTimer) window.clearTimeout(liveFaceDetectionTimer);
    liveSegmentationTimer = null;
    liveFaceDetectionTimer = null;
    liveSegmentationBusy = false;
    liveFaceDetectionBusy = false;
    latestLiveMask = null;
    latestFaceDetections = [];
    cameraComposite?.classList.remove("ready");
  }

  function scheduleLiveSegmentation() {
    if (liveSegmentationTimer) window.clearTimeout(liveSegmentationTimer);
    liveSegmentationTimer = window.setTimeout(async () => {
      liveSegmentationTimer = null;
      if (!segmentationModel || !stream || demoMode || busy || body.dataset.flow !== "camera" || !video.videoWidth) return;
      if (liveSegmentationBusy) return scheduleLiveSegmentation();
      liveSegmentationBusy = true;
      try {
        await segmentationModel.send({ image: video });
      } catch (error) {
        cameraComposite?.classList.remove("ready");
      } finally {
        liveSegmentationBusy = false;
        scheduleLiveSegmentation();
      }
    }, 140);
  }

  function scheduleLiveFaceDetection() {
    if (liveFaceDetectionTimer) window.clearTimeout(liveFaceDetectionTimer);
    liveFaceDetectionTimer = window.setTimeout(async () => {
      liveFaceDetectionTimer = null;
      if (!faceDetector || !stream || demoMode || busy || body.dataset.flow !== "camera" || !video.videoWidth) return;
      if (liveFaceDetectionBusy) return scheduleLiveFaceDetection();
      liveFaceDetectionBusy = true;
      try {
        await faceDetector.send({ image: video });
      } catch (error) {
        latestFaceDetections = [];
        renderLiveAccessories([]);
      } finally {
        liveFaceDetectionBusy = false;
        scheduleLiveFaceDetection();
      }
    }, 180);
  }

  async function openCamera() {
    demoMode = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      demoMode = true;
      fallback.classList.remove("hidden");
      cameraStatus.textContent = "브라우저 데모 모드 · 촬영은 계속할 수 있어요";
      showToast("카메라를 지원하지 않아 데모 모드로 시작했어요.");
      return;
    }
    stopStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 900 }, height: { ideal: 1200 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      fallback.classList.add("hidden");
      video.style.transform = facingMode === "user" ? "scaleX(-1)" : "none";
      cameraStatus.textContent = "실시간 카메라 · 테마 배경 준비 중";
      actionNote.textContent = "4초 간격으로 네 장을 촬영해요. 포즈 카드를 참고해보세요.";
      Promise.all([prepareSegmentation(), prepareFaceDetection()]).then(([segmentationReady, faceReady]) => {
        if (body.dataset.flow !== "camera" || busy) return;
        cameraStatus.textContent = segmentationReady && faceReady
          ? "실시간 카메라 · 테마 배경과 푸앙 액세서리 준비 완료"
          : faceReady
            ? "실시간 카메라 · 푸앙 액세서리 준비 완료"
            : segmentationReady
              ? "실시간 카메라 · 테마 배경 합성 준비 완료"
              : "실시간 카메라 · 표정 준비 완료";
        if (segmentationReady) scheduleLiveSegmentation();
        if (faceReady) scheduleLiveFaceDetection();
      });
    } catch (error) {
      demoMode = true;
      fallback.classList.remove("hidden");
      cameraStatus.textContent = "데모 모드 · 카메라 권한 없이 촬영 중";
      actionNote.textContent = "카메라 권한이 없어도 샘플 컷으로 완성본을 확인할 수 있어요.";
      showToast("카메라 권한을 사용할 수 없어 데모 모드로 시작했어요.");
    }
  }

  function resetDots() {
    shotDots.forEach((dot) => dot.classList.remove("active", "done"));
    shotCount.textContent = "0 / 4";
    activeShotIndex = 0;
    updateCameraPoongGuide(activeShotIndex);
  }

  function updateFrameSelection() {
    $$(".frame-option").forEach((button) => button.classList.toggle("selected", button.dataset.frame === selectedFrame));
    if (cameraWindow) cameraWindow.dataset.frame = selectedFrame;
    drawAccessoryPreviews();
    drawThemePreview();
    updateCameraPoongGuide(activeShotIndex);
  }

  function getFourCutStickerLayout(index) {
    const photoWidth = 360;
    const photoHeight = 270;
    const padding = 32;
    const gap = 18;
    const header = 124;
    const expressionSheet = themedExpressions[selectedFrame];
    const hasThemedArtwork = Boolean(expressionSheet || themedPoong[selectedFrame]);
    const width = hasThemedArtwork ? 178 : 146;
    const height = hasThemedArtwork ? 198 : 176;
    const column = index % 2;
    const row = Math.floor(index / 2);
    // Keep every character on the right edge of its own photo. The same base
    // coordinates are reused by the final strip and the live camera guide.
    const localX = photoWidth - width - 18;
    const localY = photoHeight - height - 16;
    const x = padding + column * (photoWidth + gap) + localX;
    const y = header + row * (photoHeight + gap) + localY;
    return { x, y, localX, localY, width, height, faceRight: false, onRight: true };
  }

  function getCameraContentRect() {
    const cameraWindow = document.querySelector(".camera-window");
    if (!cameraWindow || !video) return null;
    const windowRect = cameraWindow.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    if (!videoRect.width || !videoRect.height) return null;
    const sourceRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3;
    const targetRatio = 4 / 3;
    let displayWidth = videoRect.width;
    let displayHeight = displayWidth / sourceRatio;
    if (displayHeight > videoRect.height) {
      displayHeight = videoRect.height;
      displayWidth = displayHeight * sourceRatio;
    }
    let width = displayWidth;
    let height = displayHeight;
    let left = videoRect.left - windowRect.left + (videoRect.width - displayWidth) / 2;
    let top = videoRect.top - windowRect.top + (videoRect.height - displayHeight) / 2;
    if (sourceRatio > targetRatio) {
      width = displayHeight * targetRatio;
      left += (displayWidth - width) / 2;
    } else if (sourceRatio < targetRatio) {
      height = displayWidth / targetRatio;
      top += (displayHeight - height) / 2;
    }
    return { left, top, width, height };
  }

  function updateCameraPoongGuide(index = activeShotIndex) {
    if (!cameraPoongGuide || !cameraPoongGuideCanvas) return;
    const expressionSheet = themedExpressions[selectedFrame];
    const expression = getPreferredPoong(index);
    const content = getCameraContentRect();
    if (!expression || !expression.naturalWidth || !content) {
      cameraPoongGuide.classList.remove("ready");
      return;
    }
    const layout = getFourCutStickerLayout(index);
    const photoWidth = 360;
    const photoHeight = 270;
    const scale = content.width / photoWidth;
    // The live front-camera element is already mirrored in CSS and the saved
    // frame is mirrored at capture time. Keeping the guide at the final output
    // coordinate makes the character visibly stay on the right in both views.
    const outputX = layout.localX;
    const guideWidth = layout.width * scale;
    const guideHeight = layout.height * scale;
    cameraPoongGuide.style.setProperty("--guide-left", `${content.left + outputX * scale}px`);
    cameraPoongGuide.style.setProperty("--guide-top", `${content.top + layout.localY * (content.height / photoHeight)}px`);
    cameraPoongGuide.style.setProperty("--guide-width", `${guideWidth}px`);
    cameraPoongGuide.style.setProperty("--guide-height", `${guideHeight}px`);
    cameraPoongGuideLabel.textContent = `SHOT ${String(index + 1).padStart(2, "0")} · POONG POSITION`;
    const guideScale = 2;
    cameraPoongGuideCanvas.width = Math.max(1, Math.round(layout.width * guideScale));
    cameraPoongGuideCanvas.height = Math.max(1, Math.round(layout.height * guideScale));
    const ctx = configureCanvasContext(cameraPoongGuideCanvas.getContext("2d"));
    ctx.setTransform(guideScale, 0, 0, guideScale, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);
    ctx.filter = filters[selectedFilter].css;
    drawExpressionBadge(ctx, expression, selectedFrame, index, 0, 0, layout.width, layout.height, Boolean(expressionSheet), false, true);
    ctx.filter = "none";
    cameraPoongGuide.dataset.frame = selectedFrame;
    cameraPoongGuide.dataset.shot = String(index);
    cameraPoongGuide.classList.add("ready");
  }

  function updateFilterSelection() {
    $$(".filter-option").forEach((button) => button.classList.toggle("selected", button.dataset.filter === selectedFilter));
    updateCameraPreviewFilter();
    drawThemePreview();
    updateCameraPoongGuide(activeShotIndex);
  }

  function updateAccessorySelection() {
    $$(".accessory-option").forEach((button) => button.classList.toggle("selected", button.dataset.accessory === selectedAccessory));
    if (body.dataset.flow === "camera") {
      if (latestLiveMask) renderLiveCamera(latestLiveMask, latestFaceDetections);
      else renderLiveAccessories(latestFaceDetections);
    }
  }

  function updatePose() {
    const [title, copy] = poses[currentPose];
    $("#poseTitle").textContent = title;
    $("#poseCopy").textContent = copy;
  }

  function beginBooth() {
    if (busy) return;
    shots = [];
    resultDataUrl = "";
    resetDots();
    setFlow("theme");
    startLabel.textContent = "NEXT: CAMERA";
    $("#btnStart .action-number").textContent = "01";
    actionNote.textContent = "테마와 필터를 고른 다음 카메라 화면으로 이동해요.";
  }

  async function enterCamera() {
    if (busy) return;
    setFlow("camera");
    actionNote.textContent = "카메라 권한을 허용하면 실시간 촬영, 아니면 데모 촬영으로 진행돼요.";
    await openCamera();
    updateCameraPoongGuide(activeShotIndex);
  }

  function backToTheme() {
    if (busy) return;
    stopStream();
    setFlow("theme");
    actionNote.textContent = "테마와 필터를 고른 다음 카메라 화면으로 이동해요.";
  }

  function makeDemoShot(index) {
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = 1080;
    const ctx = configureCanvasContext(canvas.getContext("2d"));
    ctx.filter = filters[selectedFilter].css;
    drawPreviewPhoto(ctx, 0, 0, canvas.width, canvas.height, selectedFrame, index);
    ctx.filter = "none";
    const vignette = ctx.createRadialGradient(720, 320, 160, 720, 400, 800);
    vignette.addColorStop(0, "rgba(255,255,255,.05)"); vignette.addColorStop(1, "rgba(18,12,28,.28)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function getVideoCrop() {
    const videoRatio = video.videoWidth / video.videoHeight;
    const targetRatio = 4 / 3;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (videoRatio > targetRatio) { sourceWidth = video.videoHeight * targetRatio; sourceX = (video.videoWidth - sourceWidth) / 2; }
    else { sourceHeight = video.videoWidth / targetRatio; sourceY = (video.videoHeight - sourceHeight) / 2; }
    return { sourceX, sourceY, sourceWidth, sourceHeight };
  }

  function drawVideoFrame(ctx, canvas, crop) {
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawSegmentationMask(ctx, canvas, mask, crop) {
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(mask, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  async function captureCanvas(index) {
    if (demoMode || !video.videoWidth) return makeDemoShot(index);
    const canvas = document.createElement("canvas");
    canvas.width = 1440; canvas.height = 1080;
    const ctx = configureCanvasContext(canvas.getContext("2d"));
    const crop = getVideoCrop();
    let mask = null;
    let faceDetections = [];
    if (!segmentationModel) {
      const ready = await Promise.race([prepareSegmentation(), sleep(3200).then(() => false)]);
      if (ready) cameraStatus.textContent = "촬영 중 · 테마 배경을 합성하고 있어요";
    }
    if (!faceDetector) await Promise.race([prepareFaceDetection(), sleep(2600).then(() => false)]);
    if (segmentationModel) mask = await requestSegmentation();
    if (faceDetector) {
      // Reuse the latest live result when available so capture never sends a
      // second frame while the detector is still processing the preview.
      faceDetections = latestFaceDetections.length ? latestFaceDetections : await requestFaceDetections();
    }
    if (mask) {
      const background = document.createElement("canvas");
      background.width = canvas.width; background.height = canvas.height;
      const backgroundCtx = configureCanvasContext(background.getContext("2d"));
      backgroundCtx.filter = filters[selectedFilter].css;
      drawPreviewPhoto(backgroundCtx, 0, 0, canvas.width, canvas.height, selectedFrame, index);
      backgroundCtx.filter = "none";

      const subject = document.createElement("canvas");
      subject.width = canvas.width; subject.height = canvas.height;
      const subjectCtx = configureCanvasContext(subject.getContext("2d"));
      subjectCtx.filter = filters[selectedFilter].css;
      drawVideoFrame(subjectCtx, subject, crop);
      subjectCtx.filter = "none";

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width; maskCanvas.height = canvas.height;
      const maskCtx = configureCanvasContext(maskCanvas.getContext("2d"));
      drawSegmentationMask(maskCtx, maskCanvas, mask, crop);
      subjectCtx.globalCompositeOperation = "destination-in";
      subjectCtx.drawImage(maskCanvas, 0, 0);
      subjectCtx.globalCompositeOperation = "source-over";
      ctx.drawImage(background, 0, 0);
      ctx.drawImage(subject, 0, 0);
    } else {
      ctx.filter = filters[selectedFilter].css;
      drawVideoFrame(ctx, canvas, crop);
      ctx.filter = "none";
    }
    if (faceDetections.length && selectedAccessory !== "none") {
      ctx.save();
      ctx.filter = filters[selectedFilter].css;
      drawFaceAccessories(ctx, faceDetections, crop, canvas.width, canvas.height);
      ctx.restore();
    }
    if (autoEnhance) applyAutoEnhance(ctx, canvas.width, canvas.height);
    if (selectedFilter === "soft") {
      const glow = ctx.createRadialGradient(720, 360, 20, 720, 360, 760);
      glow.addColorStop(0, "rgba(255,255,255,.23)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (selectedFilter === "film") addFilmGrain(ctx, canvas.width, canvas.height);
    return canvas;
  }

  function applyAutoEnhance(ctx, width, height) {
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const luminance = red * .2126 + green * .7152 + blue * .0722;
      const contrast = 1.035;
      const lift = 2.5;
      const target = (luminance - 128) * contrast + 128 + lift;
      const saturation = 1.045;
      data[i] = Math.max(0, Math.min(255, target + (red - luminance) * saturation + 1.5));
      data[i + 1] = Math.max(0, Math.min(255, target + (green - luminance) * saturation + .5));
      data[i + 2] = Math.max(0, Math.min(255, target + (blue - luminance) * saturation - 1));
    }
    ctx.putImageData(image, 0, 0);
    const softened = document.createElement("canvas");
    softened.width = width; softened.height = height;
    const softenedCtx = softened.getContext("2d");
    if (!softenedCtx) return;
    softenedCtx.filter = "blur(1.2px)";
    softenedCtx.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalAlpha = .075;
    ctx.drawImage(softened, 0, 0);
    ctx.restore();
  }

  function addFilmGrain(ctx, width, height) {
    const image = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < image.data.length; i += 4) {
      const amount = (Math.random() - .5) * 18;
      image.data[i] += amount; image.data[i + 1] += amount; image.data[i + 2] += amount;
    }
    ctx.putImageData(image, 0, 0);
  }

  function updateCameraPreviewFilter() {
    const beautyFilter = autoEnhance ? " brightness(1.025) contrast(.985) saturate(1.025)" : "";
    video.style.filter = `${filters[selectedFilter].css}${beautyFilter}`;
    if (cameraComposite) cameraComposite.style.filter = autoEnhance ? "brightness(1.025) contrast(.985) saturate(1.025)" : "none";
  }

  async function countdownAndCapture(index) {
    activeShotIndex = index;
    updateCameraPoongGuide(activeShotIndex);
    for (const number of [3, 2, 1]) {
      countdown.textContent = number;
      countdown.style.opacity = "1";
      await sleep(560);
    }
    countdown.style.opacity = "0";
    flash.style.transition = "none"; flash.style.opacity = ".9";
    await sleep(50);
    flash.style.transition = "opacity .35s ease"; flash.style.opacity = "0";
    shots.push(await captureCanvas(index));
    shotDots[index].classList.remove("active"); shotDots[index].classList.add("done");
    shotCount.textContent = `${index + 1} / 4`;
    activeShotIndex = Math.min(index + 1, 3);
    updateCameraPoongGuide(activeShotIndex);
  }

  function drawText(ctx, text, x, y, size, color, font = "600 20px 'IBM Plex Mono'", align = "center") {
    ctx.save(); ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.fillText(text, x, y); ctx.restore();
  }

  function configureCanvasContext(ctx) {
    if (!ctx) return ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    return ctx;
  }

  function drawGradientText(ctx, text, x, y, size, font, colors) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    const textWidth = ctx.measureText(text).width;
    const gradient = ctx.createLinearGradient(x - textWidth / 2, y - size, x + textWidth / 2, y);
    colors.forEach((color, index) => gradient.addColorStop(index / Math.max(1, colors.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawConfetti(ctx, width, height, seed = 1) {
    const colors = ["#ff6a3d", "#f8d36b", "#a99af7", "#86d7d0", "#f8f4ec"];
    for (let i = 0; i < 34; i += 1) {
      const x = ((i * 97 + seed * 31) % width);
      const y = ((i * 61 + seed * 43) % height);
      ctx.save(); ctx.translate(x, y); ctx.rotate((i * .55) % 2); ctx.fillStyle = colors[i % colors.length];
      if (i % 3 === 0) ctx.fillRect(-4, -4, 8, 8); else { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawLantern(ctx, x, y, radius, color) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - radius - 14); ctx.lineTo(x, y - radius); ctx.stroke(); ctx.restore();
  }

  function drawCauSeal(ctx, x, y, radius, color = "#fff0d1") {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, radius * .08);
    ctx.globalAlpha = .92;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    drawText(ctx, "CAU", x, y + radius * .28, Math.max(5, radius * .46), color, `700 ${Math.max(5, radius * .46)}px 'IBM Plex Mono'`);
    ctx.restore();
  }

  function drawMapleLeaf(ctx, x, y, size, rotation, color = "#d9553f") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(size, size);
    const points = [[0, -1], [.18, -.42], [.62, -.68], [.43, -.16], [1, 0], [.43, .18], [.64, .68], [.16, .43], [0, 1], [-.16, .43], [-.64, .68], [-.43, .18], [-1, 0], [-.43, -.16], [-.62, -.68], [-.18, -.42]];
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([pointX, pointY]) => ctx.lineTo(pointX, pointY));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = .92;
    ctx.fill();
    ctx.strokeStyle = "rgba(77, 26, 29, .55)";
    ctx.lineWidth = .08;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 226, 143, .6)";
    ctx.lineWidth = .06;
    ctx.beginPath(); ctx.moveTo(0, .88); ctx.lineTo(0, -.7); ctx.stroke();
    ctx.restore();
  }

  function drawPierrotMakeupMark(ctx, x, y, size, rotation = 0, color = "#e9574b") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255, 215, 109, .76)";
    ctx.lineWidth = Math.max(.6, size * .08);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .46, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * .46, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff0d1";
    ctx.beginPath(); ctx.arc(size * .85, -size * .55, size * .18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMarketRoof(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = "#241921";
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + height);
    ctx.quadraticCurveTo(x - width * .24, y + height * .45, x, y);
    ctx.quadraticCurveTo(x + width * .24, y + height * .45, x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#735049";
    ctx.lineWidth = Math.max(1, height * .07);
    for (let tile = -4; tile <= 4; tile += 1) {
      ctx.beginPath();
      ctx.moveTo(x + tile * width * .09, y + height * .18);
      ctx.lineTo(x + tile * width * .13, y + height * .82);
      ctx.stroke();
    }
    ctx.fillStyle = "#b54a3c";
    ctx.fillRect(x - width / 2, y + height - Math.max(3, height * .1), width, Math.max(3, height * .1));
    ctx.restore();
  }

  function drawMarketAwning(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = "#c93631";
    ctx.fillRect(x, y, width, height);
    for (let stripe = x; stripe < x + width; stripe += height * 1.55) {
      ctx.fillStyle = "#ffd05d";
      ctx.fillRect(stripe, y, height * .72, height);
      ctx.beginPath();
      ctx.arc(stripe + height * .36, y + height, height * .36, 0, Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(76,22,28,.32)";
    ctx.fillRect(x, y + height - 2, width, 2);
    ctx.restore();
  }

  function drawPierrotCurtains(ctx, width, height, compact, headerHeight = compact ? 88 : 174) {
    const curtainHeight = headerHeight;
    const stage = ctx.createLinearGradient(0, 0, 0, curtainHeight);
    stage.addColorStop(0, "#171126"); stage.addColorStop(1, "#2b1738");
    ctx.fillStyle = stage;
    ctx.fillRect(0, 0, width, curtainHeight);
    const leftCurtain = ctx.createLinearGradient(0, 0, width * .34, 0);
    leftCurtain.addColorStop(0, "#7f2747"); leftCurtain.addColorStop(.65, "#4b1e3c"); leftCurtain.addColorStop(1, "#2e1837");
    ctx.fillStyle = leftCurtain;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(width * .27, 0); ctx.quadraticCurveTo(width * .2, curtainHeight * .54, width * .31, curtainHeight); ctx.lineTo(0, curtainHeight); ctx.closePath(); ctx.fill();
    const rightCurtain = ctx.createLinearGradient(width, 0, width * .66, 0);
    rightCurtain.addColorStop(0, "#7f2747"); rightCurtain.addColorStop(.65, "#4b1e3c"); rightCurtain.addColorStop(1, "#2e1837");
    ctx.fillStyle = rightCurtain;
    ctx.beginPath();
    ctx.moveTo(width, 0); ctx.lineTo(width * .73, 0); ctx.quadraticCurveTo(width * .8, curtainHeight * .54, width * .69, curtainHeight); ctx.lineTo(width, curtainHeight); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,205,97,.18)";
    ctx.lineWidth = compact ? 1.5 : 3;
    for (const side of [1, -1]) {
      for (let fold = 0; fold < 4; fold += 1) {
        const startX = side === 1 ? width * (.035 + fold * .065) : width * (.965 - fold * .065);
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.quadraticCurveTo(startX + side * width * .02, curtainHeight * .48, startX + side * width * (.035 + fold * .008), curtainHeight);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(255,220,139,.54)";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(width * .27, curtainHeight);
    ctx.quadraticCurveTo(width * .34, compact ? 34 : 67, width * .5, compact ? 19 : 37);
    ctx.quadraticCurveTo(width * .66, compact ? 34 : 67, width * .73, curtainHeight);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,222,130,.11)";
    ctx.beginPath(); ctx.moveTo(width * .1, curtainHeight); ctx.lineTo(width * .38, curtainHeight); ctx.lineTo(width * .5, compact ? 35 : 73); ctx.lineTo(width * .62, curtainHeight); ctx.lineTo(width * .9, curtainHeight); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e5b65d";
    ctx.beginPath(); ctx.arc(width * .28, curtainHeight * .68, compact ? 3 : 6, 0, Math.PI * 2); ctx.arc(width * .72, curtainHeight * .68, compact ? 3 : 6, 0, Math.PI * 2); ctx.fill();
  }

  function drawMarquee(ctx, x, y, width, height, compact) {
    ctx.save();
    const plaque = ctx.createLinearGradient(x, y, x, y + height);
    plaque.addColorStop(0, "#4b2750"); plaque.addColorStop(1, "#261735");
    roundedRect(ctx, x, y, width, height, compact ? 7 : 14);
    ctx.fillStyle = plaque; ctx.fill();
    ctx.strokeStyle = "rgba(255,208,103,.86)";
    ctx.lineWidth = compact ? 1 : 2;
    roundedRect(ctx, x, y, width, height, compact ? 7 : 14);
    ctx.stroke();
    const bulbRadius = compact ? 1.5 : 3;
    for (let bulbX = x + (compact ? 10 : 16); bulbX < x + width - (compact ? 8 : 12); bulbX += compact ? 17 : 34) {
      drawLantern(ctx, bulbX, y + (compact ? 6 : 9), bulbRadius, "#ffd05d");
      drawLantern(ctx, bulbX, y + height - (compact ? 6 : 9), bulbRadius, "#ffd05d");
    }
    ctx.restore();
  }

  function drawPoong(ctx, image, x, y, width, height) {
    if (!image.complete || !image.naturalWidth) return;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 12; ctx.drawImage(image, x - width / 2, y, width, height); ctx.restore();
  }

  function drawThemePoongSticker(ctx, image, theme, x, y, width = 124, height = 142) {
    if (!image || !image.naturalWidth) return;
    const artwork = getPoongArtwork(image, "neutral");
    ctx.save();
    ctx.shadowColor = theme === "market" ? "rgba(18, 53, 63, .34)" : "rgba(18, 7, 25, .42)";
    ctx.shadowBlur = Math.max(6, width * .08);
    ctx.shadowOffsetY = Math.max(2, height * .035);
    drawContain(ctx, artwork, x, y, width, height);
    ctx.restore();
  }

  function drawExpressionBadge(ctx, image, theme, index, x, y, width, height, spriteSheet = false, faceRight = false, bottomAlign = false) {
    if (!image || !image.naturalWidth) return;
    const artwork = spriteSheet ? getPoongArtwork(image, "neutral") : getPoongArtwork(image, expressionModes[index] || "neutral");
    ctx.save();
    ctx.shadowColor = theme === "market" ? "rgba(18, 53, 63, .3)" : "rgba(18, 7, 25, .34)";
    ctx.shadowBlur = Math.max(5, width * .06);
    ctx.shadowOffsetY = Math.max(2, height * .025);
    if (spriteSheet) drawSpriteContain(ctx, artwork, index, x, y, width, height, faceRight, bottomAlign);
    else drawContain(ctx, artwork, x, y, width, height, faceRight, bottomAlign);
    ctx.restore();
  }

  function getPreferredPoong(index) {
    return themedExpressions[selectedFrame] || themedPoong[selectedFrame] || expressionPoong[index] || previewPoong;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawThemePreview() {
    if (!themePreview) return;
    const width = 300;
    const previewScale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    const header = 88;
    const footer = 76;
    const padding = 16;
    const gap = 8;
    const photoWidth = Math.floor((width - padding * 2 - gap) / 2);
    const photoHeight = Math.floor(photoWidth * .75);
    const height = header + photoHeight * 2 + gap + footer;
    themePreview.width = width * previewScale;
    themePreview.height = height * previewScale;
    const ctx = configureCanvasContext(themePreview.getContext("2d"));
    ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);
    paintFrame(ctx, width, height, selectedFrame);
    drawFrameRails(ctx, width, height, selectedFrame, padding, header, footer);
    const poong = themedPoong[selectedFrame] || previewPoong;
    const expressionSheet = themedExpressions[selectedFrame];
    for (let index = 0; index < 4; index += 1) {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = padding + column * (photoWidth + gap);
      const y = header + row * (photoHeight + gap);
      ctx.save();
      roundedRect(ctx, x, y, photoWidth, photoHeight, 8);
      ctx.clip();
      ctx.filter = filters[selectedFilter].css;
      drawPreviewPhoto(ctx, x, y, photoWidth, photoHeight, selectedFrame, index);
      ctx.restore();
      ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.58)" : "rgba(255,248,218,.68)";
      ctx.lineWidth = 1.5; roundedRect(ctx, x, y, photoWidth, photoHeight, 8); ctx.stroke();
      const expression = getPreferredPoong(index);
      if (expression) {
        const layout = getFourCutStickerLayout(index);
        const scaleX = photoWidth / 360;
        const scaleY = photoHeight / 270;
        const badgeWidth = layout.width * scaleX;
        const badgeHeight = layout.height * scaleY;
        const badgeX = x + photoWidth - badgeWidth - 18 * scaleX;
        const badgeY = y + photoHeight - badgeHeight - 16 * scaleY;
        ctx.save();
        ctx.filter = filters[selectedFilter].css;
        drawExpressionBadge(ctx, expression, selectedFrame, index, badgeX, badgeY, badgeWidth, badgeHeight, Boolean(expressionSheet), false, true);
        ctx.restore();
      }
    }
    const footerY = height - footer;
    drawFrameFooter(ctx, width, footerY, footer, selectedFrame, poong);
    drawFrameEdgeSeal(ctx, width, height, selectedFrame);
    themePreviewLabel.textContent = selectedFrame === "pierrot" ? "삐에로 테마" : "화개장터 테마";
    themePreview.setAttribute("aria-label", `${themePreviewLabel.textContent} 프레임 미리보기`);
  }

  function loadImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      image.src = source;
      window.setTimeout(() => finish(null), 15000);
    });
  }

  function drawContain(ctx, image, x, y, width, height, faceRight = false, bottomAlign = false) {
    const sourceWidth = image?.naturalWidth || image?.width;
    const sourceHeight = image?.naturalHeight || image?.height;
    if (!image || !sourceWidth || !sourceHeight) return;
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (bottomAlign ? height - drawHeight : (height - drawHeight) / 2);
    if (faceRight) {
      ctx.save();
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, width - (drawX - x) - drawWidth, drawY - y, drawWidth, drawHeight);
      ctx.restore();
      return;
    }
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function drawCover(ctx, image, x, y, width, height) {
    const sourceWidth = image?.naturalWidth || image?.width;
    const sourceHeight = image?.naturalHeight || image?.height;
    if (!image || !sourceWidth || !sourceHeight) return;
    const targetRatio = width / height;
    const sourceRatio = sourceWidth / sourceHeight;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      sourceY = (sourceHeight - cropHeight) / 2;
    }
    ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height);
  }

  function drawSpriteContain(ctx, image, index, x, y, width, height, faceRight = false, bottomAlign = false) {
    const sourceWidth = image?.naturalWidth || image?.width;
    const sourceHeight = image?.naturalHeight || image?.height;
    if (!image || !sourceWidth || !sourceHeight) return;
    const cellWidth = sourceWidth / 2;
    const cellHeight = sourceHeight / 2;
    const sourceX = (index % 2) * cellWidth;
    const sourceY = Math.floor(index / 2) * cellHeight;
    const scale = Math.min(width / cellWidth, height / cellHeight);
    const drawWidth = cellWidth * scale;
    const drawHeight = cellHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (bottomAlign ? height - drawHeight : (height - drawHeight) / 2);
    if (faceRight) {
      ctx.save();
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, sourceX, sourceY, cellWidth, cellHeight, width - (drawX - x) - drawWidth, drawY - y, drawWidth, drawHeight);
      ctx.restore();
      return;
    }
    ctx.drawImage(image, sourceX, sourceY, cellWidth, cellHeight, drawX, drawY, drawWidth, drawHeight);
  }

  function getPoongArtwork(image, mode = "neutral") {
    let imageCache = poongArtworkCache.get(image);
    if (!imageCache) { imageCache = new Map(); poongArtworkCache.set(image, imageCache); }
    if (imageCache.has(mode)) return imageCache.get(mode);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0; let tail = 0;
    const isBackdrop = (offset) => {
      if (pixels.data[offset + 3] < 24) return true;
      const red = pixels.data[offset]; const green = pixels.data[offset + 1]; const blue = pixels.data[offset + 2];
      const max = Math.max(red, green, blue); const min = Math.min(red, green, blue);
      if (mode === "pink") return (red > 145 && red - green > 20 && red - blue > 4) || (min > 215 && max - min < 36);
      if (mode === "dark") return (max - min < 46 && max < 150) || (min > 175 && max - min < 32);
      if (mode === "black") return max < 76;
      // The supplied Poong PNGs use a white/gray checkerboard instead of
      // alpha. Remove the whole connected backdrop so no rectangular patch
      // can appear inside a photo cell at a different device scale.
      return max - min < 80 && min > 140;
    };
    const enqueue = (pixel) => {
      if (pixel < 0 || pixel >= width * height || visited[pixel] || !isBackdrop(pixel * 4)) return;
      visited[pixel] = 1; queue[tail] = pixel; tail += 1;
    };
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
    while (head < tail) {
      const pixel = queue[head++];
      pixels.data[pixel * 4 + 3] = 0;
      const x = pixel % width; const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x < width - 1) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y < height - 1) enqueue(pixel + width);
    }
    ctx.putImageData(pixels, 0, 0);
    imageCache.set(mode, canvas);
    return canvas;
  }

  function getTransparentLogo(image) {
    const width = image?.naturalWidth;
    const height = image?.naturalHeight;
    if (!width || !height) return image;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0; let tail = 0;
    const isBackdrop = (offset) => {
      if (pixels.data[offset + 3] < 24) return true;
      const red = pixels.data[offset]; const green = pixels.data[offset + 1]; const blue = pixels.data[offset + 2];
      const max = Math.max(red, green, blue); const min = Math.min(red, green, blue);
      return min > 175 && max - min < 70;
    };
    const enqueue = (pixel) => {
      if (pixel < 0 || pixel >= width * height || visited[pixel] || !isBackdrop(pixel * 4)) return;
      visited[pixel] = 1; queue[tail] = pixel; tail += 1;
    };
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
    while (head < tail) {
      const pixel = queue[head++];
      pixels.data[pixel * 4 + 3] = 0;
      const x = pixel % width; const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x < width - 1) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y < height - 1) enqueue(pixel + width);
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }

  function drawPoongCompanion(ctx, image, index, x, y, width = 136, height = 164) {
    if (!image || !image.naturalWidth) return;
    const labels = ["HAPPY POONG", "FESTIVAL MESSAGE", "MARKET LOOK", "CUTE POONG"];
    const rotations = [-.045, .04, -.035, .05];
    const imageX = 7;
    const imageY = 7;
    const imageWidth = width - 14;
    const imageHeight = height - 30;
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotations[index] || 0);
    ctx.shadowColor = "rgba(38, 8, 16, .34)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#fff5dd";
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.shadowColor = "transparent";
    ctx.save();
    ctx.beginPath();
    ctx.rect(-width / 2 + imageX, -height / 2 + imageY, imageWidth, imageHeight);
    ctx.clip();
    drawContain(ctx, image, -width / 2 + imageX, -height / 2 + imageY, imageWidth, imageHeight);
    if (index === 1) {
      const messageTop = -height / 2 + imageY + imageHeight * .57;
      ctx.fillStyle = "rgba(255, 243, 210, .96)";
      ctx.fillRect(-width / 2 + imageX + 3, messageTop, imageWidth - 6, imageHeight * .28);
      drawText(ctx, "화개장터 × 삐에로", 0, messageTop + imageHeight * .11, 8, "#9f3038", "700 8px 'Noto Sans KR'");
      drawText(ctx, "중앙대 가을축제", 0, messageTop + imageHeight * .2, 8, "#9f3038", "700 8px 'Noto Sans KR'");
      drawText(ctx, "에서 만나요!", 0, messageTop + imageHeight * .29, 7, "#9f3038", "600 7px 'Noto Sans KR'");
    }
    ctx.restore();
    ctx.fillStyle = "#fff5dd";
    drawText(ctx, labels[index] || "POONG FRIEND", 0, height / 2 - 9, 8, "#762637", "700 8px 'IBM Plex Mono'");
    ctx.restore();
  }

  function drawFrameRails(ctx, width, height, frame, padding, header, footer) {
    const railHeight = height - header - footer;
    if (railHeight <= 0) return;
    const compact = header < 120;
    ctx.save();
    if (frame === "pierrot") {
      const railGradient = ctx.createLinearGradient(0, header, 0, height - footer);
      railGradient.addColorStop(0, "#432044"); railGradient.addColorStop(.52, "#251934"); railGradient.addColorStop(1, "#542447");
      ctx.fillStyle = railGradient;
      ctx.fillRect(0, header, padding, railHeight);
      ctx.fillRect(width - padding, header, padding, railHeight);
      ctx.strokeStyle = "rgba(255,208,103,.58)";
      ctx.lineWidth = compact ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(padding - (compact ? 2 : 4), header);
      ctx.lineTo(padding - (compact ? 2 : 4), height - footer);
      ctx.moveTo(width - padding + (compact ? 2 : 4), header);
      ctx.lineTo(width - padding + (compact ? 2 : 4), height - footer);
      ctx.stroke();
      const step = compact ? 78 : 210;
      for (let y = header + (compact ? 38 : 82); y < height - footer - 14; y += step) {
        drawPierrotMakeupMark(ctx, padding / 2, y, compact ? 2.8 : 6, -.15, y % 2 ? "#e9574b" : "#ffd05d");
        drawPierrotMakeupMark(ctx, width - padding / 2, y + (compact ? 21 : 48), compact ? 2.6 : 5.5, .15, y % 2 ? "#ffd05d" : "#e9574b");
      }
    } else {
      const railGradient = ctx.createLinearGradient(0, header, 0, height - footer);
      railGradient.addColorStop(0, "#f2e4ce");
      railGradient.addColorStop(.5, "#e4cdb0");
      railGradient.addColorStop(1, "#f0dfc3");
      ctx.fillStyle = railGradient;
      ctx.fillRect(0, header, padding, railHeight);
      ctx.fillRect(width - padding, header, padding, railHeight);
      ctx.strokeStyle = "rgba(88, 49, 45, .38)";
      ctx.lineWidth = compact ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(padding - (compact ? 2 : 4), header);
      ctx.lineTo(padding - (compact ? 2 : 4), height - footer);
      ctx.moveTo(width - padding + (compact ? 2 : 4), header);
      ctx.lineTo(width - padding + (compact ? 2 : 4), height - footer);
      ctx.stroke();
      for (let y = header + (compact ? 44 : 88); y < height - footer - 18; y += compact ? 92 : 184) {
        drawMapleLeaf(ctx, padding / 2, y, compact ? 2.6 : 5.5, -.35, y % 2 ? "#c84d3d" : "#e1a45f");
        drawMapleLeaf(ctx, width - padding / 2, y + (compact ? 22 : 42), compact ? 2.4 : 5, .35, y % 2 ? "#e1a45f" : "#c84d3d");
      }
    }
    ctx.restore();
  }

  function drawFrameBorder(ctx, width, height, frame) {
    const compact = height < 700;
    const inset = compact ? 6 : 12;
    const radius = compact ? 9 : 18;
    const accent = frame === "pierrot" ? "rgba(255, 210, 111, .62)" : "rgba(255, 218, 143, .66)";
    ctx.save();
    roundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, radius);
    ctx.strokeStyle = "rgba(255, 246, 226, .24)";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.stroke();
    roundedRect(ctx, inset + (compact ? 3 : 6), inset + (compact ? 3 : 6), width - (inset + (compact ? 3 : 6)) * 2, height - (inset + (compact ? 3 : 6)) * 2, Math.max(4, radius - 4));
    ctx.strokeStyle = accent;
    ctx.globalAlpha = .58;
    ctx.lineWidth = compact ? 1 : 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawFrameEdgeSeal(ctx, width, height, frame) {
    // Keep the exported strip visually closed at the device's outermost pixels.
    // This is intentionally subtle: it masks sub-pixel seams without stealing
    // attention from the photo cells or the themed header/footer.
    const accent = frame === "pierrot" ? "rgba(255, 221, 153, .48)" : "rgba(255, 244, 218, .58)";
    ctx.save();
    roundedRect(ctx, 2.5, 2.5, width - 5, height - 5, 13);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawModernFestivalHeader(ctx, width, header, frame, compact) {
    const isPierrot = frame === "pierrot";
    const accent = isPierrot ? "#ffd36f" : "#b14b3f";
    const ink = isPierrot ? "#fff1dd" : "#3e2025";
    const headerGradient = ctx.createLinearGradient(0, 0, width, header);
    if (isPierrot) {
      headerGradient.addColorStop(0, "#241532");
      headerGradient.addColorStop(.62, "#302044");
      headerGradient.addColorStop(1, "#171020");
    } else {
      headerGradient.addColorStop(0, "#f6ead6");
      headerGradient.addColorStop(.64, "#edddc3");
      headerGradient.addColorStop(1, "#dbc4a4");
    }
    ctx.save();
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, header);
    ctx.fillStyle = isPierrot ? "rgba(255, 208, 93, .1)" : "rgba(122, 57, 49, .06)";
    ctx.fillRect(0, header - (compact ? 4 : 6), width, compact ? 4 : 6);

    const markSize = compact ? 24 : 38;
    const markX = compact ? 18 : 28;
    const markY = compact ? 13 : 10;
    if (cauAnniversaryMark?.naturalWidth) drawContain(ctx, cauAnniversaryMark, markX, markY, markSize, markSize);
    else drawCauSeal(ctx, markX + markSize / 2, markY + markSize / 2, markSize * .38, accent);

    const copyX = markX + markSize + (compact ? 8 : 11);
    const topY = compact ? 24 : 29;
    const topSize = compact ? 6 : 11;
    drawText(ctx, "CAU  ·  SEOUL CAMPUS", copyX, topY, topSize, isPierrot ? "rgba(255, 239, 213, .86)" : "#5a3130", `700 ${topSize}px 'IBM Plex Mono'`, "left");
    drawText(ctx, "2026  /  FALL FESTIVAL", width - (compact ? 18 : 28), topY, topSize, accent, `700 ${topSize}px 'IBM Plex Mono'`, "right");

    const titleSize = compact ? 27 : 60;
    const titleY = compact ? 64 : 86;
    const title = isPierrot ? "삐에로" : "화개장터";
    const colors = isPierrot ? ["#fff5e5", "#ffd05d", "#f07a6a"] : ["#3b2024", "#9b433b", "#d17b4f"];
    drawGradientText(ctx, title, width / 2, titleY, titleSize, `700 ${titleSize}px 'Black Han Sans'`, colors);
    if (isPierrot) {
      drawPierrotMakeupMark(ctx, width * .18, compact ? 63 : 84, compact ? 3 : 7, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, width * .82, compact ? 63 : 84, compact ? 3 : 7, .18, "#ffd05d");
    } else {
      drawMapleLeaf(ctx, width * .17, compact ? 61 : 82, compact ? 3 : 7, -.32, "#d95345");
      drawMapleLeaf(ctx, width * .83, compact ? 61 : 82, compact ? 3 : 7, .32, "#d68b50");
    }
    ctx.strokeStyle = isPierrot ? "rgba(255, 208, 93, .52)" : "rgba(101, 54, 44, .44)";
    ctx.lineWidth = compact ? 1 : 1.5;
    ctx.beginPath();
    ctx.moveTo(width * .27, compact ? 73 : 104);
    ctx.lineTo(width * .73, compact ? 73 : 104);
    ctx.stroke();
    drawText(ctx, isPierrot ? "PIERROT THEATRE" : "MARKET NIGHT", width / 2, compact ? 82 : 116, compact ? 5 : 8, isPierrot ? "rgba(255, 235, 201, .72)" : "#7b4b42", `700 ${compact ? 5 : 8}px 'IBM Plex Mono'`);
    ctx.restore();
  }

  function drawPreviewPhoto(ctx, x, y, width, height, frame, index) {
    ctx.save();
    const themedBackground = frame === "market" ? marketBackground : frame === "pierrot" ? pierrotBackground : null;
    if (themedBackground?.naturalWidth) {
      drawCover(ctx, themedBackground, x, y, width, height);
      const atmosphere = ctx.createLinearGradient(x, y, x, y + height);
      atmosphere.addColorStop(0, frame === "pierrot" ? "rgba(18, 8, 24, .04)" : "rgba(21, 16, 25, .04)");
      atmosphere.addColorStop(1, frame === "pierrot" ? "rgba(27, 7, 20, .2)" : "rgba(38, 12, 18, .18)");
      ctx.fillStyle = atmosphere;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      return;
    }
    if (frame === "pierrot") {
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "#352044"); gradient.addColorStop(.52, "#17152d"); gradient.addColorStop(1, "#6c304f");
      ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);
      const spotlight = ctx.createRadialGradient(x + width * .5, y + height * .38, 2, x + width * .5, y + height * .38, width * .75);
      spotlight.addColorStop(0, "rgba(255,224,161,.3)"); spotlight.addColorStop(.42, "rgba(238,174,113,.11)"); spotlight.addColorStop(1, "rgba(17,13,31,0)");
      ctx.fillStyle = spotlight; ctx.fillRect(x, y, width, height);
      ctx.fillStyle = "rgba(255,226,161,.07)";
      ctx.beginPath(); ctx.moveTo(x + width * .44, y); ctx.lineTo(x + width * .18, y + height); ctx.lineTo(x + width * .82, y + height); ctx.lineTo(x + width * .56, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,221,146,.15)";
      ctx.lineWidth = Math.max(1, width * .006);
      ctx.beginPath(); ctx.arc(x + width * .5, y + height * .14, width * .3, Math.PI, 0); ctx.stroke();
      const starPositions = [[.16, .22], [.82, .24], [.32, .74], [.69, .68]];
      starPositions.forEach(([starX, starY], starIndex) => {
        drawPierrotMakeupMark(ctx, x + width * starX, y + height * starY, Math.max(2.5, width * (starIndex % 2 ? .018 : .024)), starIndex % 2 ? .2 : -.12, starIndex % 2 ? "#ffd05d" : "#f6eee0");
      });
      ctx.fillStyle = "rgba(255,208,103,.66)";
      for (let dot = 0; dot < 3; dot += 1) { ctx.beginPath(); ctx.arc(x + width * (.24 + dot * .26), y + height * (.87 - (index % 2) * .04), Math.max(1.5, width * .009), 0, Math.PI * 2); ctx.fill(); }
    } else {
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "#f0d5a5"); gradient.addColorStop(.42, "#d48666"); gradient.addColorStop(1, "#718f81");
      ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);
      ctx.save();
      ctx.globalAlpha = .12;
      drawMarketRoof(ctx, x + width * .5, y + height * .1, width * .54, height * .16);
      ctx.restore();
      const glow = ctx.createRadialGradient(x + width * .5, y + height * .32, 4, x + width * .5, y + height * .32, width * .7);
      glow.addColorStop(0, "rgba(255,235,181,.2)"); glow.addColorStop(1, "rgba(255,235,181,0)");
      ctx.fillStyle = glow; ctx.fillRect(x, y, width, height);
      ctx.fillStyle = "rgba(255,218,144,.56)";
      for (let lamp = 0; lamp < 4; lamp += 1) { ctx.beginPath(); ctx.arc(x + width * (.16 + lamp * .23), y + height * (.21 + (lamp % 2) * .08), Math.max(2, width * .012), 0, Math.PI * 2); ctx.fill(); }
      drawMapleLeaf(ctx, x + width * .12, y + height * .82, Math.max(3, width * .018), -.32, "#b9493c");
      drawMapleLeaf(ctx, x + width * .88, y + height * .18, Math.max(3, width * .015), .3, "#e4a14d");
    }
    ctx.restore();
  }

  function paintFrame(ctx, width, height, frame, headerOverride, footerOverride) {
    const compact = headerOverride != null ? headerOverride < 110 : height < 700;
    const header = headerOverride ?? (compact ? 88 : 174);
    const footer = footerOverride ?? (compact ? 76 : 186);
    const baseGradient = ctx.createLinearGradient(0, 0, width, height);
    baseGradient.addColorStop(0, "#351526");
    baseGradient.addColorStop(.52, "#1a0d18");
    baseGradient.addColorStop(1, "#0e0810");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, width, height);
    if (frame === "pierrot") {
      drawPierrotCurtains(ctx, width, height, compact, header);
      const bodyGradient = ctx.createLinearGradient(0, header, width, height);
      bodyGradient.addColorStop(0, "#1b132c"); bodyGradient.addColorStop(.55, "#271838"); bodyGradient.addColorStop(1, "#120d20");
      ctx.fillStyle = bodyGradient; ctx.fillRect(0, header, width, height - header);
      ctx.fillStyle = "rgba(237, 134, 87, .14)"; ctx.fillRect(0, header, width, compact ? 2 : 4);
      drawModernFestivalHeader(ctx, width, header, frame, compact);
      drawFrameBorder(ctx, width, height, frame);
      return;
    }
    const bodyGradient = ctx.createLinearGradient(0, header, width, height);
    bodyGradient.addColorStop(0, "#4b2931"); bodyGradient.addColorStop(.48, "#a9655b"); bodyGradient.addColorStop(1, "#283f43");
    ctx.fillStyle = bodyGradient; ctx.fillRect(0, header, width, height - header);
    ctx.fillStyle = "rgba(255, 213, 141, .12)";
    for (let grain = header; grain < height; grain += compact ? 17 : 34) ctx.fillRect(0, grain, width, 1);
    drawModernFestivalHeader(ctx, width, header, frame, compact);
    drawFrameBorder(ctx, width, height, frame);
  }

  function drawFrameFooter(ctx, width, y, height, frame, poong) {
    const compact = height < 100;
    const isPierrot = frame === "pierrot";
    const mascotWidth = compact ? 42 : 96;
    const mascotHeight = compact ? 54 : 104;
    const mascotX = width - mascotWidth - (compact ? 9 : 24);
    const mascotY = y + height - mascotHeight - (compact ? 2 : 6);
    const footerGradient = ctx.createLinearGradient(0, y, 0, y + height);
    if (isPierrot) {
      footerGradient.addColorStop(0, "#39204b"); footerGradient.addColorStop(.55, "#21152f"); footerGradient.addColorStop(1, "#100b1c");
    } else {
      footerGradient.addColorStop(0, "#5b3038"); footerGradient.addColorStop(.55, "#321b29"); footerGradient.addColorStop(1, "#170d18");
    }
    ctx.fillStyle = footerGradient; ctx.fillRect(0, y, width, height);
    ctx.fillStyle = isPierrot ? "rgba(255, 208, 103, .8)" : "rgba(245, 190, 103, .86)";
    ctx.fillRect(0, y, width, compact ? 3 : 5);

    const contentLeft = compact ? 18 : 34;
    const contentRight = mascotX - (compact ? 14 : 28);
    const contentCenter = (contentLeft + contentRight) / 2;
    const kickerY = y + (compact ? 24 : 34);
    const titleY = y + (compact ? 45 : 69);
    const metaY = y + (compact ? 62 : 94);
    const kicker = isPierrot ? "PIERROT THEATRE" : "MARKET NIGHT";
    const message = compact ? (isPierrot ? "무대의 순간을 간직해요" : "오늘 밤을 간직해요") : (isPierrot ? "무대의 순간을 간직해요" : "오늘 밤의 장면을 간직해요");
    drawText(ctx, kicker, contentCenter, kickerY, compact ? 5 : 9, isPierrot ? "#ffd36f" : "#f3c66f", `700 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
    drawGradientText(ctx, message, contentCenter, titleY, compact ? 10 : 22, `700 ${compact ? 10 : 22}px 'Noto Sans KR'`, isPierrot ? ["#fff4df", "#ffd05d", "#f07a6a"] : ["#fff0d0", "#f6c468", "#db735a"]);
    drawText(ctx, "ONE NIGHT  ·  FOUR MOMENTS", contentCenter, metaY, compact ? 5 : 9, "rgba(255, 235, 201, .68)", `600 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
    if (isPierrot) {
      drawPierrotMakeupMark(ctx, contentLeft + (compact ? 4 : 12), titleY - (compact ? 5 : 8), compact ? 3 : 6, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, contentRight - (compact ? 4 : 12), titleY - (compact ? 5 : 8), compact ? 3 : 6, .18, "#ffd05d");
    } else {
      drawMapleLeaf(ctx, contentLeft + (compact ? 4 : 12), titleY - (compact ? 5 : 8), compact ? 3 : 6, -.32, "#e15c45");
      drawMapleLeaf(ctx, contentRight - (compact ? 4 : 12), titleY - (compact ? 5 : 8), compact ? 3 : 6, .32, "#f0bb68");
    }
    if (poong) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
  }

  async function composeStrip() {
    const poong = themedPoong[selectedFrame] || await loadImage("poong.png");
    const photoWidth = 360; const photoHeight = 270; const padding = 32; const gap = 18; const header = 124; const footer = 112;
    const renderScale = 2;
    const width = photoWidth * 2 + gap + padding * 2; const height = header + photoHeight * 2 + gap + footer;
    const canvas = document.createElement("canvas"); canvas.width = Math.round(width * renderScale); canvas.height = Math.round(height * renderScale);
    try {
      const ctx = configureCanvasContext(canvas.getContext("2d"));
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.scale(renderScale, renderScale);
      paintFrame(ctx, width, height, selectedFrame, header, footer);
      drawFrameRails(ctx, width, height, selectedFrame, padding, header, footer);
      const expressionSheet = themedExpressions[selectedFrame];
      shots.forEach((shot, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = padding + column * (photoWidth + gap);
        const y = header + row * (photoHeight + gap);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 13;
        roundedRect(ctx, x, y, photoWidth, photoHeight, 10); ctx.clip();
        drawCover(ctx, shot, x, y, photoWidth, photoHeight);
        ctx.restore();
        ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.62)" : "rgba(255,248,218,.7)"; ctx.lineWidth = 3; roundedRect(ctx, x, y, photoWidth, photoHeight, 10); ctx.stroke();
        const expression = getPreferredPoong(index);
        if (expression) {
          const layout = getFourCutStickerLayout(index);
          ctx.save();
          ctx.filter = filters[selectedFilter].css;
          drawExpressionBadge(ctx, expression, selectedFrame, index, layout.x, layout.y, layout.width, layout.height, Boolean(expressionSheet), layout.faceRight, true);
          ctx.restore();
        }
      });
      drawFrameFooter(ctx, width, height - footer, footer, selectedFrame, poong);
      drawFrameEdgeSeal(ctx, width, height, selectedFrame);
      resultDataUrl = canvas.toDataURL("image/png");
      resultImage.src = resultDataUrl;
      resultFrameLabel.textContent = frameLabels[selectedFrame];
      setFlow("result");
      stopStream();
    } catch (error) {
      console.error("Photo strip composition failed", error);
      cameraStatus.textContent = "합성 실패 · 다시 촬영해 주세요";
      showToast("사진 합성에 실패했어요. 다시 촬영해 주세요.");
    }
  }

  async function captureSession() {
    if (busy) return;
    busy = true; captureButton.disabled = true; backThemeButton.disabled = true; shots = []; resetDots();
    cameraStatus.textContent = "촬영 중 · 포즈 카드만 믿고 따라와요";
    for (let index = 0; index < 4; index += 1) {
      shotDots[index].classList.add("active");
      await countdownAndCapture(index);
      await sleep(300);
    }
    cameraStatus.textContent = "네컷 완성 중...";
    await composeStrip();
    captureButton.disabled = false; backThemeButton.disabled = false; busy = false;
  }

  async function saveResult() {
    if (!resultDataUrl) return;
    try {
      const response = await fetch(resultDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "cau-hwagae-4cut.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "화개장터 × 삐에로 네컷" });
        showToast("공유 시트를 열었어요. 오늘의 가을밤을 보내보세요!");
        return;
      }
      downloadLink.href = URL.createObjectURL(blob); downloadLink.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadLink.href), 4000);
      showToast("사진을 저장했어요. 친구들에게 공유해보세요!");
    } catch (error) {
      showToast("사진을 길게 눌러 저장하거나 다시 시도해주세요.");
    }
  }

  function resetAll() {
    stopStream(); shots = []; resultDataUrl = ""; busy = false; startButton.disabled = false; captureButton.disabled = false; backThemeButton.disabled = false; startLabel.textContent = "NEXT: CAMERA"; $("#btnStart .action-number").textContent = "01"; resetDots(); setFlow("home"); actionNote.textContent = "카메라 권한을 허용하면 바로 촬영할 수 있어요. 권한이 없어도 데모 촬영은 가능합니다."; fallback.classList.remove("hidden");
  }

  $$(".frame-option").forEach((button) => button.addEventListener("click", () => { selectedFrame = button.dataset.frame; updateFrameSelection(); }));
  $$(".filter-option").forEach((button) => button.addEventListener("click", () => { selectedFilter = button.dataset.filter; updateFilterSelection(); }));
  $$(".accessory-option").forEach((button) => button.addEventListener("click", () => { selectedAccessory = button.dataset.accessory; updateAccessorySelection(); openAccessoryPreview(selectedAccessory, button); }));
  $("#btnPose").addEventListener("click", () => { currentPose = (currentPose + 1) % poses.length; updatePose(); });
  enterButton.addEventListener("click", beginBooth);
  $("#btnStart").addEventListener("click", enterCamera);
  captureButton.addEventListener("click", captureSession);
  backThemeButton.addEventListener("click", backToTheme);
  $("#btnReset").addEventListener("click", resetAll);
  $("#btnTopReset").addEventListener("click", resetAll);
  $("#btnRetake").addEventListener("click", resetAll);
  $("#btnSave").addEventListener("click", saveResult);
  window.addEventListener("resize", () => {
    if (body.dataset.flow === "camera") updateCameraPoongGuide(activeShotIndex);
  });
  autoEnhanceToggle?.addEventListener("change", () => {
    autoEnhance = autoEnhanceToggle.checked;
    updateCameraPreviewFilter();
    showToast(autoEnhance ? "AUTO BEAUTY 보정을 켰어요." : "AUTO BEAUTY 보정을 껐어요.");
  });
  accessoryModalClose?.addEventListener("click", closeAccessoryPreview);
  accessoryModalConfirm?.addEventListener("click", closeAccessoryPreview);
  $$("[data-accessory-modal-close]").forEach((element) => element.addEventListener("click", closeAccessoryPreview));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && accessoryPreviewModal && !accessoryPreviewModal.hidden) closeAccessoryPreview();
  });

  updateFrameSelection(); updateFilterSelection(); updatePose(); drawAccessoryPreviews(); setFlow("home");
  Promise.all([
    loadImage("cau-anniversary-mark.png"),
    loadImage("poong-market.png"),
    loadImage("poong-pierrot.png"),
    loadImage("poong-market-expressions-v2.png"),
    loadImage("poong-pierrot-expressions-v2.png"),
    loadImage("poong.png"),
    loadImage("poong-expression-1.png"),
    loadImage("poong-expression-2.png"),
    loadImage("poong-expression-3.png"),
    loadImage("poong-expression-4.png"),
    loadImage("market-campus-background.png"),
    loadImage("pierrot-campus-background.png"),
  ]).then(([anniversaryMark, market, pierrot, marketExpressions, pierrotExpressions, fallbackPoong, expressionOne, expressionTwo, expressionThree, expressionFour, marketBackgroundImage, pierrotBackgroundImage]) => {
    if (anniversaryMark && cauAnniversaryMark) {
      cauAnniversaryMark.src = getTransparentLogo(anniversaryMark).toDataURL("image/png");
      cauAnniversaryMark.classList.add("ready");
    }
    themedPoong = { market, pierrot };
    themedExpressions = { market: marketExpressions, pierrot: pierrotExpressions };
    marketBackground = marketBackgroundImage;
    pierrotBackground = pierrotBackgroundImage;
    expressionPoong = [expressionOne, expressionTwo, expressionThree, expressionFour];
    previewPoong = market || pierrot || fallbackPoong;
    Object.entries(themedPoong).forEach(([theme, image]) => {
      const swatch = frameSwatchArt[theme];
      if (!swatch || !image) return;
      swatch.src = getPoongArtwork(image, "neutral").toDataURL("image/png");
      swatch.classList.add("ready");
    });
    drawAccessoryPreviews();
    drawThemePreview();
    updateCameraPoongGuide();
  });
})();
