// Spencer Library barcode reader — the same "second scanner" as the food storage app (SF-FS):
// ZXing compiled to WebAssembly with our own camera loop, and html5-qrcode kept as a backup.
// Opens on the 0.5× ultra-wide lens (it focuses up close); your choice is remembered per device.
(() => {
  'use strict';
  const ZX_VER = '2.2.4';
  const FORMATS = ['EAN-13', 'UPC-A', 'EAN-8', 'Code128'];
  const ZX_OPTS = { tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1, formats: FORMATS.slice() };
  let zxState = null;      // null untested, true ready, false unavailable
  let camList = null, current = null, run = 0;

  const pickCam = (cams, mode) => {
    const back = cams.filter(c => /back|rear|environment/i.test(c.label));
    if (mode === 'close') return back.find(c => /ultra\s*wide/i.test(c.label)) || null;
    return back.find(c => /^back camera$/i.test(c.label)) || back.find(c => /triple|dual/i.test(c.label)) || back[0] || null;
  };

  // Camera names only appear after permission, so ask once, then list the cameras.
  async function listCameras() {
    let devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    if (!devs.some(d => d.label)) {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      tmp.getTracks().forEach(t => t.stop());
      devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    }
    return devs.map(d => ({ id: d.deviceId, label: d.label }));
  }

  async function zxReady() {
    if (zxState !== null) return zxState;
    const Z = window.ZXingWASM;
    if (!Z?.readBarcodes) return (zxState = false);
    try {
      Z.prepareZXingModule?.({ overrides: { locateFile: (path, prefix) => path.endsWith('.wasm')
        ? `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZX_VER}/dist/reader/${path}` : prefix + path } });
      const probe = new ImageData(8, 8);
      const read = o => Promise.race([Z.readBarcodes(probe, o), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 9000))]);
      try { await read(ZX_OPTS); }
      catch (e) { if (/format/i.test(String(e))) { delete ZX_OPTS.formats; await read(ZX_OPTS); } else throw e; }
      return (zxState = true);
    } catch (e) { console.warn('ZXing WASM unavailable, using the backup reader', e); return (zxState = false); }
  }

  // Full-HD picture; read a band across the middle most of the time, the whole picture every 4th try.
  function startZX(el, cam, onText) {
    let stream = null, stopped = false, busy = false, n = 0, timer = 0;
    const video = document.createElement('video');
    video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
    el.innerHTML = ''; el.append(video);
    const frame = document.createElement('div'); frame.className = 'scanframe'; el.append(frame);
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const tick = async () => {
      if (stopped) return;
      if (!busy && video.readyState >= 2 && video.videoWidth) {
        busy = true;
        try {
          const vw = video.videoWidth, vh = video.videoHeight, full = (++n % 4) === 0;
          const sh = full ? vh : Math.round(vh * .5), sy = full ? 0 : Math.round((vh - sh) / 2);
          const k = Math.min(1, 1600 / vw);
          cv.width = Math.round(vw * k); cv.height = Math.round(sh * k);
          ctx.drawImage(video, 0, sy, vw, sh, 0, 0, cv.width, cv.height);
          const res = await window.ZXingWASM.readBarcodes(ctx.getImageData(0, 0, cv.width, cv.height), ZX_OPTS);
          const hit = res.find(r => r.text && r.isValid !== false);
          if (hit && !stopped) { frame.classList.add('hit'); setTimeout(() => frame.classList.remove('hit'), 500); onText(hit.text); }
        } catch (e) { console.warn(e); }
        busy = false;
      }
      timer = setTimeout(tick, 90);
    };
    const ready = navigator.mediaDevices.getUserMedia({ audio: false, video: {
        ...(cam ? { deviceId: { exact: cam.id } } : { facingMode: 'environment' }),
        width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then(s => { stream = s; if (stopped) return s.getTracks().forEach(t => t.stop()); video.srcObject = s; return video.play(); })
      .then(() => tick());
    return { ready, async stop() { stopped = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); }, clear() { el.innerHTML = ''; } };
  }

  function startHtml5(el, cam, onText) {   // the old reader, kept as a backup
    const F = window.Html5QrcodeSupportedFormats;
    el.innerHTML = '<div id="h5reader"></div>';
    const s = new Html5Qrcode('h5reader', { formatsToSupport: [F.EAN_13, F.UPC_A, F.EAN_8, F.CODE_128], verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
    s.ready = s.start(cam ? cam.id : { facingMode: 'environment' },
      { fps: 12, qrbox: (w, h) => ({ width: Math.floor(w * .86), height: Math.floor(Math.min(h, w) * .45) }), aspectRatio: 1.333,
        videoConstraints: { ...(cam ? { deviceId: { exact: cam.id } } : { facingMode: 'environment' }), width: { ideal: 1920 }, height: { ideal: 1080 } } },
      onText, () => {});
    return { ready: s.ready, stop: () => s.stop().catch(() => {}), clear: () => { try { s.clear(); } catch {} el.innerHTML = ''; } };
  }

  async function stop() { if (current) { const s = current; current = null; try { await s.stop(); s.clear(); } catch {} } }

  // start(el, onText, { onLens(modes, mode), onFail() }) — call stop() when the sheet closes.
  async function start(el, onText, hooks = {}) {
    const me = ++run;
    await stop();
    let mode = localStorage.getItem('sb-lens'), cam = null;
    try {
      if (!camList) camList = await listCameras();
      if (me !== run || !el.isConnected) return;
      const hasClose = !!pickCam(camList, 'close');
      // Start on the 0.5× lens whenever this device has one (like the food storage app)
      if (!mode || (mode === 'close' && !hasClose)) mode = hasClose ? 'close' : 'normal';
      cam = pickCam(camList, mode);
      hooks.onLens?.(hasClose, mode);
    } catch (e) { console.warn(e); }
    const useZX = await zxReady();
    if (me !== run || !el.isConnected) return;
    if (useZX) current = startZX(el, cam, onText);
    else if (window.Html5Qrcode) current = startHtml5(el, cam, onText);
    else { hooks.onFail?.(); return; }
    current.ready.catch(async e => { console.warn(e); if (me === run) { await stop(); hooks.onFail?.(); } });
  }
  function setLens(mode) { localStorage.setItem('sb-lens', mode); }

  window.Scanner = { start, stop, setLens };
})();
