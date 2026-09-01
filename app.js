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

  function drawAccessory(ctx, accessory, width) {
    if (accessory === "maple-pin") drawMapleHairpin(ctx, width);
    else if (accessory === "poong-band") drawPoongHeadband(ctx, width);
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
      const width = canvas.width;
      const height = canvas.height;
      const faceWidth = 45;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height * .64);

      const faceGradient = ctx.createLinearGradient(0, -height * .28, 0, height * .1);
      faceGradient.addColorStop(0, "rgba(111, 207, 235, .92)");
      faceGradient.addColorStop(1, "rgba(49, 139, 190, .92)");
      ctx.fillStyle = faceGradient;
      ctx.beginPath();
      ctx.ellipse(0, 2, faceWidth * .4, height * .3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(14, 44, 73, .78)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "rgba(247, 253, 245, .88)";
      ctx.beginPath();
      ctx.ellipse(-faceWidth * .14, -height * .09, faceWidth * .08, height * .1, -.25, 0, Math.PI * 2);
      ctx.ellipse(faceWidth * .14, -height * .09, faceWidth * .08, height * .1, .25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#163451";
      ctx.beginPath();
      ctx.arc(-faceWidth * .14, 1, 2.1, 0, Math.PI * 2);
      ctx.arc(faceWidth * .14, 1, 2.1, 0, Math.PI * 2);
      ctx.fill();

      drawAccessory(ctx, canvas.dataset.accessoryPreview, faceWidth);
      ctx.restore();
    });
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
    drawThemePreview();
    updateCameraPoongGuide(activeShotIndex);
  }

  function getFourCutStickerLayout(index) {
    const photoWidth = 360;
    const photoHeight = 270;
    const padding = 32;
    const gap = 18;
    const header = 174;
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

  function drawPierrotCurtains(ctx, width, height, compact) {
    const curtainHeight = compact ? 88 : 174;
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
      ctx.filter = filters[selectedFilter].css;
      drawPreviewPhoto(ctx, x, y, photoWidth, photoHeight, selectedFrame, index);
      ctx.restore();
      ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.58)" : "rgba(255,248,218,.68)";
      ctx.lineWidth = 1.5; ctx.strokeRect(x, y, photoWidth, photoHeight);
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
      const red = pixels.data[offset]; const green = pixels.data[offset + 1]; const blue = pixels.data[offset + 2];
      const max = Math.max(red, green, blue); const min = Math.min(red, green, blue);
      if (mode === "pink") return (red > 145 && red - green > 20 && red - blue > 4) || (min > 215 && max - min < 36);
      if (mode === "dark") return (max - min < 46 && max < 150) || (min > 175 && max - min < 32);
      if (mode === "black") return max < 76;
      return max - min < 30 && min > 140;
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
    ctx.save();
    if (frame === "pierrot") {
      const railGradient = ctx.createLinearGradient(0, header, 0, height - footer);
      railGradient.addColorStop(0, "#432044"); railGradient.addColorStop(.52, "#251934"); railGradient.addColorStop(1, "#542447");
      ctx.fillStyle = railGradient;
      ctx.fillRect(0, header, padding, railHeight);
      ctx.fillRect(width - padding, header, padding, railHeight);
      ctx.strokeStyle = "rgba(255,208,103,.58)";
      ctx.lineWidth = height < 1000 ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(padding - (height < 1000 ? 2 : 4), header);
      ctx.lineTo(padding - (height < 1000 ? 2 : 4), height - footer);
      ctx.moveTo(width - padding + (height < 1000 ? 2 : 4), header);
      ctx.lineTo(width - padding + (height < 1000 ? 2 : 4), height - footer);
      ctx.stroke();
      const step = height < 1000 ? 78 : 210;
      for (let y = header + (height < 1000 ? 38 : 82); y < height - footer - 14; y += step) {
        drawPierrotMakeupMark(ctx, padding / 2, y, height < 1000 ? 2.8 : 6, -.15, y % 2 ? "#e9574b" : "#ffd05d");
        drawPierrotMakeupMark(ctx, width - padding / 2, y + (height < 1000 ? 21 : 48), height < 1000 ? 2.6 : 5.5, .15, y % 2 ? "#ffd05d" : "#e9574b");
      }
    } else {
      const compact = height < 1000;
      const railGradient = ctx.createLinearGradient(0, header, 0, height - footer);
      railGradient.addColorStop(0, "#5b302d");
      railGradient.addColorStop(.5, "#3c2529");
      railGradient.addColorStop(1, "#6a352f");
      ctx.fillStyle = railGradient;
      ctx.fillRect(0, header, padding, railHeight);
      ctx.fillRect(width - padding, header, padding, railHeight);
      ctx.strokeStyle = "rgba(255,208,93,.7)";
      ctx.lineWidth = compact ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(padding - (compact ? 2 : 4), header);
      ctx.lineTo(padding - (compact ? 2 : 4), height - footer);
      ctx.moveTo(width - padding + (compact ? 2 : 4), header);
      ctx.lineTo(width - padding + (compact ? 2 : 4), height - footer);
      ctx.stroke();
      for (let y = header + (compact ? 52 : 150); y < height - footer - 20; y += compact ? 78 : 220) {
        drawMapleLeaf(ctx, padding / 2, y, compact ? 2.8 : 6.5, -.35, y % 2 ? "#d86d43" : "#e8ae55");
        drawMapleLeaf(ctx, width - padding / 2, y + (compact ? 18 : 40), compact ? 2.6 : 6, .35, y % 2 ? "#e8ae55" : "#c84d3d");
      }
    }
    ctx.restore();
  }

  function drawFrameBorder(ctx, width, height, frame) {
    const compact = height < 1000;
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

  function drawModernFestivalHeader(ctx, width, header, frame, compact) {
    const isPierrot = frame === "pierrot";
    const inset = compact ? 10 : 20;
    const panelY = compact ? 8 : 16;
    const panelHeight = header - panelY * 2;
    const accent = isPierrot ? "#ffd36f" : "#f3c66f";
    const panelGradient = ctx.createLinearGradient(0, panelY, width, panelY + panelHeight);
    if (isPierrot) {
      panelGradient.addColorStop(0, "rgba(30, 16, 48, .94)");
      panelGradient.addColorStop(.54, "rgba(42, 21, 55, .78)");
      panelGradient.addColorStop(1, "rgba(17, 12, 29, .96)");
    } else {
      panelGradient.addColorStop(0, "rgba(39, 18, 30, .96)");
      panelGradient.addColorStop(.56, "rgba(55, 24, 35, .82)");
      panelGradient.addColorStop(1, "rgba(22, 11, 19, .97)");
    }
    ctx.save();
    ctx.fillStyle = panelGradient;
    ctx.fillRect(0, 0, width, header);
    const glow = ctx.createRadialGradient(width / 2, header * .66, 3, width / 2, header * .66, width * .62);
    glow.addColorStop(0, isPierrot ? "rgba(180, 122, 255, .16)" : "rgba(255, 181, 98, .16)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, header);
    roundedRect(ctx, inset, panelY, width - inset * 2, panelHeight, compact ? 10 : 20);
    ctx.strokeStyle = isPierrot ? "rgba(255, 211, 111, .42)" : "rgba(255, 221, 150, .46)";
    ctx.lineWidth = compact ? 1 : 1.5;
    ctx.stroke();

    const markSize = compact ? 24 : 48;
    const markX = compact ? 18 : 34;
    const markY = compact ? 14 : 27;
    if (cauAnniversaryMark?.naturalWidth) {
      drawContain(ctx, cauAnniversaryMark, markX, markY, markSize, markSize);
    } else {
      drawCauSeal(ctx, markX + markSize / 2, markY + markSize / 2, markSize * .38, accent);
    }
    const copyX = markX + markSize + (compact ? 8 : 12);
    drawText(ctx, "CAU SEOUL CAMPUS", copyX, compact ? 25 : 45, compact ? 6 : 10, "rgba(255, 239, 213, .82)", `700 ${compact ? 6 : 10}px 'IBM Plex Mono'`, "left");
    // Keep the top line purely informational. The old "PIERROT / LIVE"
    // marquee competed with the bulbs and made the header feel crowded.
    drawText(ctx, "2026  /  FALL FESTIVAL", width - (compact ? 18 : 34), compact ? 25 : 45, compact ? 6 : 10, accent, `700 ${compact ? 6 : 10}px 'IBM Plex Mono'`, "right");

    const titleSize = compact ? 27 : 56;
    const titleY = compact ? 64 : 126;
    const title = isPierrot ? "삐에로" : "화개장터";
    const colors = isPierrot ? ["#fff5e5", "#ffd05d", "#f07a6a", "#f3b45e"] : ["#fff3d8", "#f2bf6b", "#df755d", "#fff0c9"];
    drawGradientText(ctx, title, width / 2, titleY, titleSize, `700 ${titleSize}px 'Noto Serif KR'`, colors);
    if (isPierrot) {
      drawPierrotMakeupMark(ctx, width * .19, compact ? 64 : 122, compact ? 3 : 7, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, width * .81, compact ? 64 : 122, compact ? 3 : 7, .18, "#ffd05d");
    } else {
      drawMapleLeaf(ctx, width * .18, compact ? 61 : 119, compact ? 3 : 7, -.32, "#d95345");
      drawMapleLeaf(ctx, width * .82, compact ? 61 : 119, compact ? 3 : 7, .32, "#f2bd68");
    }
    ctx.strokeStyle = isPierrot ? "rgba(255, 208, 93, .5)" : "rgba(246, 194, 101, .58)";
    ctx.lineWidth = compact ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(width * .25, compact ? 72 : 140);
    ctx.lineTo(width * .75, compact ? 72 : 140);
    ctx.stroke();
    drawText(ctx, isPierrot ? "PIERROT THEATRE  /  STAGE LIGHTS" : "MARKET NIGHT  /  GATHER & GLOW", width / 2, compact ? 83 : 160, compact ? 5 : 9, "rgba(255, 235, 201, .74)", `600 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
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

  function paintFrame(ctx, width, height, frame) {
    const compact = height < 1000;
    const header = compact ? 88 : 174;
    const footer = compact ? 76 : 186;
    const baseGradient = ctx.createLinearGradient(0, 0, width, height);
    baseGradient.addColorStop(0, "#351526");
    baseGradient.addColorStop(.52, "#1a0d18");
    baseGradient.addColorStop(1, "#0e0810");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, width, height);
    if (frame === "pierrot") {
      drawPierrotCurtains(ctx, width, height, compact);
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
    const compact = height < 120;
    const mascotWidth = compact ? 42 : 116;
    const mascotHeight = compact ? 54 : 132;
    const mascotX = width - mascotWidth - (compact ? 9 : 28);
    const mascotY = y + height - mascotHeight - (compact ? 2 : 5);
    if (frame === "pierrot") {
      const footerGradient = ctx.createLinearGradient(0, y, 0, y + height);
      footerGradient.addColorStop(0, "#321c48"); footerGradient.addColorStop(.58, "#1d1533"); footerGradient.addColorStop(1, "#0f0b1e");
      ctx.fillStyle = footerGradient; ctx.fillRect(0, y, width, height);
      ctx.fillStyle = "rgba(255,208,103,.72)"; ctx.fillRect(0, y, width, compact ? 3 : 6);
      const pillX = compact ? 18 : 46;
      const pillY = y + (compact ? 22 : 44);
      const pillWidth = width - pillX - mascotWidth - (compact ? 26 : 62);
      const pillHeight = compact ? 36 : 80;
      roundedRect(ctx, pillX, pillY, pillWidth, pillHeight, compact ? 10 : 19);
      ctx.fillStyle = "rgba(13, 9, 28, .6)"; ctx.fill();
      ctx.strokeStyle = "rgba(255, 208, 93, .42)"; ctx.lineWidth = compact ? 1 : 2; ctx.stroke();
      drawPierrotMakeupMark(ctx, pillX + (compact ? 15 : 29), pillY + pillHeight / 2, compact ? 3 : 6, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, pillX + pillWidth - (compact ? 15 : 29), pillY + pillHeight / 2, compact ? 3 : 6, .18, "#ffd05d");
      drawGradientText(ctx, "삐에로 극장", pillX + pillWidth / 2, pillY + (compact ? 19 : 43), compact ? 10 : 23, `700 ${compact ? 10 : 23}px 'Noto Serif KR'`, ["#fff4df", "#ffd05d", "#e9574b", "#f3b45e"]);
      drawText(ctx, "PIERROT THEATRE  ·  CAU FALL FESTIVAL", pillX + pillWidth / 2, pillY + (compact ? 30 : 62), compact ? 5 : 10, "#ead0b3", `600 ${compact ? 5 : 10}px 'IBM Plex Mono'`);
      drawText(ctx, "2026", pillX + pillWidth - (compact ? 16 : 29), pillY + pillHeight - (compact ? 6 : 12), compact ? 5 : 9, "#ffd05d", `700 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
      if (poong) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
      return;
    } else {
      const footerGradient = ctx.createLinearGradient(0, y, 0, y + height);
      footerGradient.addColorStop(0, "#552b35"); footerGradient.addColorStop(.5, "#321a27"); footerGradient.addColorStop(1, "#190c15");
      ctx.fillStyle = footerGradient; ctx.fillRect(0, y, width, height);
      ctx.fillStyle = "rgba(245, 190, 103, .8)"; ctx.fillRect(0, y, width, compact ? 3 : 6);
      const pillX = compact ? 18 : 46;
      const pillY = y + (compact ? 22 : 44);
      const pillWidth = width - pillX - mascotWidth - (compact ? 26 : 62);
      const pillHeight = compact ? 36 : 80;
      roundedRect(ctx, pillX, pillY, pillWidth, pillHeight, compact ? 10 : 19);
      ctx.fillStyle = "rgba(255, 234, 189, .94)"; ctx.fill();
      ctx.strokeStyle = "rgba(246, 195, 101, .78)"; ctx.lineWidth = compact ? 1 : 2; ctx.stroke();
      drawCauSeal(ctx, pillX + (compact ? 16 : 30), pillY + pillHeight / 2, compact ? 7 : 14, "#7b3a35");
      drawGradientText(ctx, "화개장터", pillX + pillWidth * .57, pillY + (compact ? 19 : 43), compact ? 10 : 23, `700 ${compact ? 10 : 23}px 'Noto Serif KR'`, ["#7b2f32", "#c25b3f", "#e39b50", "#7b2f32"]);
      drawText(ctx, "MARKET NIGHT  ·  CAU FALL FESTIVAL", pillX + pillWidth * .57, pillY + (compact ? 30 : 62), compact ? 5 : 10, "#9d604d", `600 ${compact ? 5 : 10}px 'IBM Plex Mono'`);
      drawText(ctx, "2026", pillX + pillWidth - (compact ? 16 : 29), pillY + pillHeight - (compact ? 6 : 12), compact ? 5 : 9, "#a74a3d", `700 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
      drawMapleLeaf(ctx, pillX + pillWidth - (compact ? 16 : 30), pillY + (compact ? 11 : 22), compact ? 3 : 6, .32, "#c84d3d");
      drawMapleLeaf(ctx, width * .08, y + height * .68, compact ? 2.6 : 5.5, -.3, "#e8ae55");
      if (poong) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
      return;
    }
  }

  async function composeStrip() {
    const poong = themedPoong[selectedFrame] || await loadImage("poong.png");
    const photoWidth = 360; const photoHeight = 270; const padding = 32; const gap = 18; const header = 174; const footer = 186;
    const renderScale = 2;
    const width = photoWidth * 2 + gap + padding * 2; const height = header + photoHeight * 2 + gap + footer;
    const canvas = document.createElement("canvas"); canvas.width = Math.round(width * renderScale); canvas.height = Math.round(height * renderScale);
    try {
      const ctx = configureCanvasContext(canvas.getContext("2d"));
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.scale(renderScale, renderScale);
      paintFrame(ctx, width, height, selectedFrame);
      drawFrameRails(ctx, width, height, selectedFrame, padding, header, footer);
      const expressionSheet = themedExpressions[selectedFrame];
      shots.forEach((shot, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = padding + column * (photoWidth + gap);
        const y = header + row * (photoHeight + gap);
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 13; drawCover(ctx, shot, x, y, photoWidth, photoHeight); ctx.restore();
        ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.62)" : "rgba(255,248,218,.7)"; ctx.lineWidth = 3; ctx.strokeRect(x, y, photoWidth, photoHeight);
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
  $$(".accessory-option").forEach((button) => button.addEventListener("click", () => { selectedAccessory = button.dataset.accessory; updateAccessorySelection(); }));
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
    drawThemePreview();
    updateCameraPoongGuide();
  });
})();
