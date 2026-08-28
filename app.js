(() => {
  const filters = {
    soft: { label: "SOFT FLASH", css: "brightness(1.08) contrast(.94) saturate(1.12)" },
    film: { label: "FILM GRAIN", css: "sepia(.16) contrast(1.05) saturate(.9) brightness(1.03)" },
    mono: { label: "MONO MOOD", css: "grayscale(1) contrast(1.1) brightness(1.04)" },
    night: { label: "NIGHT GLOW", css: "saturate(1.28) contrast(1.08) brightness(.96) hue-rotate(8deg)" }
  };

  const frameLabels = { market: "MARKET NIGHT", pierrot: "PIERROT CIRCUS", poong: "CAU FRIENDS", noir: "NOIR FILM" };
  const poses = [
    ["엔딩요정 포즈", "마지막 컷에는 손 하트, 기억해두기!"],
    ["삐에로 모드", "눈 크게, 턱 살짝! 과감할수록 귀여워요."],
    ["시장 한바퀴", "서로의 어깨를 톡, 시선은 반대로."],
    ["무심한 브이", "카메라보다 15도 옆을 바라봐요."],
    ["친구 인증샷", "팔짱 끼고 웃음은 120%로!"],
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const stage = $("#captureStage");
  const video = $("#video");
  const fallback = $("#cameraFallback");
  const countdown = $("#countdown");
  const flash = $("#flash");
  const shotCount = $("#shotCount");
  const shotDots = $$("#shotDots i");
  const cameraStatus = $("#cameraStatus");
  const resultImage = $("#resultImage");
  const resultFrameLabel = $("#resultFrameLabel");
  const controlPanel = $("#controlPanel");
  const boothActions = $("#boothActions");
  const resultActions = $("#resultActions");
  const startButton = $("#btnStart");
  const startLabel = $("#startLabel");
  const actionNote = $("#actionNote");
  const toast = $("#toast");
  const downloadLink = $("#downloadLink");

  let selectedFrame = "market";
  let selectedFilter = "soft";
  let currentPose = 0;
  let facingMode = "user";
  let stream = null;
  let shots = [];
  let resultDataUrl = "";
  let demoMode = false;
  let busy = false;

  function setMode(mode) {
    stage.dataset.mode = mode;
    const step = mode === "home" ? 1 : mode === "camera" ? 2 : 3;
    $$(".step").forEach((el) => el.classList.toggle("active", Number(el.dataset.step) === step));
    if (mode === "result") {
      controlPanel.hidden = true;
      boothActions.hidden = true;
      resultActions.hidden = false;
    } else {
      controlPanel.hidden = false;
      boothActions.hidden = false;
      resultActions.hidden = true;
    }
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
  }

  function updateFilterSelection() {
    $$(".filter-option").forEach((button) => button.classList.toggle("selected", button.dataset.filter === selectedFilter));
    video.style.filter = filters[selectedFilter].css;
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
    setMode("camera");
    startLabel.textContent = "CAPTURE 4 CUTS";
    $(".action-number").textContent = "02";
    actionNote.textContent = "카메라 권한을 허용하면 실시간 촬영, 아니면 데모 촬영으로 진행돼요.";
    openCamera();
  }

  function makeDemoShot(index) {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext("2d");
    const palettes = [
      ["#ffad7b", "#5c396b"], ["#9e9cff", "#273b69"], ["#f8d36b", "#7b3d58"], ["#86d7d0", "#253452"],
    ];
    const [a, b] = palettes[index % palettes.length];
    const gradient = ctx.createLinearGradient(0, 0, 720, 960);
    gradient.addColorStop(0, a); gradient.addColorStop(1, b);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 720, 960);
    ctx.fillStyle = "rgba(255,255,255,.17)";
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 127 + index * 58) % 760;
      const y = (i * 211 + index * 83) % 980;
      ctx.beginPath(); ctx.arc(x, y, 7 + (i % 4) * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(17,15,39,.25)";
    ctx.beginPath(); ctx.ellipse(360, 650, 185, 260, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "600 26px 'IBM Plex Mono'"; ctx.fillText(["SMILE", "VIBE", "CHEESE", "LOVE"][index], 45, 880);
    ctx.font = "500 16px 'IBM Plex Mono'"; ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText("HUAGAE CAM / DEMO", 45, 914);
    return canvas;
  }

  function captureCanvas(index) {
    if (demoMode || !video.videoWidth) return makeDemoShot(index);
    const canvas = document.createElement("canvas");
    canvas.width = 720; canvas.height = 960;
    const ctx = canvas.getContext("2d");
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
    if (selectedFilter === "soft") {
      const glow = ctx.createRadialGradient(360, 360, 20, 360, 360, 600);
      glow.addColorStop(0, "rgba(255,255,255,.23)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (selectedFilter === "film") addFilmGrain(ctx, canvas.width, canvas.height);
    return canvas;
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

  function drawPoong(ctx, image, x, y, width, height) {
    if (!image.complete || !image.naturalWidth) return;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 12; ctx.drawImage(image, x - width / 2, y, width, height); ctx.restore();
  }

  function paintFrame(ctx, width, height, frame) {
    if (frame === "pierrot") {
      ctx.fillStyle = "#faefd9"; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#e9574b";
      for (let x = -height; x < width + height; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 42, 0); ctx.lineTo(x - height + 42, 142); ctx.lineTo(x - height, 142); ctx.closePath(); ctx.fill(); }
      drawConfetti(ctx, width, 145, 4);
      drawLantern(ctx, width * .12, 80, 13, "#f8b94f"); drawLantern(ctx, width * .88, 80, 13, "#f8b94f");
      ctx.fillStyle = "#f8d36b"; for (let i = 0; i < 30; i += 1) { ctx.beginPath(); ctx.arc((i * 79) % width, 95 + ((i * 37) % 45), 4, 0, Math.PI * 2); ctx.fill(); }
      drawText(ctx, "화개장터", width / 2, 85, 42, "#302247", "400 42px 'Gugi'");
      drawText(ctx, "HUAGAE MARKET × PIERROT", width / 2, 116, 14, "#9f3a39", "600 14px 'IBM Plex Mono'");
      return;
    }
    if (frame === "poong") {
      const gradient = ctx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, "#8f2938"); gradient.addColorStop(.52, "#db543a"); gradient.addColorStop(1, "#ffd36a"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 8; i += 1) { ctx.strokeStyle = `rgba(255,244,223,${.1 + i * .015})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(width * .5, 100, 95 + i * 40, Math.PI, Math.PI * 2); ctx.stroke(); }
      drawText(ctx, "푸앙이랑", width / 2, 66, 32, "#fff4df", "400 32px 'Gugi'");
      drawText(ctx, "HUAGAE × PIERROT / CAU 2026", width / 2, 100, 13, "#fff0cf", "600 13px 'IBM Plex Mono'");
      return;
    }
    if (frame === "noir") {
      const gradient = ctx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, "#111328"); gradient.addColorStop(.5, "#39285f"); gradient.addColorStop(1, "#10111e"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      drawConfetti(ctx, width, 135, 16);
      drawText(ctx, "화개장터", width / 2, 78, 43, "#f8f4ec", "400 43px 'Gugi'");
      drawText(ctx, "NOIR FILM / CAU 2026", width / 2, 109, 14, "#86d7d0", "600 14px 'IBM Plex Mono'");
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, "#6e1f31"); gradient.addColorStop(.33, "#b9323b"); gradient.addColorStop(.7, "#ed6945"); gradient.addColorStop(1, "#ffd36a"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    drawLantern(ctx, width * .12, 57, 17, "#ffb45f"); drawLantern(ctx, width * .88, 67, 12, "#f8d36b"); drawConfetti(ctx, width, 130, 7);
    drawText(ctx, "화개장터", width / 2, 79, 44, "#fff6e4", "400 44px 'Gugi'");
    drawText(ctx, "HUAGAE MARKET × PIERROT", width / 2, 111, 14, "#ffe5bd", "600 14px 'IBM Plex Mono'");
  }

  function drawFrameFooter(ctx, width, y, height, frame, poong) {
    if (frame === "pierrot") { ctx.fillStyle = "#faefd9"; ctx.fillRect(0, y, width, height); ctx.fillStyle = "#e9574b"; for (let x = -height; x < width + height; x += 70) { ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + 42, y + height); ctx.lineTo(x - height + 42, y + height - 48); ctx.lineTo(x - height, y + height - 48); ctx.closePath(); ctx.fill(); } }
    else if (frame === "noir") { ctx.fillStyle = "#111328"; ctx.fillRect(0, y, width, height); }
    else if (frame === "poong") { ctx.fillStyle = "#b8373e"; ctx.fillRect(0, y, width, height); }
    else { ctx.fillStyle = "rgba(113,27,40,.88)"; ctx.fillRect(0, y, width, height); }
    if (poong && (frame === "market" || frame === "poong")) drawPoong(ctx, poong, width / 2, y + 9, 62, 84);
    drawText(ctx, frame === "poong" ? "푸앙이와 함께한 가을밤" : "HWAGAE MARKET × PIERROT", width / 2, y + 107, 17, frame === "pierrot" ? "#34203f" : "#fff6e4", "700 17px 'Noto Sans KR'");
    const date = new Date();
    drawText(ctx, `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}  /  중앙대학교`, width / 2, y + 133, 12, frame === "pierrot" ? "#8c5b55" : "#ffe0bd", "500 12px 'IBM Plex Mono'");
  }

  async function composeStrip() {
    const poong = new Image();
    poong.src = "poong.png";
    await new Promise((resolve) => { poong.onload = resolve; poong.onerror = resolve; });
    const photoWidth = 500; const photoHeight = 667; const padding = 26; const gap = 15; const header = 145; const footer = 155;
    const width = photoWidth + padding * 2; const height = header + photoHeight * 4 + gap * 3 + footer;
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    paintFrame(ctx, width, height, selectedFrame);
    let y = header;
    shots.forEach((shot, index) => { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 13; ctx.drawImage(shot, padding, y, photoWidth, photoHeight); ctx.restore(); ctx.strokeStyle = selectedFrame === "noir" ? "#86d7d0" : "rgba(255,255,255,.86)"; ctx.lineWidth = 5; ctx.strokeRect(padding, y, photoWidth, photoHeight); if (index === 1 && selectedFrame !== "noir") { ctx.fillStyle = "#ff6a3d"; ctx.beginPath(); ctx.arc(width - padding - 17, y - 9, 28, 0, Math.PI * 2); ctx.fill(); drawText(ctx, "CAU", width - padding - 17, y - 5, 10, "#fff", "600 10px 'IBM Plex Mono'"); } y += photoHeight + gap; });
    drawFrameFooter(ctx, width, height - footer, footer, selectedFrame, poong);
    resultDataUrl = canvas.toDataURL("image/png");
    resultImage.src = resultDataUrl;
    resultFrameLabel.textContent = frameLabels[selectedFrame];
    setMode("result");
    stopStream();
  }

  async function captureSession() {
    if (busy) return;
    busy = true; startButton.disabled = true; shots = []; resetDots();
    cameraStatus.textContent = "촬영 중 · 포즈 카드만 믿고 따라와요";
    for (let index = 0; index < 4; index += 1) {
      shotDots[index].classList.add("active");
      await countdownAndCapture(index);
      await sleep(300);
    }
    cameraStatus.textContent = "네컷 완성 중...";
    startButton.disabled = false; busy = false;
    await composeStrip();
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
    stopStream(); shots = []; resultDataUrl = ""; busy = false; startButton.disabled = false; startLabel.textContent = "START BOOTH"; $$(".action-number").forEach((el) => { el.textContent = "01"; }); resetDots(); setMode("home"); actionNote.textContent = "카메라 권한을 허용하면 바로 촬영할 수 있어요. 권한이 없어도 데모 촬영은 가능합니다."; fallback.classList.remove("hidden");
  }

  $$(".frame-option").forEach((button) => button.addEventListener("click", () => { selectedFrame = button.dataset.frame; updateFrameSelection(); }));
  $$(".filter-option").forEach((button) => button.addEventListener("click", () => { selectedFilter = button.dataset.filter; updateFilterSelection(); }));
  $("#btnPose").addEventListener("click", () => { currentPose = (currentPose + 1) % poses.length; updatePose(); });
  $("#btnStart").addEventListener("click", () => stage.dataset.mode === "home" ? beginBooth() : captureSession());
  $("#btnReset").addEventListener("click", resetAll);
  $("#btnTopReset").addEventListener("click", resetAll);
  $("#btnRetake").addEventListener("click", resetAll);
  $("#btnSave").addEventListener("click", saveResult);

  updateFrameSelection(); updateFilterSelection(); updatePose(); setMode("home");
})();
