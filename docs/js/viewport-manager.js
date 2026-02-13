// Keep a landscape-like composition in portrait mobile by adjusting viewport width.
(function() {
  'use strict';

  var LANDSCAPE_RATIO = 16 / 9;

  function isLikelyMobileDevice() {
    var ua = navigator.userAgent || '';
    var mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    var smallTouchScreen = navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) <= 1024;
    return mobileUa || smallTouchScreen;
  }

  function ensureViewportMeta() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) return meta;
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
    return meta;
  }

  function getPortraitLockedViewportContent() {
    var virtualWidth = Math.max(960, Math.round(window.innerHeight * LANDSCAPE_RATIO));
    return 'width=' + virtualWidth + ', initial-scale=1.0, viewport-fit=cover';
  }

  function applyViewportForOrientation() {
    var viewportMeta = ensureViewportMeta();
    if (!isLikelyMobileDevice()) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      return;
    }

    var isPortrait = window.matchMedia('(orientation: portrait)').matches;
    if (isPortrait) {
      viewportMeta.setAttribute('content', getPortraitLockedViewportContent());
      return;
    }

    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
  }

  applyViewportForOrientation();
  window.addEventListener('orientationchange', applyViewportForOrientation);
  window.addEventListener('resize', applyViewportForOrientation);
  window.addEventListener('pageshow', applyViewportForOrientation);
})();
