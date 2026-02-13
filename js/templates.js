/**
 * Template Registry - Defines all section template render functions
 * Each template is a function that takes (sectionId, data, material) and returns HTML string
 */

window.TemplateRegistry = (function() {
  'use strict';

  // Helper to get image URL
  function getImageUrl(imagePath, material) {
    if (!imagePath || imagePath === '') return '';
    const base = material?.imagesBasePath || 'assets/images/';
    if (
      imagePath.startsWith('http') ||
      imagePath.startsWith('/') ||
      imagePath.startsWith('data:') ||
      imagePath.startsWith('blob:') ||
      imagePath.startsWith('uploads/') ||
      imagePath.startsWith('./uploads/')
    ) {
      return imagePath;
    }
    return base + imagePath;
  }

  function isVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:video/')) return true;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl);
  }

  function renderVideoLayer(url) {
    if (!isVideoUrl(url)) return '';
    return `
      <video
        src="${url}"
        class="absolute inset-0 w-full h-full object-cover z-0"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        data-material-video="true"
      ></video>
    `;
  }

  function normalizeFlipDirection(direction) {
    return direction === 'x' ? 'x' : 'y';
  }

  function renderFlipWrapper(options) {
    const {
      flipKey,
      flipPath,
      flipEnabled,
      flipDirection,
      frontHtml,
      title,
      titlePath,
      detail,
      detailPath,
      wrapperClass = '',
      frontShellClass = 'h-full',
      backShellClass = 'h-full',
      backPanelClass = 'w-full h-full p-[60px] flex flex-col justify-center gap-6 overflow-y-auto'
    } = options;

    const dir = normalizeFlipDirection(flipDirection);
    const enabled = Boolean(flipEnabled);

    return `
      <div
        class="flip-card w-full h-full ${wrapperClass} ${enabled ? '' : 'flip-disabled'}"
        data-flip-card="${flipKey}"
        data-flip-dir="${dir}"
        data-flip-enabled="${enabled ? 'true' : 'false'}"
        data-flip-configurable="true"
        data-flip-path="${flipPath}"
        data-flip-enabled-path="${flipPath}.flipEnabled"
        data-flip-direction-path="${flipPath}.flipDirection"
      >
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <div class="flip-card-face-shell ${frontShellClass}">
              ${frontHtml}
            </div>
          </div>
          <div class="flip-card-back">
            <div class="flip-card-face-shell ${backShellClass}">
              <div class="${backPanelClass}">
                <div class="flex items-center justify-between gap-4">
                  <h4 class="text-[36px] font-semibold text-white leading-tight" data-material="${titlePath}">${title || ''}</h4>
                  <button class="flip-back-trigger flex-shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center" data-flip-target="${flipKey}">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <div class="w-16 h-[2px] bg-accent-blue"></div>
                <div class="text-lg text-text-muted/90 font-normal leading-relaxed latex-content flex-1 overflow-y-auto pr-2" style="max-height:100%;" data-material="${detailPath}">
                  ${detail || 'Detail content goes here. Click to edit in edit mode.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function slugifyTabKey(value, fallbackIndex) {
    const raw = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return raw || `tab-${fallbackIndex + 1}`;
  }

  function buildHighlightsItemsCompat(data) {
    if (Array.isArray(data?.items) && data.items.length) {
      return data.items.map((item, idx) => ({
        tab: item?.tab || `Tab ${idx + 1}`,
        title: item?.title || '',
        description: item?.description || '',
        cta: item?.cta || 'Learn more',
        detail: item?.detail || '',
        flipEnabled: item?.flipEnabled !== false,
        flipDirection: item?.flipDirection || 'y',
        images: item?.images || {}
      }));
    }

    const legacyKeys = ['efficiency', 'zeroCarbon', 'safety', 'reliability'];
    const tabs = Array.isArray(data?.tabs) ? data.tabs : [];
    const legacyItems = legacyKeys
      .map((legacyKey, idx) => {
        const legacy = data?.[legacyKey];
        if (!legacy) return null;
        return {
          tab: tabs[idx] || legacy.title || `Tab ${idx + 1}`,
          title: legacy.title || '',
          description: legacy.description || '',
          cta: legacy.cta || 'Learn more',
          detail: legacy.detail || '',
          flipEnabled: legacy.flipEnabled !== false,
          flipDirection: legacy.flipDirection || 'y',
          images: legacy.images || {}
        };
      })
      .filter(Boolean);

    if (legacyItems.length) return legacyItems;
    return [];
  }

  // Hero Template
  function heroTemplate(sectionId, data, material) {
    const videoCover = getImageUrl(data.images?.videoCover, material);
    const hasHeroMedia = Boolean(videoCover);
    const imgPos = data.images?.position || {};
    const bgPosX = imgPos.x ?? 50;
    const bgPosY = imgPos.y ?? 50;
    const bgScale = imgPos.scale ?? 100;
    const bgStyle = videoCover && !isVideoUrl(videoCover) ? `background-image: url(${videoCover}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
    const videoLayer = renderVideoLayer(videoCover);
    
    return `
      <section id="overview" class="relative w-full h-screen min-h-[800px] flex items-end justify-center bg-hero-gradient overflow-hidden">
        <div class="absolute inset-0 w-full h-full z-0">
          <div class="w-full h-full bg-primary-darkBlue flex items-center justify-center relative bg-cover bg-center" style="${bgStyle}" data-material-img="hero.images.videoCover">
            ${videoLayer}
            <div class="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-transparent to-transparent z-10"></div>
            <div class="text-center z-0 opacity-30 ${hasHeroMedia ? 'hidden' : ''}" data-hero-media-placeholder="true">
              <div class="w-20 h-20 rounded-full border border-white/40 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <i data-lucide="play" class="w-8 h-8 text-white fill-current"></i>
              </div>
              <p class="text-white/80 font-medium" data-material="hero.videoLabel">${data.videoLabel || 'Video Background Placeholder'}</p>
            </div>
          </div>
        </div>

        <div class="relative z-10 w-full max-w-[1440px] px-[120px] pb-[160px] flex flex-col items-end text-right">
          <div class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md mb-6 border border-white/10">
            <span class="text-sm font-medium text-white" data-material="hero.badge">${data.badge || ''}</span>
          </div>
          
          <h1 class="text-[80px] font-bold leading-tight tracking-tight text-white mb-6 fade-in-up" data-material="hero.title">
            ${(data.title || '').replace(/\\n/g, '<br>')}
          </h1>
          
          <p class="text-2xl text-text-primaryDark/80 max-w-[600px] mb-8 font-normal leading-snug fade-in-up" style="transition-delay: 0.1s;" data-material="hero.subtitle">
            ${data.subtitle || ''}
          </p>
          
          <div class="flex items-center gap-4 fade-in-up" style="transition-delay: 0.2s;">
            <button class="px-6 py-3 rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors flex items-center gap-2" data-material="hero.ctaPrimary">
              ${data.ctaPrimary || 'Explore'}
            </button>
            <button class="px-6 py-3 rounded-full border border-accent-blue text-accent-blue font-medium hover:bg-accent-blue/10 transition-colors flex items-center gap-2">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
              <span data-material="hero.ctaSecondary">${data.ctaSecondary || 'Watch'}</span>
            </button>
          </div>
        </div>

        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-80 animate-bounce">
          <span class="text-sm font-medium text-white/80" data-material="hero.scrollHint">${data.scrollHint || 'Scroll to explore'}</span>
          <i data-lucide="arrow-down" class="w-6 h-6 text-white/80"></i>
        </div>
      </section>
    `;
  }

  // Tabbed Content Template (like Highlights)
  function tabbedContentTemplate(sectionId, data, material) {
    const items = buildHighlightsItemsCompat(data);
    const tabButtons = items.map((item, i) => {
      const key = `${slugifyTabKey(item.tab, i)}-${i}`;
      const isActive = i === 0;
      return `
        <div class="relative group" data-collection-item="true" data-collection-type="tabbed-content" data-collection-path="highlights.items" data-item-index="${i}">
          <button class="tab-btn ${isActive ? 'active' : ''} px-6 py-3 rounded-full ${isActive ? 'bg-white text-black' : 'bg-surface-dark text-white'} font-medium hover:bg-surface-darker transition-all" data-tab="${key}" data-material="highlights.items.${i}.tab">${item.tab || ''}</button>
        </div>
      `;
    }).join('\n');

    const tabContents = items.map((item, i) => {
      const key = `${slugifyTabKey(item.tab, i)}-${i}`;
      const imgUrl = getImageUrl(item.images?.main, material);
      const imgPos = item.images?.position || {};
      const bgPosX = imgPos.x ?? 50;
      const bgPosY = imgPos.y ?? 50;
      const bgScale = imgPos.scale ?? 100;
      const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
      const videoLayer = renderVideoLayer(imgUrl);
      const isActive = i === 0;
      const flipPath = `highlights.items.${i}`;
      const flipKey = `highlights-item-${i}`;
      const flipEnabled = item.flipEnabled !== false;
      const frontHtml = `
        <div class="flex w-full h-full">
          <div class="w-1/2 h-full bg-surface-darker relative flex items-center justify-center bg-cover bg-center" style="${bgStyle}" data-material-img="highlights.items.${i}.images.main">
            ${videoLayer}
            <div class="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
          </div>
          <div class="w-1/2 h-full p-[60px] flex flex-col justify-center gap-6">
            <h4 class="text-[40px] font-semibold text-white leading-tight" data-material="highlights.items.${i}.title">${item.title || ''}</h4>
            <p class="text-xl text-text-muted font-normal leading-relaxed" data-material="highlights.items.${i}.description">
              ${item.description || ''}
            </p>
            ${flipEnabled ? `
              <button class="flip-trigger w-fit px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition-colors mt-4 flex items-center gap-2" data-flip-target="${flipKey}" data-material="highlights.items.${i}.cta">
                ${item.cta || 'Learn more'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      return `
        <div class="tab-content absolute inset-0 w-full h-full transition-opacity duration-500 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}" id="content-${key}" data-tab-panel="true">
          ${renderFlipWrapper({
            flipKey,
            flipPath,
            flipEnabled,
            flipDirection: item.flipDirection,
            frontHtml,
            title: item.title || '',
            titlePath: `highlights.items.${i}.title`,
            detail: item.detail || '',
            detailPath: `highlights.items.${i}.detail`,
            frontShellClass: 'h-full rounded-[32px] overflow-hidden bg-surface-dark',
            backShellClass: 'h-full rounded-[32px] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800'
          })}
        </div>
      `;
    }).join('\n');

    return `
      <section id="highlights" class="w-full bg-black py-[100px] flex flex-col gap-[60px] items-center">
        <div class="w-full max-w-[1440px] px-[120px] text-center flex flex-col gap-4 fade-in-up">
          <h2 class="text-[21px] font-semibold text-text-muted" data-material="highlights.label">${data.label || 'Highlights'}</h2>
          <h3 class="text-[56px] font-semibold text-white leading-tight" data-material="highlights.headline">${data.headline || ''}</h3>
        </div>

        <div class="w-full max-w-[1440px] px-[120px] overflow-x-auto no-scrollbar">
          <div class="flex items-center gap-4 min-w-max pb-4" id="highlight-tabs-${sectionId}" data-tab-container="true" data-collection-container="true" data-collection-type="tabbed-content" data-collection-path="highlights.items">
            ${tabButtons}
          </div>
        </div>

        <div class="w-full max-w-[1440px] px-[120px] h-[600px] fade-in-up">
          <div class="w-full h-full flex relative group" style="perspective: 1200px;">
            ${tabContents}
          </div>
        </div>
      </section>
    `;
  }

  // Card Grid Template (like Features)
  function cardGridTemplate(sectionId, data, material) {
    const cards = data.cards || [];
    
    const cardHtml = cards.map((card, i) => {
      const imgUrl = getImageUrl(card.image, material);
      const imgPos = card.imagePosition || {};
      const bgPosX = imgPos.x ?? 50;
      const bgPosY = imgPos.y ?? 50;
      const bgScale = imgPos.scale ?? 100;
      const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
      const videoLayer = renderVideoLayer(imgUrl);
      const delay = (i + 1) * 0.1;
      
      const flipPath = `features.cards.${i}`;
      const flipKey = `features-card-${i}`;
      const flipEnabled = card.flipEnabled === true;
      const frontHtml = `
        <div class="h-full flex flex-col group hover:bg-surface-darker transition-colors duration-300">
          <div class="h-[320px] bg-surface-darker w-full relative bg-cover bg-center" style="${bgStyle}" data-material-img="features.cards.${i}.image">
            ${videoLayer}
          </div>
          <div class="p-8 flex flex-col gap-3 flex-1">
            <h3 class="text-2xl font-semibold text-white" data-material="features.cards.${i}.title">${card.title || ''}</h3>
            <p class="text-base text-text-muted leading-relaxed" data-material="features.cards.${i}.description">
              ${card.description || ''}
            </p>
            ${flipEnabled ? `
              <button class="flip-trigger mt-auto w-fit px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2" data-flip-target="${flipKey}" data-material="features.cards.${i}.cta">
                ${card.cta || 'Learn more'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      return `
        <div class="fade-in-up h-[560px]" style="transition-delay: ${delay}s;" data-collection-item="true" data-collection-type="card-grid" data-collection-path="features.cards" data-item-index="${i}">
          ${renderFlipWrapper({
            flipKey,
            flipPath,
            flipEnabled,
            flipDirection: card.flipDirection,
            wrapperClass: 'h-full rounded-[24px]',
            frontHtml,
            title: card.title || '',
            titlePath: `features.cards.${i}.title`,
            detail: card.detail || '',
            detailPath: `features.cards.${i}.detail`,
            frontShellClass: 'h-full rounded-[24px] overflow-hidden bg-surface-dark',
            backShellClass: 'h-full rounded-[24px] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800',
            backPanelClass: 'w-full h-full p-8 flex flex-col justify-center gap-5 overflow-y-auto'
          })}
        </div>
      `;
    }).join('\n');

    return `
      <section id="benefits" class="w-full bg-black py-[120px] flex flex-col items-center gap-[80px]">
        <div class="w-full max-w-[1440px] px-[120px] text-center flex flex-col gap-4 fade-in-up">
          <h2 class="text-[64px] font-semibold text-white leading-tight" data-material="features.headline">${data.headline || ''}</h2>
          <p class="text-[28px] font-normal text-text-muted max-w-[800px] mx-auto leading-normal" data-material="features.subheadline">
            ${data.subheadline || ''}
          </p>
        </div>

        <div class="w-full max-w-[1440px] px-[120px] grid grid-cols-1 md:grid-cols-3 gap-8" data-collection-container="true" data-collection-type="card-grid" data-collection-path="features.cards">
          ${cardHtml}
        </div>
      </section>
    `;
  }

  // Text + Image Left Template
  function textImageLeftTemplate(sectionId, data, material) {
    const imgUrl = getImageUrl(data.images?.main, material);
    const imgPos = data.images?.position || {};
    const bgPosX = imgPos.x ?? 50;
    const bgPosY = imgPos.y ?? 50;
    const bgScale = imgPos.scale ?? 100;
    const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
    const videoLayer = renderVideoLayer(imgUrl);
    const theme = sectionId === 'safety' || sectionId === 'innovation' ? 'dark' : 'light';
    
    const flipPath = `${sectionId}`;
    const flipKey = `${sectionId}-section-card`;
    const flipEnabled = data.flipEnabled === true;
    const frontHtml = `
      <div class="w-full h-full flex items-center gap-[80px]">
        <div class="w-[500px] flex flex-col gap-6 fade-in-up">
          <h2 class="text-[64px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-[1.05]" data-material="${sectionId}.title">${data.title || ''}</h2>
          <p class="text-[24px] font-normal text-text-muted leading-[1.4]" data-material="${sectionId}.description">
            ${data.description || ''}
          </p>
          ${flipEnabled ? `
            <button class="flip-trigger w-fit px-6 py-3 rounded-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-black/80'} font-medium transition-colors mt-2 flex items-center gap-2" data-flip-target="${flipKey}" data-material="${sectionId}.cta">
              ${data.cta || 'Learn more'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          ` : ''}
        </div>
        <div class="flex-1 h-[600px] ${theme === 'dark' ? 'bg-surface-dark' : 'bg-white shadow-xl shadow-black/5'} rounded-[32px] relative overflow-hidden fade-in-up bg-cover bg-center" style="transition-delay: 0.2s; ${bgStyle}" data-material-img="${sectionId}.images.main">
          ${videoLayer}
          <div class="absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'text-white/20' : 'text-black/20'} text-3xl font-semibold" data-material="${sectionId}.imageLabel">${data.imageLabel || ''}</div>
        </div>
      </div>
    `;

    return `
      <section id="${sectionId}" class="w-full ${theme === 'dark' ? 'bg-black' : 'bg-surface-light text-text-primaryLight'} py-[120px]">
        <div class="max-w-[1440px] mx-auto px-[120px] h-[600px]">
          ${renderFlipWrapper({
            flipKey,
            flipPath,
            flipEnabled,
            flipDirection: data.flipDirection,
            wrapperClass: 'h-full rounded-[32px]',
            frontHtml,
            title: data.title || '',
            titlePath: `${sectionId}.title`,
            detail: data.detail || '',
            detailPath: `${sectionId}.detail`,
            frontShellClass: 'h-full rounded-[32px] overflow-hidden',
            backShellClass: `h-full rounded-[32px] overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-white'}`,
            backPanelClass: 'w-full h-full p-[60px] flex flex-col justify-center gap-6 overflow-y-auto'
          })}
        </div>
      </section>
    `;
  }

  // Text + Image Right Template
  function textImageRightTemplate(sectionId, data, material) {
    const imgUrl = getImageUrl(data.images?.main, material);
    const imgPos = data.images?.position || {};
    const bgPosX = imgPos.x ?? 50;
    const bgPosY = imgPos.y ?? 50;
    const bgScale = imgPos.scale ?? 100;
    const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
    const videoLayer = renderVideoLayer(imgUrl);
    
    const flipPath = `${sectionId}`;
    const flipKey = `${sectionId}-section-card`;
    const flipEnabled = data.flipEnabled === true;
    const frontHtml = `
      <div class="w-full h-full flex items-center gap-[80px]">
        <div class="flex-1 h-[600px] bg-white rounded-[32px] shadow-xl shadow-black/5 relative overflow-hidden fade-in-up bg-cover bg-center" style="${bgStyle}" data-material-img="${sectionId}.images.main">
          ${videoLayer}
          <div class="absolute inset-0 flex items-center justify-center text-black/20 text-3xl font-semibold" data-material="${sectionId}.imageLabel">${data.imageLabel || ''}</div>
        </div>
        <div class="w-[500px] flex flex-col gap-6 fade-in-up" style="transition-delay: 0.2s;">
          <h2 class="text-[64px] font-semibold text-text-primaryLight leading-[1.05]" data-material="${sectionId}.title">${data.title || ''}</h2>
          <p class="text-[24px] font-normal text-text-muted leading-[1.4]" data-material="${sectionId}.description">
            ${data.description || ''}
          </p>
          ${flipEnabled ? `
            <button class="flip-trigger w-fit px-6 py-3 rounded-full bg-black text-white font-medium hover:bg-black/80 transition-colors mt-2 flex items-center gap-2" data-flip-target="${flipKey}" data-material="${sectionId}.cta">
              ${data.cta || 'Learn more'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    return `
      <section id="${sectionId}" class="w-full bg-surface-light py-[120px] text-text-primaryLight">
        <div class="max-w-[1440px] mx-auto px-[120px] h-[600px]">
          ${renderFlipWrapper({
            flipKey,
            flipPath,
            flipEnabled,
            flipDirection: data.flipDirection,
            wrapperClass: 'h-full rounded-[32px]',
            frontHtml,
            title: data.title || '',
            titlePath: `${sectionId}.title`,
            detail: data.detail || '',
            detailPath: `${sectionId}.detail`,
            frontShellClass: 'h-full rounded-[32px] overflow-hidden',
            backShellClass: 'h-full rounded-[32px] overflow-hidden bg-white',
            backPanelClass: 'w-full h-full p-[60px] flex flex-col justify-center gap-6 overflow-y-auto'
          })}
        </div>
      </section>
    `;
  }

  // Accordion Template (like Closer Look)
  function accordionTemplate(sectionId, data, material) {
    const features = data.features || [];
    const imgUrl = getImageUrl(data.images?.reactor, material);
    const imgPos = data.images?.position || {};
    const bgPosX = imgPos.x ?? 50;
    const bgPosY = imgPos.y ?? 50;
    const bgScale = imgPos.scale ?? 100;
    const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
    const videoLayer = renderVideoLayer(imgUrl);
    
    const featuresHtml = features.map((feature, i) => {
      const isFirst = i === 0;
      const flipEnabled = feature.flipEnabled === true;
      const flipPath = `closerLook.features.${i}`;
      const flipKey = `closer-feature-${i}`;

      if (flipEnabled) {
        const frontHtml = `
          <div class="w-full h-full px-2 py-3 flex flex-col justify-center gap-3">
            <h3 class="text-2xl font-semibold text-text-primaryLight" data-material="closerLook.features.${i}.title">${feature.title || ''}</h3>
            <p class="text-base text-text-muted leading-relaxed" data-material="closerLook.features.${i}.description">
              ${feature.description || ''}
            </p>
            <button class="flip-trigger w-fit px-4 py-2 rounded-full bg-text-primaryLight text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2" data-flip-target="${flipKey}" data-material="closerLook.features.${i}.cta">
              ${feature.cta || 'Learn more'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        `;

        return `
          <div class="py-4 border-b border-black/10" data-collection-item="true" data-collection-type="accordion" data-collection-path="closerLook.features" data-item-index="${i}">
            ${renderFlipWrapper({
              flipKey,
              flipPath,
              flipEnabled,
              flipDirection: feature.flipDirection,
              wrapperClass: 'h-[220px] rounded-2xl',
              frontHtml,
              title: feature.title || '',
              titlePath: `closerLook.features.${i}.title`,
              detail: feature.detail || '',
              detailPath: `closerLook.features.${i}.detail`,
              frontShellClass: 'h-full rounded-2xl overflow-hidden bg-white',
              backShellClass: 'h-full rounded-2xl overflow-hidden bg-white',
              backPanelClass: 'w-full h-full p-6 flex flex-col justify-center gap-4 overflow-y-auto'
            })}
          </div>
        `;
      }

      return `
        <div class="feature-item group cursor-pointer border-b border-black/10 py-6 ${isFirst ? 'active' : ''}" data-feature="feature-${i}" data-collection-item="true" data-collection-type="accordion" data-collection-path="closerLook.features" data-item-index="${i}">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-2xl font-semibold ${isFirst ? 'text-text-primaryLight' : 'text-text-muted'} group-hover:text-text-primaryLight transition-colors" data-material="closerLook.features.${i}.title">${feature.title || ''}</h3>
            <i data-lucide="${isFirst ? 'chevron-down' : 'plus'}" class="w-6 h-6 ${isFirst ? '' : 'text-text-muted'} transition-transform duration-300"></i>
          </div>
          <p class="text-base text-text-muted ${isFirst ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'} transition-all duration-300" data-material="closerLook.features.${i}.description">
            ${feature.description || ''}
          </p>
        </div>
      `;
    }).join('\n');

    return `
      <section class="w-full bg-surface-light py-[120px] text-text-primaryLight">
        <div class="max-w-[1440px] mx-auto px-[120px] flex flex-col gap-[80px]">
          <h2 class="text-[64px] font-semibold text-text-primaryLight leading-tight fade-in-up" data-material="closerLook.headline">${data.headline || ''}</h2>
          
          <div class="flex gap-[80px]">
            <div class="w-[400px] flex flex-col fade-in-up" id="closer-features-list" data-collection-container="true" data-collection-type="accordion" data-collection-path="closerLook.features">
              ${featuresHtml}
            </div>

            <div class="flex-1 h-[600px] bg-white rounded-[32px] shadow-xl shadow-black/5 relative flex items-center justify-center fade-in-up bg-cover bg-center" style="transition-delay: 0.2s; ${bgStyle}" data-material-img="closerLook.images.reactor">
              ${videoLayer}
              <div class="text-center">
                <h3 class="text-xl font-semibold text-text-primaryLight" data-material="closerLook.reactorLabel">${data.reactorLabel || ''}</h3>
                <p class="text-text-muted" data-material="closerLook.reactorHint">${data.reactorHint || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // AI Chat Template
  function aiChatTemplate(sectionId, data, material) {
    return `
      <section id="ai-chat" class="w-full bg-black py-[120px] flex justify-center">
        <div class="w-full max-w-[1000px] h-[700px] bg-surface-dark/80 backdrop-blur-md border border-white/10 rounded-[32px] shadow-2xl shadow-accent-cyan/20 overflow-hidden flex flex-col relative fade-in-up">
          <div class="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-white/5">
            <div class="flex items-center gap-3">
              <span class="text-xl font-semibold text-white" data-material="aiChat.title">${data.title || 'AI Assistant'}</span>
              <span class="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_#22D3EE]"></span>
            </div>
            <button class="text-white/60 hover:text-white transition-colors">
              <i data-lucide="minimize-2" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="flex-1 p-8 overflow-y-auto flex flex-col gap-6" id="chat-messages">
            <div class="flex gap-4 items-start">
              <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
                <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
              </div>
              <div class="bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5">
                <p class="text-white text-base leading-relaxed" data-material="aiChat.welcomeMessage">
                  ${data.welcomeMessage || 'Hello! How can I help you today?'}
                </p>
              </div>
            </div>
          </div>

          <div class="h-[100px] border-t border-white/10 bg-black/40 p-6 flex items-center gap-4">
            <div class="flex-1 h-[52px] bg-surface-dark rounded-full border border-white/10 flex items-center px-6 focus-within:border-accent-cyan/50 transition-colors">
              <input type="text" data-material="aiChat.placeholder" placeholder="${data.placeholder || 'Ask a question...'}" class="bg-transparent w-full text-white placeholder-white/40 outline-none text-base">
            </div>
            <button class="w-[52px] h-[52px] rounded-full bg-accent-cyan hover:bg-cyan-400 transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <i data-lucide="arrow-up" class="w-6 h-6 text-black"></i>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  // Quiz Template
  function quizTemplate(sectionId, data, material) {
    return `
      <section id="${sectionId}" class="w-full bg-black py-[120px]">
        <div class="max-w-[1000px] mx-auto px-[120px]">
          <div class="bg-surface-dark rounded-[32px] p-12 border border-white/10">
            <h2 class="text-[48px] font-semibold text-white mb-4" data-material="${sectionId}.title">${data.title || 'Quiz'}</h2>
            <p class="text-xl text-text-muted mb-12" data-material="${sectionId}.description">${data.description || ''}</p>
            
            <div id="quiz-container-${sectionId}" class="quiz-container" data-quiz-id="${sectionId}">
              <!-- Quiz questions will be rendered by quiz.js -->
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // Image Gallery Template
  function imageGalleryTemplate(sectionId, data, material) {
    const images = data.images || [];
    
    const galleryHtml = images.map((img, i) => {
      const imgUrl = getImageUrl(img.url, material);
      const isVideo = isVideoUrl(imgUrl);
      return `
        <div class="relative aspect-square rounded-[24px] overflow-hidden bg-surface-dark group cursor-pointer">
          ${isVideo
            ? `<video src="${imgUrl}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" autoplay muted loop playsinline preload="metadata" data-material-video="true"></video>`
            : `<img src="${imgUrl}" alt="${img.caption || ''}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">`
          }
          ${img.caption ? `<div class="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 text-white text-sm">${img.caption}</div>` : ''}
        </div>
      `;
    }).join('\n');

    return `
      <section id="${sectionId}" class="w-full bg-black py-[120px]">
        <div class="max-w-[1440px] mx-auto px-[120px]">
          <h2 class="text-[64px] font-semibold text-white mb-16 text-center" data-material="${sectionId}.title">${data.title || 'Gallery'}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${galleryHtml}
          </div>
        </div>
      </section>
    `;
  }

  // Footer Template
  function footerTemplate(sectionId, data, material) {
    // Migration + normalization: always render from a safe items array
    const reference = data.reference || {};
    let referenceItems = Array.isArray(reference.items) ? reference.items : [];
    if (!referenceItems.length && typeof reference.body === 'string' && reference.body.trim() !== '') {
      referenceItems = [{ id: 1, text: reference.body.replace(/^\[\d+\]\s*/, '') }];
    }
    if (!referenceItems.length && reference.items && typeof reference.items === 'object' && !Array.isArray(reference.items)) {
      referenceItems = [{
        id: Number(reference.items.id) || 1,
        text: typeof reference.items.text === 'string' ? reference.items.text : String(reference.items.text || '')
      }];
    }
    if (typeof reference.items === 'string') {
      referenceItems = [{ id: 1, text: reference.items }];
    }
    
    // Generate reference items HTML
    const referenceItemsHtml = referenceItems.map((item, index) => {
      const itemId = Number(item?.id) || (index + 1);
      const itemText = typeof item?.text === 'string' ? item.text : String(item?.text || '');
      return `
        <div id="ref-${itemId}" class="ref-item flex gap-3 items-start group" data-ref-id="${itemId}">
          <span class="text-sm text-text-muted flex-shrink-0">[${itemId}]</span>
          <p class="text-sm text-text-muted leading-relaxed flex-1" 
             data-material="footer.reference.items.${index}.text"
             data-ref-content="true">${itemText}</p>
          <button class="ref-delete-btn edit-mode-only opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-red-400 hover:text-red-300"
                  data-ref-delete="${itemId}"
                  title="Delete reference">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');
    
    return `
      <footer class="w-full bg-[#111111] py-[80px] border-t border-white/10">
        <div class="max-w-[1440px] mx-auto px-[120px] flex flex-col gap-[60px]">
          <div class="flex justify-between items-start">
            <div class="flex flex-col gap-6 max-w-[300px]">
              <h3 class="text-2xl font-semibold text-white" data-material="footer.brandName">${data.brandName || ''}</h3>
              <p class="text-sm text-text-muted leading-relaxed" data-material="footer.brandTagline">
                ${data.brandTagline || ''}
              </p>
            </div>

            <div class="flex-1 flex justify-center min-w-0">
              <div class="flex flex-col gap-4 max-w-[560px] w-full">
                <h4 class="text-sm font-semibold text-white" data-material="footer.reference.title">${data.reference?.title || 'Reference'}</h4>
                <div class="flex flex-col gap-3" id="reference-list">
                  ${referenceItemsHtml}
                  <button id="add-reference-btn" 
                          class="edit-mode-only flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-text-muted hover:text-white hover:border-white/40 transition-colors text-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Add Reference
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-10 border-t border-white/10 flex justify-between items-center">
            <a href="https://github.com/Changan-Su/Nuclear-Energy-PinS" target="_blank" rel="noopener noreferrer" class="text-xs text-text-muted hover:text-white transition-colors" data-material="footer.githubLinkText">${data.githubLinkText || 'View on GitHub'}</a>
            <p class="text-xs text-text-muted"><span data-material="footer.credits">${data.credits || 'Designed by '}</span><a href="https://github.com/Changan-Su" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-white transition-colors">Skyler</a></p>
          </div>
        </div>
      </footer>
    `;
  }

  // Template Registry Map
  const templates = {
    'hero': heroTemplate,
    'tabbed-content': tabbedContentTemplate,
    'card-grid': cardGridTemplate,
    'text-image-left': textImageLeftTemplate,
    'text-image-right': textImageRightTemplate,
    'accordion': accordionTemplate,
    'ai-chat': aiChatTemplate,
    'quiz': quizTemplate,
    'image-gallery': imageGalleryTemplate,
    'footer': footerTemplate
  };

  return {
    get: function(templateName) {
      return templates[templateName];
    },
    getAll: function() {
      return Object.keys(templates);
    },
    render: function(templateName, sectionId, data, material) {
      const template = templates[templateName];
      if (!template) {
        console.warn(`Template '${templateName}' not found`);
        return `<div class="error">Template '${templateName}' not found</div>`;
      }
      return template(sectionId, data, material);
    }
  };
})();
