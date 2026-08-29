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
  const fallback = $("#cameraFallback");
  const countdown = $("#countdown");
  const flash = $("#flash");
  const shotCount = $("#shotCount");
  const shotDots = $$("#shotDots i");
  const cameraStatus = $("#cameraStatus");
  const resultImage = $("#resultImage");
  const resultFrameLabel = $("#resultFrameLabel");
  const filterPreviewImage = $("#filterPreviewImage");
  const filterPreviewTitle = $("#filterPreviewTitle");
  const filterPreviewCopy = $("#filterPreviewCopy");
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
  let autoEnhance = true;
  let currentPose = 0;
  let facingMode = "user";
  let stream = null;
  let shots = [];
  let resultDataUrl = "";
  let demoMode = false;
  let busy = false;
  let previewPoong = null;
  let themedPoong = { market: null, pierrot: null };
  let themedExpressions = { market: null, pierrot: null };
  let expressionPoong = [];
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

  function stopStream() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
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
      cameraStatus.textContent = "실시간 카메라 · 표정 준비 완료";
      actionNote.textContent = "4초 간격으로 네 장을 촬영해요. 포즈 카드를 참고해보세요.";
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
  }

  function updateFrameSelection() {
    $$(".frame-option").forEach((button) => button.classList.toggle("selected", button.dataset.frame === selectedFrame));
    drawThemePreview();
  }

  function updateFilterSelection() {
    $$(".filter-option").forEach((button) => button.classList.toggle("selected", button.dataset.filter === selectedFilter));
    video.style.filter = filters[selectedFilter].css;
    if (filterPreviewImage) filterPreviewImage.style.filter = filters[selectedFilter].css;
    if (filterPreviewTitle) filterPreviewTitle.textContent = filters[selectedFilter].label;
    if (filterPreviewCopy) filterPreviewCopy.textContent = filters[selectedFilter].copy;
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
  }

  function backToTheme() {
    if (busy) return;
    stopStream();
    setFlow("theme");
    actionNote.textContent = "테마와 필터를 고른 다음 카메라 화면으로 이동해요.";
  }

  function makeDemoShot(index) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = configureCanvasContext(canvas.getContext("2d"));
    drawPreviewPhoto(ctx, 0, 0, canvas.width, canvas.height, selectedFrame, index);
    const vignette = ctx.createRadialGradient(360, 380, 160, 360, 420, 720);
    vignette.addColorStop(0, "rgba(255,255,255,.05)"); vignette.addColorStop(1, "rgba(18,12,28,.28)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function captureCanvas(index) {
    if (demoMode || !video.videoWidth) return makeDemoShot(index);
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1440;
    const ctx = configureCanvasContext(canvas.getContext("2d"));
    const videoRatio = video.videoWidth / video.videoHeight;
    const targetRatio = 3 / 4;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (videoRatio > targetRatio) { sourceWidth = video.videoHeight * targetRatio; sourceX = (video.videoWidth - sourceWidth) / 2; }
    else { sourceHeight = video.videoWidth / targetRatio; sourceY = (video.videoHeight - sourceHeight) / 2; }
    ctx.filter = filters[selectedFilter].css;
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    if (autoEnhance) applyAutoEnhance(ctx, canvas.width, canvas.height);
    if (selectedFilter === "soft") {
      const glow = ctx.createRadialGradient(360, 360, 20, 360, 360, 600);
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

  async function countdownAndCapture(index) {
    for (const number of [3, 2, 1]) {
      countdown.textContent = number;
      countdown.style.opacity = "1";
      await sleep(560);
    }
    countdown.style.opacity = "0";
    flash.style.transition = "none"; flash.style.opacity = ".9";
    await sleep(50);
    flash.style.transition = "opacity .35s ease"; flash.style.opacity = "0";
    shots.push(captureCanvas(index));
    shotDots[index].classList.remove("active"); shotDots[index].classList.add("done");
    shotCount.textContent = `${index + 1} / 4`;
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

  function drawExpressionBadge(ctx, image, theme, index, x, y, width, height, spriteSheet = false, faceRight = false) {
    if (!image || !image.naturalWidth) return;
    const artwork = spriteSheet ? getPoongArtwork(image, "neutral") : getPoongArtwork(image, expressionModes[index] || "neutral");
    ctx.save();
    ctx.shadowColor = theme === "market" ? "rgba(18, 53, 63, .3)" : "rgba(18, 7, 25, .34)";
    ctx.shadowBlur = Math.max(5, width * .06);
    ctx.shadowOffsetY = Math.max(2, height * .025);
    if (spriteSheet) drawSpriteContain(ctx, artwork, index, x, y, width, height, faceRight);
    else drawContain(ctx, artwork, x, y, width, height, faceRight);
    ctx.restore();
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
    const height = 620;
    const previewScale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    themePreview.width = width * previewScale;
    themePreview.height = height * previewScale;
    const header = 88;
    const footer = 76;
    const padding = 16;
    const gap = 8;
    const photoHeight = Math.floor((height - header - footer - gap * 3) / 4);
    const photoWidth = width - padding * 2;
    const ctx = configureCanvasContext(themePreview.getContext("2d"));
    ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);
    paintFrame(ctx, width, height, selectedFrame);
    drawFrameRails(ctx, width, height, selectedFrame, padding, header, footer);
    const poong = themedPoong[selectedFrame] || previewPoong;
    const expressionSheet = themedExpressions[selectedFrame];
    let y = header;
    for (let index = 0; index < 4; index += 1) {
      drawPreviewPhoto(ctx, padding, y, photoWidth, photoHeight, selectedFrame, index);
      ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.58)" : "rgba(255,248,218,.68)";
      ctx.lineWidth = 1.5; ctx.strokeRect(padding, y, photoWidth, photoHeight);
      const expression = expressionSheet || expressionPoong[index] || poong;
      if (expression) {
        const badgeSize = expressionSheet ? Math.min(104, photoHeight - 4, photoWidth * .44) : 78;
        const badgeWidth = badgeSize; const badgeHeight = expressionSheet ? badgeSize : 88;
        const onRight = index % 2 === 0;
        const badgeX = onRight ? padding + photoWidth - badgeWidth - 4 : padding + 4;
        const badgeY = index % 2 === 0 ? y + 2 : y + photoHeight - badgeHeight - 2;
        drawExpressionBadge(ctx, expression, selectedFrame, index, badgeX, badgeY, badgeWidth, badgeHeight, Boolean(expressionSheet), !onRight);
      }
      y += photoHeight + gap;
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
      window.setTimeout(() => finish(null), 5000);
    });
  }

  function drawContain(ctx, image, x, y, width, height, faceRight = false) {
    const sourceWidth = image?.naturalWidth || image?.width;
    const sourceHeight = image?.naturalHeight || image?.height;
    if (!image || !sourceWidth || !sourceHeight) return;
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
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

  function drawSpriteContain(ctx, image, index, x, y, width, height, faceRight = false) {
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
    const drawY = y + (height - drawHeight) / 2;
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

  function drawPreviewPhoto(ctx, x, y, width, height, frame, index) {
    ctx.save();
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
    if (frame === "pierrot") {
      drawPierrotCurtains(ctx, width, height, compact);
      const plaqueX = width * .18;
      const plaqueY = compact ? 10 : 22;
      const plaqueWidth = width * .64;
      const plaqueHeight = compact ? 38 : 64;
      drawMarquee(ctx, plaqueX, plaqueY, plaqueWidth, plaqueHeight, compact);
      drawCauSeal(ctx, width * .1, compact ? 42 : 88, compact ? 10 : 19, "#fff0d1");
      const titleSize = compact ? 18 : 38;
      const subtitleSize = compact ? 6 : 11;
      drawGradientText(ctx, "삐에로", width / 2, compact ? 36 : 61, titleSize, `700 ${titleSize}px 'Noto Serif KR'`, ["#fff4df", "#ffd05d", "#e9574b", "#f3b45e"]);
      drawPierrotMakeupMark(ctx, width * .16, compact ? 35 : 59, compact ? 3 : 6, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, width * .84, compact ? 35 : 59, compact ? 3 : 6, .18, "#ffd05d");
      drawText(ctx, "PIERROT THEATRE", width / 2, compact ? 58 : 110, subtitleSize, "#ffd05d", `600 ${subtitleSize}px 'IBM Plex Mono'`);
      drawText(ctx, "CAU FALL FESTIVAL  ·  2026", width / 2, compact ? 70 : 130, compact ? 5 : 9, "rgba(255,240,214,.7)", `500 ${compact ? 5 : 9}px 'IBM Plex Mono'`);
      ctx.fillStyle = "#17152d"; ctx.fillRect(0, header, width, height - header);
      return;
    }
    const paper = ctx.createLinearGradient(0, 0, width, height);
    paper.addColorStop(0, "#f6e8c9"); paper.addColorStop(.5, "#efe0be"); paper.addColorStop(1, "#e7d3ac");
    ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(90, 45, 40, .08)";
    for (let grain = 0; grain < height; grain += compact ? 13 : 29) ctx.fillRect(0, grain, width, 1);
    ctx.fillStyle = "#2b171c"; ctx.fillRect(0, 0, width, header);
    ctx.fillStyle = "#d9a24d"; ctx.fillRect(0, 0, width, compact ? 4 : 7);
    drawMarketRoof(ctx, width / 2, compact ? 5 : 12, width * .43, compact ? 18 : 31);
    const signX = width * .2;
    const signY = compact ? 21 : 41;
    const signWidth = width * .6;
    const signHeight = compact ? 37 : 71;
    roundedRect(ctx, signX, signY, signWidth, signHeight, compact ? 7 : 13);
    ctx.fillStyle = "#f3dfb3"; ctx.fill();
    ctx.strokeStyle = "rgba(215, 162, 77, .82)"; ctx.lineWidth = compact ? 1 : 2; ctx.stroke();
    drawMapleLeaf(ctx, signX + signWidth * .1, signY + signHeight * .32, compact ? 3.5 : 7, -.35, "#c84d3d");
    drawMapleLeaf(ctx, signX + signWidth * .9, signY + signHeight * .32, compact ? 3.5 : 7, .35, "#d8843b");
    const titleSize = compact ? 19 : 37;
    const subtitleSize = compact ? 5 : 10;
    drawGradientText(ctx, "화개장터", width / 2, compact ? 46 : 83, titleSize, `700 ${titleSize}px 'Noto Serif KR'`, ["#7b2f32", "#c25b3f", "#7b2f32"]);
    drawText(ctx, "CAU FALL FESTIVAL  ·  MARKET NIGHT", width / 2, compact ? 58 : 105, subtitleSize, "#855147", `600 ${subtitleSize}px 'IBM Plex Mono'`);
    drawCauSeal(ctx, width * .1, compact ? 32 : 71, compact ? 8 : 15, "#f3d49a");
    drawText(ctx, "2026", width * .9, compact ? 31 : 67, compact ? 7 : 12, "#f0c766", `700 ${compact ? 7 : 12}px 'IBM Plex Mono'`);
    drawMarketAwning(ctx, 0, header - (compact ? 14 : 24), width, compact ? 14 : 24);
  }

  function drawFrameFooter(ctx, width, y, height, frame, poong) {
    const compact = height < 120;
    const bandHeight = compact ? 16 : 28;
    const mascotWidth = compact ? 42 : 116;
    const mascotHeight = compact ? 54 : 132;
    const mascotX = width - mascotWidth - (compact ? 9 : 28);
    const mascotY = y + height - mascotHeight - (compact ? 2 : 5);
    const textX = compact ? width * .34 : width * .37;
    const titleY = y + (compact ? 45 : 82);
    const metaY = y + (compact ? 61 : 111);
    if (frame === "pierrot") {
      const footerGradient = ctx.createLinearGradient(0, y, 0, y + height);
      footerGradient.addColorStop(0, "#2d1b42"); footerGradient.addColorStop(1, "#141126");
      ctx.fillStyle = footerGradient; ctx.fillRect(0, y, width, height);
      ctx.fillStyle = "rgba(255,208,103,.78)"; ctx.fillRect(0, y, width, compact ? 3 : 6);
      ctx.strokeStyle = "rgba(255,208,103,.42)"; ctx.lineWidth = compact ? 1 : 2;
      ctx.beginPath(); ctx.moveTo(width * .11, y + (compact ? 31 : 52)); ctx.lineTo(width * .31, y + (compact ? 31 : 52)); ctx.moveTo(width * .69, y + (compact ? 31 : 52)); ctx.lineTo(width * .89, y + (compact ? 31 : 52)); ctx.stroke();
      for (let lightX = width * .15; lightX < width * .88; lightX += compact ? 32 : 64) drawLantern(ctx, lightX, y + (compact ? 31 : 52), compact ? 2 : 3, "#ffd05d");
      drawPierrotMakeupMark(ctx, width * .12, y + height * .68, compact ? 3 : 7, -.18, "#e9574b");
      drawPierrotMakeupMark(ctx, width * .2, y + height * .78, compact ? 2.5 : 6, .2, "#ffd05d");
      drawGradientText(ctx, "삐에로 극장", textX, y + (compact ? 50 : 83), compact ? 9 : 21, `700 ${compact ? 9 : 21}px 'Noto Serif KR'`, ["#fff4df", "#ffd05d", "#e9574b"]);
      drawText(ctx, "CAU FALL FESTIVAL  ·  PIERROT THEATRE", textX, y + (compact ? 65 : 108), compact ? 5 : 10, "#ead0b3", `500 ${compact ? 5 : 10}px 'IBM Plex Mono'`);
      if (poong) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
      return;
    } else {
      const footerGradient = ctx.createLinearGradient(0, y, 0, y + height);
      footerGradient.addColorStop(0, "#3a2027"); footerGradient.addColorStop(1, "#24141a");
      ctx.fillStyle = footerGradient; ctx.fillRect(0, y, width, height);
      ctx.fillStyle = "#d9a24d"; ctx.fillRect(0, y, width, compact ? 4 : 7);
      drawMarketAwning(ctx, 0, y + (compact ? 8 : 13), width, bandHeight);
      const ticketX = compact ? 22 : 58;
      const ticketY = y + (compact ? 31 : 52);
      const ticketWidth = width - ticketX - mascotWidth - (compact ? 20 : 34);
      const ticketHeight = compact ? 35 : 76;
      roundedRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, compact ? 7 : 12);
      ctx.fillStyle = "#f3dfb3"; ctx.fill();
      ctx.strokeStyle = "rgba(217, 162, 77, .82)"; ctx.lineWidth = compact ? 1 : 2; ctx.stroke();
      drawCauSeal(ctx, ticketX + (compact ? 17 : 27), ticketY + ticketHeight / 2, compact ? 7 : 13, "#7b3a35");
      const ticketTextX = ticketX + ticketWidth * .57;
      drawText(ctx, "오늘의 한 컷 · 화개장터", ticketTextX, ticketY + (compact ? 16 : 34), compact ? 8 : 17, "#7b2f32", `700 ${compact ? 8 : 17}px 'Noto Sans KR'`);
      drawText(ctx, "CAU FALL FESTIVAL  ·  2026", ticketTextX, ticketY + (compact ? 27 : 55), compact ? 5 : 10, "#9d604d", `600 ${compact ? 5 : 10}px 'IBM Plex Mono'`);
      drawMapleLeaf(ctx, ticketX + ticketWidth - (compact ? 13 : 23), ticketY + (compact ? 11 : 22), compact ? 3 : 6, .32, "#c84d3d");
      drawMapleLeaf(ctx, width * .08, y + height * .68, compact ? 2.6 : 5.5, -.3, "#d8843b");
      if (poong) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
      return;
    }
    drawCauSeal(ctx, compact ? width * .12 : width * .13, y + height * .55, compact ? 8 : 17, "#fff0d1");
    if (poong && (frame === "market" || frame === "pierrot")) drawThemePoongSticker(ctx, poong, frame, mascotX, mascotY, mascotWidth, mascotHeight);
    drawText(ctx, frame === "pierrot" ? (compact ? "극장 불빛 아래 한 컷" : "삐에로 극장에서 만나요") : (compact ? "가을 장터에서 한 컷" : "화개장터에서 만난 가을밤"), textX, titleY, compact ? 9 : 20, "#fff6e4", `700 ${compact ? 9 : 20}px 'Noto Sans KR'`);
    drawText(ctx, frame === "pierrot" ? "CIRCUS CLUB  ·  CAU" : "MARKET NIGHT  ·  CAU", textX, metaY, compact ? 6 : 12, "#ffe0bd", `500 ${compact ? 6 : 12}px 'IBM Plex Mono'`);
  }

  async function composeStrip() {
    const poong = themedPoong[selectedFrame] || await loadImage("poong.png");
    const photoWidth = 720; const photoHeight = 300; const padding = 32; const gap = 18; const header = 174; const footer = 186;
    const renderScale = 2;
    const width = photoWidth + padding * 2; const height = header + photoHeight * 4 + gap * 3 + footer;
    const canvas = document.createElement("canvas"); canvas.width = Math.round(width * renderScale); canvas.height = Math.round(height * renderScale);
    try {
      const ctx = configureCanvasContext(canvas.getContext("2d"));
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.scale(renderScale, renderScale);
      paintFrame(ctx, width, height, selectedFrame);
      drawFrameRails(ctx, width, height, selectedFrame, padding, header, footer);
      let y = header;
      const expressionSheet = themedExpressions[selectedFrame];
      shots.forEach((shot, index) => {
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 13; drawCover(ctx, shot, padding, y, photoWidth, photoHeight); ctx.restore();
        ctx.strokeStyle = selectedFrame === "pierrot" ? "rgba(255,224,160,.62)" : "rgba(255,248,218,.7)"; ctx.lineWidth = 3; ctx.strokeRect(padding, y, photoWidth, photoHeight);
        const expression = expressionSheet || expressionPoong[index] || poong;
        if (expression) {
          const stickerWidth = expressionSheet ? 236 : 166; const stickerHeight = expressionSheet ? 254 : 202;
          const onRight = index % 2 === 0;
          const stickerX = onRight ? padding + photoWidth - stickerWidth - 18 : padding + 18;
          const stickerY = index % 2 === 0 ? y + 18 : y + photoHeight - stickerHeight - 18;
          drawExpressionBadge(ctx, expression, selectedFrame, index, stickerX, stickerY, stickerWidth, stickerHeight, Boolean(expressionSheet), !onRight);
        }
        y += photoHeight + gap;
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
  $("#btnPose").addEventListener("click", () => { currentPose = (currentPose + 1) % poses.length; updatePose(); });
  enterButton.addEventListener("click", beginBooth);
  $("#btnStart").addEventListener("click", enterCamera);
  captureButton.addEventListener("click", captureSession);
  backThemeButton.addEventListener("click", backToTheme);
  $("#btnReset").addEventListener("click", resetAll);
  $("#btnTopReset").addEventListener("click", resetAll);
  $("#btnRetake").addEventListener("click", resetAll);
  $("#btnSave").addEventListener("click", saveResult);
  autoEnhanceToggle?.addEventListener("change", () => {
    autoEnhance = autoEnhanceToggle.checked;
    showToast(autoEnhance ? "AUTO BEAUTY 보정을 켰어요." : "AUTO BEAUTY 보정을 껐어요.");
  });

  updateFrameSelection(); updateFilterSelection(); updatePose(); setFlow("home");
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
  ]).then(([anniversaryMark, market, pierrot, marketExpressions, pierrotExpressions, fallbackPoong, expressionOne, expressionTwo, expressionThree, expressionFour]) => {
    if (anniversaryMark && cauAnniversaryMark) {
      cauAnniversaryMark.src = getTransparentLogo(anniversaryMark).toDataURL("image/png");
      cauAnniversaryMark.classList.add("ready");
    }
    themedPoong = { market, pierrot };
    themedExpressions = { market: marketExpressions, pierrot: pierrotExpressions };
    expressionPoong = [expressionOne, expressionTwo, expressionThree, expressionFour];
    previewPoong = market || pierrot || fallbackPoong;
    Object.entries(themedPoong).forEach(([theme, image]) => {
      const swatch = frameSwatchArt[theme];
      if (!swatch || !image) return;
      swatch.src = getPoongArtwork(image, "neutral").toDataURL("image/png");
      swatch.classList.add("ready");
    });
    drawThemePreview();
  });
})();
