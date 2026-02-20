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

  function renderDetailMedia(url, materialPath, variant = 'banner', useNaturalSize = false, shrinkRatio = null, positionPath = '') {
    if (!url) return '';
    const targetClass = variant === 'banner' ? 'detail-banner-media' : 'detail-end-media';
    const materialAttr = materialPath ? `data-material-img="${materialPath}"` : '';
    const positionAttr = positionPath ? `data-image-position-path="${positionPath}"` : '';
    const detailMediaAttr = 'data-detail-media="true"';

    if (isVideoUrl(url)) {
      return `
        <div class="${targetClass}" ${materialAttr} ${positionAttr} ${detailMediaAttr}>
          <video
            src="${url}"
            class="w-full h-full object-cover"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            data-material-video="true"
          ></video>
        </div>
      `;
    }

    // Natural size mode: render <img> at original dimensions with max constraints
    if (useNaturalSize && shrinkRatio != null) {
      return `
        <div class="${targetClass} detail-banner-media--natural" ${materialAttr} ${positionAttr} ${detailMediaAttr}>
          <img src="${url}" class="detail-banner-img-natural" alt="" />
        </div>
      `;
    }

    return `<div class="${targetClass}" style="background-image: url('${url}');" ${materialAttr} ${positionAttr} ${detailMediaAttr}></div>`;
  }

  function splitTableCells(line) {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  }

  function isTableSeparatorLine(line) {
    if (!line) return false;
    const normalized = line.trim();
    return /^[:|\-\s]+$/.test(normalized) && normalized.includes('-');
  }

  function renderMarkdownTable(lines, startIndex) {
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];
    if (!headerLine || !separatorLine) return null;
    if (!headerLine.includes('|') || !isTableSeparatorLine(separatorLine)) return null;

    const headers = splitTableCells(headerLine);
    if (headers.length < 2) return null;

    const bodyRows = [];
    let cursor = startIndex + 2;
    while (cursor < lines.length) {
      const rowLine = lines[cursor];
      if (!rowLine || !rowLine.includes('|')) break;
      const cells = splitTableCells(rowLine);
      if (cells.length < 2) break;
      bodyRows.push(cells);
      cursor += 1;
    }

    if (!bodyRows.length) return null;

    const headerHtml = headers.map(cell => `<th>${cell}</th>`).join('');
    const bodyHtml = bodyRows
      .map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');

    return {
      endIndex: cursor - 1,
      html: `
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </div>
      `
    };
  }

  function renderCardReferences(references, referencesPath = '') {
    if (!Array.isArray(references) || !references.length) return '';

    const listHtml = references.map((entry, index) => {
      const ref = typeof entry === 'string' ? { text: entry } : (entry || {});
      const text = String(ref.text || '').trim();
      const url = String(ref.url || '').trim();
      const hasUrl = /^https?:\/\//.test(url);
      const textPath = referencesPath ? `${referencesPath}.${index}.text` : '';
      const urlHtml = hasUrl
        ? ` <a href="${url}" target="_blank" rel="noopener noreferrer" class="detail-reference-link">${url}</a>`
        : '';

      return `
        <li class="detail-reference-item">
          <span ${textPath ? `data-material="${textPath}"` : ''}>${text}</span>${urlHtml}
        </li>
      `;
    }).join('');

    return `
      <div class="detail-reference-block">
        <h5 class="detail-subtitle">References</h5>
        <ol class="detail-reference-list">${listHtml}</ol>
      </div>
    `;
  }

  function renderDetailBlocks(blocks, detailBlocksPath = '') {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return 'Detail content goes here. Click to edit in edit mode.';
    }
    
    return blocks.map((block, index) => {
      if (block.type === 'text') {
        const blockPath = detailBlocksPath ? `${detailBlocksPath}.${index}.content` : '';
        return `<div class="detail-text-block" data-block-index="${index}" ${blockPath ? `data-material="${blockPath}"` : ''}>${block.content || ''}</div>`;
      } else if (block.type === 'image') {
        const width = block.width || 600;
        return `
          <div class="detail-media-block" data-block-index="${index}" data-media-type="image">
            <div class="detail-media-wrapper" style="width: ${width}px;">
              <img src="${block.url}" alt="" class="detail-media-content" />
              <div class="detail-media-resize-handle edit-mode-only"></div>
              <button class="detail-media-delete edit-mode-only" data-block-index="${index}">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      } else if (block.type === 'video') {
        const width = block.width || 800;
        return `
          <div class="detail-media-block" data-block-index="${index}" data-media-type="video">
            <div class="detail-media-wrapper" style="width: ${width}px;">
              <video src="${block.url}" class="detail-media-content" controls></video>
              <div class="detail-media-resize-handle edit-mode-only"></div>
              <button class="detail-media-delete edit-mode-only" data-block-index="${index}">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
  }

  function normalizeLegacyComparisonTable(raw) {
    if (!raw) return raw;
    const normalized = String(raw).replace(/\r\n/g, '\n');
    if (!/Feature\s*\n\s*Nuclear\s*\n\s*Renewables/i.test(normalized)) return normalized;
    if (normalized.includes('---|---|---')) return normalized;

    const lines = normalized.split('\n');
    const start = lines.findIndex((line, idx) => {
      const a = line.trim().toLowerCase();
      const b = (lines[idx + 1] || '').trim().toLowerCase();
      const c = (lines[idx + 2] || '').trim().toLowerCase();
      return a === 'feature' && b === 'nuclear' && c === 'renewables';
    });
    if (start < 0) return normalized;

    let i = start + 3;
    const rows = [];
    while (i < lines.length) {
      while (i < lines.length && !lines[i].trim()) i += 1;
      if (i >= lines.length) break;

      const c1 = (lines[i] || '').trim();
      const c2 = (lines[i + 1] || '').trim();
      const c3 = (lines[i + 2] || '').trim();
      const stopToken = c1.toLowerCase();
      if (
        !c1 || !c2 || !c3 ||
        stopToken.startsWith('societal views') ||
        stopToken.startsWith('public perception') ||
        stopToken.startsWith('the choice between')
      ) {
        break;
      }

      rows.push([c1, c2, c3]);
      i += 3;
    }

    if (!rows.length) return normalized;

    const tableLines = [
      'Feature | Nuclear | Renewables',
      '---|---|---',
      ...rows.map((r) => `${r[0]} | ${r[1]} | ${r[2]}`)
    ];

    const before = lines.slice(0, start).join('\n').trim();
    const after = lines.slice(i).join('\n').trim();
    const parts = [];
    if (before) parts.push(before);
    parts.push(tableLines.join('\n'));
    if (after) parts.push(after);
    return parts.join('\n\n');
  }

  function hasExistingReferenceBlock(html) {
    if (!html || typeof html !== 'string') return false;
    return /detail-reference-block|detail-reference-list/i.test(html);
  }

  function formatCardGridDetail(detail, references, referencesPath) {
    const raw = normalizeLegacyComparisonTable(String(detail || '')).trim();
    if (!raw) return 'Detail content goes here. Click to edit in edit mode.';

    if (/<(p|ul|ol|li|table|div|h\d|blockquote|pre|code)\b/i.test(raw)) {
      if (hasExistingReferenceBlock(raw)) return raw;
      return `${raw}${renderCardReferences(references, referencesPath)}`;
    }

    const lines = raw.split('\n');
    const blocks = [];
    let paragraph = [];
    let listItems = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      blocks.push(`<p>${paragraph.join(' ')}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      const listHtml = listItems.map(item => `<li>${item}</li>`).join('');
      blocks.push(`<ul>${listHtml}</ul>`);
      listItems = [];
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      const parsedTable = renderMarkdownTable(lines, i);
      if (parsedTable) {
        flushParagraph();
        flushList();
        blocks.push(parsedTable.html);
        i = parsedTable.endIndex;
        continue;
      }

      if (/^[-*•]\s+/.test(trimmed)) {
        flushParagraph();
        listItems.push(trimmed.replace(/^[-*•]\s+/, ''));
        continue;
      }

      if (/:$/.test(trimmed) && trimmed.length <= 64) {
        flushParagraph();
        flushList();
        blocks.push(`<h5 class="detail-subtitle">${trimmed.replace(/:$/, '')}</h5>`);
        continue;
      }

      flushList();
      paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();

    return `${blocks.join('')}${renderCardReferences(references, referencesPath)}`;
  }

  function renderDetailContent(options) {
    const {
      title,
      titlePath,
      detail,
      detailPath,
      detailBlocks,
      detailBlocksPath,
      showBanner = true,
      detailBannerPath = '',
      detailRichTextClass = '',
      detailIsHtml = false,
      backPanelClass = 'w-full h-full p-[60px] flex flex-col justify-center gap-6 overflow-y-auto',
      closeButtonClass = 'flip-back-trigger',
      closeTargetAttr = 'data-flip-target',
      closeTargetValue = '',
      bannerImageUrl = '',
      bannerImagePath = '',
      detailBannerPositionPath = '',
      detailEndImageUrl = '',
      detailEndImagePath = '',
      bannerShrinkRatio = null,
      detailShrinkPath = '',
      bannerUseNaturalSize = null
    } = options;

    const closeTarget = closeTargetValue ? `${closeTargetAttr}="${closeTargetValue}"` : '';
    
    // Determine content to render
    let detailContent;
    let detailMaterialAttr;
    
    if (Array.isArray(detailBlocks) && detailBlocks.length > 0) {
      // Use detailBlocks if available
      detailContent = renderDetailBlocks(detailBlocks, detailBlocksPath);
      detailMaterialAttr = detailBlocksPath ? `data-material="${detailBlocksPath}"` : '';
    } else {
      // Fallback to old detail string
      detailMaterialAttr = detailIsHtml
        ? `data-material="${detailPath}" data-ref-content="true"`
        : `data-material="${detailPath}"`;
      detailContent = detailIsHtml
        ? (detail || 'Detail content goes here. Click to edit in edit mode.')
        : (detail || 'Detail content goes here. Click to edit in edit mode.');
    }
    
    const bannerEnabled = showBanner !== false;
    const bannerControlAttrs = detailBannerPath
      ? `data-detail-banner-configurable="true" data-detail-banner-path="${detailBannerPath}" data-detail-banner-enabled="${bannerEnabled ? 'true' : 'false'}"`
      : '';
    const shrinkRatio = bannerShrinkRatio != null && Number.isFinite(Number(bannerShrinkRatio))
      ? Math.max(20, Math.min(100, Math.round(Number(bannerShrinkRatio))))
      : null;
    const wrapShrinkClass = shrinkRatio != null ? ' detail-content-wrap--banner-shrunk' : '';
    const wrapShrinkStyle = shrinkRatio != null ? ` style="--detail-banner-shrink-ratio: ${shrinkRatio}"` : '';
    const shrinkPathAttr = detailShrinkPath ? ` data-detail-shrink-path="${detailShrinkPath}"` : '';
    
    // Allow callers to choose whether shrink mode uses natural-size image rendering.
    const useNaturalSize = typeof bannerUseNaturalSize === 'boolean'
      ? bannerUseNaturalSize
      : (shrinkRatio != null);

    return `
      <div class="detail-content-wrap w-full h-full flex flex-col${wrapShrinkClass}" ${bannerControlAttrs}${wrapShrinkStyle}${shrinkPathAttr}>
        ${bannerEnabled ? renderDetailMedia(bannerImageUrl, bannerImagePath, 'banner', useNaturalSize, shrinkRatio, detailBannerPositionPath) : ''}
        <div class="${backPanelClass} detail-content-panel">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-[36px] font-semibold text-white leading-tight" data-material="${titlePath}">${title || ''}</h4>
            <button class="${closeButtonClass} flex-shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center" ${closeTarget}>
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="w-16 h-[2px] bg-accent-blue"></div>
          <div class="detail-rich-text ${detailRichTextClass} text-lg text-text-muted/90 font-normal leading-relaxed latex-content flex-1 min-h-0 overflow-y-auto pr-2" style="max-height:100%;" ${detailMaterialAttr}>
            ${detailContent}
          </div>
          ${renderDetailMedia(detailEndImageUrl, detailEndImagePath, 'end', false, null)}
        </div>
      </div>
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
      showBanner = true,
      frontHtml,
      title,
      titlePath,
      detail,
      detailPath,
      detailBlocks,
      detailBlocksPath,
      bannerImageUrl = '',
      bannerImagePath = '',
      detailBannerPath = '',
      detailEndImageUrl = '',
      detailEndImagePath = '',
      wrapperClass = '',
      frontShellClass = 'h-full',
      backShellClass = 'h-full',
      backPanelClass = 'w-full h-full p-[60px] flex flex-col justify-center gap-6 overflow-y-auto',
      backHtmlOverride = null
    } = options;

    const dir = normalizeFlipDirection(flipDirection);
    const enabled = Boolean(flipEnabled);

    const backContent = backHtmlOverride != null ? backHtmlOverride : renderDetailContent({
      title,
      titlePath,
      detail,
      detailPath,
      detailBlocks,
      detailBlocksPath,
      showBanner,
      detailBannerPath,
      backPanelClass,
      closeButtonClass: 'flip-back-trigger',
      closeTargetAttr: 'data-flip-target',
      closeTargetValue: flipKey,
      bannerImageUrl,
      bannerImagePath,
      detailEndImageUrl,
      detailEndImagePath
    });

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
              ${backContent}
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
        showDetailBanner: item?.showDetailBanner !== false,
        detailEndImage: item?.detailEndImage || '',
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
          showDetailBanner: legacy.showDetailBanner !== false,
          detailEndImage: legacy.detailEndImage || '',
          flipEnabled: legacy.flipEnabled !== false,
          flipDirection: legacy.flipDirection || 'y',
          images: legacy.images || {}
        };
      })
      .filter(Boolean);

    if (legacyItems.length) return legacyItems;
    return [];
  }

  function buildTextImageLeftItemsCompat(data) {
    if (Array.isArray(data?.items) && data.items.length) {
      return data.items.map((item, idx) => ({
        tab: item?.tab || item?.title || `Section ${idx + 1}`,
        title: item?.title || '',
        description: item?.description || '',
        cta: item?.cta || 'Learn more',
        detail: item?.detail || '',
        detailBlocks: item?.detailBlocks,
        showDetailBanner: item?.showDetailBanner !== false,
        detailEndImage: item?.detailEndImage || '',
        flipEnabled: item?.flipEnabled !== false,
        flipDirection: item?.flipDirection || 'y',
        imageLabel: item?.imageLabel || '',
        detailImageShrinkRatio: typeof item?.detailImageShrinkRatio === 'number' ? item.detailImageShrinkRatio : 60,
        images: item?.images || {},
        imagesPosition: item?.images?.position || {}
      }));
    }
    const legacy = data;
    if (!legacy || (typeof legacy.title === 'undefined' && typeof legacy.description === 'undefined')) {
      return [];
    }
    return [{
      tab: legacy.title || 'Section 1',
      title: legacy.title || '',
      description: legacy.description || '',
      cta: legacy.cta || 'Learn more',
      detail: legacy.detail || '',
      detailBlocks: legacy.detailBlocks,
      showDetailBanner: legacy.showDetailBanner !== false,
      detailEndImage: legacy.detailEndImage || '',
      flipEnabled: legacy.flipEnabled === true,
      flipDirection: legacy.flipDirection || 'y',
      imageLabel: legacy.imageLabel || '',
      detailImageShrinkRatio: typeof legacy.detailImageShrinkRatio === 'number' ? legacy.detailImageShrinkRatio : 60,
      images: legacy.images || {},
      imagesPosition: legacy.images?.position || {}
    }];
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

        <button class="hero-exit-cinema hidden fixed top-6 right-6 z-50 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2">
          <i data-lucide="x" class="w-4 h-4"></i>
          <span>Exit Video Mod</span>
        </button>

        <div class="hero-video-controls">
          <button class="hero-video-playpause" aria-label="Pause">
            <i data-lucide="pause" class="w-4 h-4"></i>
          </button>
          <div class="hero-video-progress-track">
            <div class="hero-video-progress-fill"></div>
          </div>
          <span class="hero-video-time">0:00</span>
        </div>

        <div class="hero-content-overlay relative z-10 w-full max-w-[1440px] px-[120px] pb-[160px] flex flex-col items-end text-right">
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
            <button class="hero-cinema-secondary px-6 py-3 rounded-full border border-accent-blue text-accent-blue font-medium hover:bg-accent-blue/10 transition-colors flex items-center gap-2">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
              <span data-material="hero.ctaSecondary">${data.ctaSecondary || 'Watch'}</span>
            </button>
          </div>
        </div>

        <div class="hero-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-80 animate-bounce">
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
      const detailEndImageUrl = getImageUrl(item.detailEndImage, material);
      const flipPath = `highlights.items.${i}`;
      const flipKey = `highlights-item-${i}`;
      const flipEnabled = item.flipEnabled !== false;
      const showDetailBanner = item.showDetailBanner !== false;
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
            showBanner: showDetailBanner,
            frontHtml,
            title: item.title || '',
            titlePath: `highlights.items.${i}.title`,
            detail: item.detail || '',
            detailPath: `highlights.items.${i}.detail`,
            detailBlocks: item.detailBlocks,
            detailBlocksPath: `highlights.items.${i}.detailBlocks`,
            bannerImageUrl: imgUrl,
            bannerImagePath: `highlights.items.${i}.images.main`,
            detailBannerPositionPath: `highlights.items.${i}.images.position`,
            detailBannerPath: `highlights.items.${i}.showDetailBanner`,
            detailEndImageUrl,
            detailEndImagePath: `highlights.items.${i}.detailEndImage`,
            frontShellClass: 'h-full rounded-[32px] overflow-hidden bg-surface-dark',
            backShellClass: 'h-full rounded-[32px] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800'
          })}
        </div>
      `;
    }).join('\n');

    return `
      <section id="highlights" class="w-full bg-black py-[100px] flex flex-col gap-[60px] items-center">
        <div class="w-full max-w-[1440px] px-[120px] text-center flex flex-col gap-4 fade-in-up">
          ${data.label ? `<h2 class="text-[21px] font-semibold text-text-muted" data-material="highlights.label">${data.label}</h2>` : ''}
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
    const overlayKey = `${sectionId}-cards`;
    const rawCoverRatio = Number(data.coverMediaRatio);
    const coverRatio = Number.isFinite(rawCoverRatio)
      ? Math.max(25, Math.min(75, Math.round(rawCoverRatio)))
      : 57;
    const textRatio = 100 - coverRatio;
    
    const cardHtml = cards.map((card, i) => {
      const imgUrl = getImageUrl(card.image, material);
      const detailEndImageUrl = getImageUrl(card.detailEndImage, material);
      const imgPos = card.imagePosition || {};
      const bgPosX = imgPos.x ?? 50;
      const bgPosY = imgPos.y ?? 50;
      const bgScale = imgPos.scale ?? 100;
      const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${bgScale}%; background-position: ${bgPosX}% ${bgPosY}%;` : '';
      const videoLayer = renderVideoLayer(imgUrl);
      const delay = (i + 1) * 0.1;
      const flipEnabled = card.flipEnabled === true;
      const showDetailBanner = card.showDetailBanner !== false;
      const detailBannerRatio = Number.isFinite(Number(card.detailBannerRatio))
        ? Number(card.detailBannerRatio)
        : 60;

      const frontContent = `
        <div class="h-full rounded-[24px] overflow-hidden bg-surface-dark grid card-grid-front-layout group hover:bg-surface-darker transition-colors duration-300" style="grid-template-rows: ${coverRatio}% ${textRatio}%;" data-card-grid-front-layout="true">
          <div class="h-full bg-surface-darker w-full relative bg-cover bg-center" style="${bgStyle}" data-material-img="features.cards.${i}.image">
            ${videoLayer}
          </div>
          <div class="p-8 flex flex-col gap-3 min-h-0">
            <h3 class="text-2xl font-semibold text-white" data-material="features.cards.${i}.title">${card.title || ''}</h3>
            <p class="text-base text-text-muted leading-relaxed" data-material="features.cards.${i}.description">
              ${card.description || ''}
            </p>
            ${flipEnabled ? `
              <button class="cg-flip-trigger mt-auto w-fit px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2" data-material="features.cards.${i}.cta">
                ${card.cta || 'Learn more'}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      const backContent = flipEnabled ? `
        <div class="h-full rounded-[24px] overflow-hidden bg-surface-dark">
          ${renderDetailContent({
            title: card.title || '',
            titlePath: `features.cards.${i}.title`,
            detail: formatCardGridDetail(card.detail || '', card.references, `features.cards.${i}.references`),
            detailPath: `features.cards.${i}.detail`,
            showBanner: showDetailBanner,
            detailBannerPath: `features.cards.${i}.showDetailBanner`,
            detailRichTextClass: 'detail-rich-text--formatted',
            detailIsHtml: true,
            backPanelClass: 'w-full h-full p-8 flex flex-col gap-5 overflow-y-auto',
            closeButtonClass: 'cg-close-trigger',
            closeTargetAttr: 'data-cg-close',
            closeTargetValue: 'true',
            bannerImageUrl: imgUrl,
            bannerImagePath: `features.cards.${i}.image`,
            detailBannerPositionPath: `features.cards.${i}.detailImagePosition`,
            bannerShrinkRatio: detailBannerRatio,
            detailShrinkPath: `features.cards.${i}.detailBannerRatio`,
            bannerUseNaturalSize: false,
            detailEndImageUrl,
            detailEndImagePath: `features.cards.${i}.detailEndImage`
          })}
        </div>
      ` : '';

      return `
        <div class="card-grid-item fade-in-up" style="transition-delay: ${delay}s;" data-card-grid-item="true" data-collection-item="true" data-collection-type="card-grid" data-collection-path="features.cards" data-item-index="${i}">
          <div class="cg-flipper" data-cg-flip-enabled="${flipEnabled}">
            <div class="cg-flipper-inner">
              <div class="cg-face cg-face-front">${frontContent}</div>
              ${flipEnabled ? `<div class="cg-face cg-face-back">${backContent}</div>` : ''}
            </div>
          </div>
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

        <div class="card-grid-collection" data-card-grid-container="${overlayKey}" data-collection-container="true" data-collection-type="card-grid" data-collection-path="features.cards">
          ${cardHtml}
        </div>
      </section>
    `;
  }

  // Text + Image Left Template (NO FLIP - same-face layout transition)
  function textImageLeftTemplate(sectionId, data, material) {
    const items = buildTextImageLeftItemsCompat(data);
    const theme = sectionId === 'safety' || sectionId === 'innovation' ? 'dark' : 'light';
    
    // Extract headline and subheadline
    // Backward-compatible fallback for legacy section data that only has title/description
    const headline = data?.headline || data?.title || '';
    const subheadline = data?.subheadline || data?.description || '';

    if (!items.length) {
      return `
        <section id="${sectionId}" class="w-full ${theme === 'dark' ? 'bg-black' : 'bg-surface-light text-text-primaryLight'} py-[120px]">
          <div class="max-w-[1440px] mx-auto px-[120px] h-[600px] flex items-center justify-center text-text-muted">No content</div>
        </section>
      `;
    }

    const first = items[0];
    const imgUrl0 = getImageUrl(first.images?.main, material);
    const imgPos0 = first.imagesPosition || first.images?.position || {};
    const bgPosX0 = imgPos0.x ?? 50;
    const bgPosY0 = imgPos0.y ?? 50;
    const bgScale0 = imgPos0.scale ?? 100;
    const bgStyle0 = imgUrl0 && !isVideoUrl(imgUrl0) ? `background-image: url(${imgUrl0}); background-size: ${bgScale0}%; background-position: ${bgPosX0}% ${bgPosY0}%;` : '';
    const videoLayer0 = renderVideoLayer(imgUrl0);

    // Determine material path prefix (items vs direct)
    const hasItemsArray = Array.isArray(data?.items) && data.items.length > 0;
    const materialPrefix = hasItemsArray ? `${sectionId}.items.0` : sectionId;

    // Prepare items data for switcher
    const itemsForSwitcher = items.map(function(item, i) {
      const imgUrl = getImageUrl(item.images?.main, material);
      const pos = item.imagesPosition || item.images?.position || {};
      const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${pos.scale ?? 100}%; background-position: ${pos.x ?? 50}% ${pos.y ?? 50}%;` : '';
      return {
        title: item.title || '',
        description: item.description || '',
        imageLabel: item.imageLabel || '',
        detail: item.detail || '',
        detailBlocks: item.detailBlocks || [],
        imgUrl: imgUrl,
        bgStyle: bgStyle,
        isVideo: isVideoUrl(imgUrl),
        detailImageShrinkRatio: typeof item.detailImageShrinkRatio === 'number' ? item.detailImageShrinkRatio : 60
      };
    });
    const itemsForSwitcherJson = JSON.stringify(itemsForSwitcher).replace(/"/g, '&quot;');

    // Section switcher buttons (only show if multiple items)
    const switcherButtons = items.length > 1 ? items.map(function(item, i) {
      const active = i === 0;
      const btnClass = theme === 'dark'
        ? (active ? 'til-switcher-btn til-switcher-btn--active bg-white text-black border-white' : 'til-switcher-btn bg-transparent text-white border-white/30 hover:border-white/60')
        : (active ? 'til-switcher-btn til-switcher-btn--active bg-black text-white border-black' : 'til-switcher-btn bg-transparent text-text-primaryLight border-black/20 hover:border-black/40');
      return `<div class="relative" data-collection-item="true" data-collection-type="text-image-left" data-collection-path="${sectionId}.items" data-item-index="${i}"><button type="button" class="${btnClass} px-5 py-2.5 rounded-full text-sm font-medium transition-all border" data-til-index="${i}" data-til-section-id="${sectionId}">${item.tab || item.title || 'Section ' + (i + 1)}</button></div>`;
    }).join('') : '';

    return `
      <section id="${sectionId}" class="w-full ${theme === 'dark' ? 'bg-black' : 'bg-surface-light text-text-primaryLight'} py-[120px]" data-section-id="${sectionId}" data-template="text-image-left">
        <div class="max-w-[1440px] mx-auto px-[120px]">
          
          <!-- Section Headline (if provided, independent and full-width) -->
          ${headline ? `
          <div class="til-headline-wrapper text-center mb-16" data-til-headline-wrapper>
            <h2 class="til-headline text-[56px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-[1.05] mb-4"
                data-material="${sectionId}.headline">${headline}</h2>
            ${subheadline ? `<p class="til-subheadline text-[21px] ${theme === 'dark' ? 'text-text-muted' : 'text-text-primaryLight/70'} leading-[1.4] max-w-[980px] mx-auto"
                data-material="${sectionId}.subheadline">${subheadline}</p>` : ''}
          </div>
          ` : ''}
          
          <!-- Main Content Container -->
          <div class="til-container w-full h-[600px] relative"
               data-til-section-id="${sectionId}"
               data-til-active-index="0"
               data-til-detail-state="collapsed"
               data-til-theme="${theme}"
               data-til-has-items="${hasItemsArray ? 'true' : 'false'}"
               data-til-items="${itemsForSwitcherJson}">
            
            <!-- Left Content Area -->
            <div class="til-left-area absolute left-0 top-0 w-[500px] h-full flex flex-col transition-all duration-500"
                 data-til-left-area>
              
              <!-- Section Switcher (fixed at top) -->
              <div class="til-switcher-container mb-8 transition-opacity duration-300" data-til-switcher-container>
                <div class="til-switcher flex flex-wrap gap-2 items-center" data-til-switcher data-collection-container="true" data-collection-type="text-image-left" data-collection-path="${sectionId}.items">
                  ${switcherButtons}
                </div>
              </div>
              
              <!-- Content Wrapper (slides as a whole) -->
              <div class="til-content-wrapper flex-1 relative overflow-hidden" data-til-content-wrapper>
                <!-- Title/Description (shown when collapsed) -->
                <div class="til-collapsed-content absolute inset-0 transition-all duration-400 flex flex-col"
                     data-til-collapsed-content>
                  <div class="flex-1 flex flex-col justify-center overflow-y-auto">
                    <h2 class="til-title text-[64px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-[1.05] mb-6" 
                        data-material="${materialPrefix}.title"
                        data-til-title>${first.title || ''}</h2>
                    <p class="til-description text-[24px] font-normal text-text-muted leading-[1.4]" 
                       data-material="${materialPrefix}.description"
                       data-til-description>${first.description || ''}</p>
                  </div>
                  <button class="til-learn-more-btn w-fit px-6 py-3 rounded-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-black/80'} font-medium transition-colors flex items-center gap-2"
                          data-til-learn-more
                          data-material="${materialPrefix}.cta">
                    ${first.cta || 'Learn more'}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                
                <!-- Detail Content (shown when expanded) -->
                <div class="til-detail-content absolute inset-0 opacity-0 pointer-events-none transition-all duration-400 flex flex-col overflow-hidden"
                     data-til-detail-content>
                  <div class="flex flex-col gap-6 h-full">
                    <div class="flex items-start justify-between">
                      <h3 class="text-[40px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-tight"
                          data-til-detail-title>${first.title || ''}</h3>
                      <button class="til-close-btn w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} transition-colors flex items-center justify-center flex-shrink-0 ml-4"
                              data-til-close>
                        <svg class="w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <div class="w-16 h-[2px] ${theme === 'dark' ? 'bg-accent-blue' : 'bg-black'} flex-shrink-0"></div>
                    <div class="til-detail-text text-[17px] ${theme === 'dark' ? 'text-white/80' : 'text-text-primaryLight/80'} font-normal leading-relaxed latex-content overflow-y-auto pr-2 flex-1"
                         data-til-detail-text
                         data-material="${materialPrefix}.detail">${first.detail || 'Detail content goes here.'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Right Image Area Wrapper (slides with left content) -->
            <div class="til-right-wrapper absolute right-0 top-0 h-full transition-all duration-500 overflow-hidden"
                 style="width: calc(100% - 500px - 60px);"
                 data-til-right-wrapper>
              <div class="til-right-area w-full h-full relative" data-til-right-area>
                <div class="til-image-wrapper w-full h-full ${theme === 'dark' ? 'bg-surface-dark' : 'bg-white shadow-xl shadow-black/5'} rounded-[32px] relative overflow-hidden bg-cover bg-center transition-all duration-500" 
                     style="${bgStyle0}"
                     data-material-img="${materialPrefix}.images.main"
                     data-til-image-wrapper>
                  ${videoLayer0}
                  <div class="absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'text-white/20' : 'text-black/20'} text-3xl font-semibold til-image-label" 
                       data-material="${materialPrefix}.imageLabel">${first.imageLabel || ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // Text + Image Right Template (NO FLIP - same-face layout transition, mirror of Text Image Left)
  function textImageRightTemplate(sectionId, data, material) {
    const items = buildTextImageLeftItemsCompat(data);
    const theme = 'dark';
    
    // Extract headline and subheadline
    // Backward-compatible fallback for legacy section data that only has title/description
    const headline = data?.headline || data?.title || '';
    const subheadline = data?.subheadline || data?.description || '';

    if (!items.length) {
      return `
        <section id="${sectionId}" class="w-full ${theme === 'dark' ? 'bg-black' : 'bg-surface-light text-text-primaryLight'} py-[120px]">
          <div class="max-w-[1440px] mx-auto px-[120px] h-[600px] flex items-center justify-center text-text-muted">No content</div>
        </section>
      `;
    }

    const first = items[0];
    const imgUrl0 = getImageUrl(first.images?.main, material);
    const imgPos0 = first.imagesPosition || first.images?.position || {};
    const bgPosX0 = imgPos0.x ?? 50;
    const bgPosY0 = imgPos0.y ?? 50;
    const bgScale0 = imgPos0.scale ?? 100;
    const bgStyle0 = imgUrl0 && !isVideoUrl(imgUrl0) ? `background-image: url(${imgUrl0}); background-size: ${bgScale0}%; background-position: ${bgPosX0}% ${bgPosY0}%;` : '';
    const videoLayer0 = renderVideoLayer(imgUrl0);

    // Determine material path prefix (items vs direct)
    const hasItemsArray = Array.isArray(data?.items) && data.items.length > 0;
    const materialPrefix = hasItemsArray ? `${sectionId}.items.0` : sectionId;

    // Prepare items data for switcher
    const itemsForSwitcher = items.map(function(item, i) {
      const imgUrl = getImageUrl(item.images?.main, material);
      const pos = item.imagesPosition || item.images?.position || {};
      const bgStyle = imgUrl && !isVideoUrl(imgUrl) ? `background-image: url(${imgUrl}); background-size: ${pos.scale ?? 100}%; background-position: ${pos.x ?? 50}% ${pos.y ?? 50}%;` : '';
      return {
        title: item.title || '',
        description: item.description || '',
        imageLabel: item.imageLabel || '',
        detail: item.detail || '',
        detailBlocks: item.detailBlocks || [],
        imgUrl: imgUrl,
        bgStyle: bgStyle,
        isVideo: isVideoUrl(imgUrl),
        detailImageShrinkRatio: typeof item.detailImageShrinkRatio === 'number' ? item.detailImageShrinkRatio : 60
      };
    });
    const itemsForSwitcherJson = JSON.stringify(itemsForSwitcher).replace(/"/g, '&quot;');

    // Section switcher buttons (only show if multiple items)
    const switcherButtons = items.length > 1 ? items.map(function(item, i) {
      const active = i === 0;
      const btnClass = theme === 'dark'
        ? (active ? 'til-switcher-btn til-switcher-btn--active bg-white text-black border-white' : 'til-switcher-btn bg-transparent text-white border-white/30 hover:border-white/60')
        : (active ? 'til-switcher-btn til-switcher-btn--active bg-black text-white border-black' : 'til-switcher-btn bg-transparent text-text-primaryLight border-black/20 hover:border-black/40');
      return `<div class="relative" data-collection-item="true" data-collection-type="text-image-right" data-collection-path="${sectionId}.items" data-item-index="${i}"><button type="button" class="${btnClass} px-5 py-2.5 rounded-full text-sm font-medium transition-all border" data-til-index="${i}" data-til-section-id="${sectionId}">${item.tab || item.title || 'Section ' + (i + 1)}</button></div>`;
    }).join('') : '';

    return `
      <section id="${sectionId}" class="w-full ${theme === 'dark' ? 'bg-black' : 'bg-surface-light text-text-primaryLight'} py-[120px]" data-section-id="${sectionId}" data-template="text-image-right">
        <div class="max-w-[1440px] mx-auto px-[120px]">
          
          <!-- Section Headline (if provided, independent and full-width) -->
          ${headline ? `
          <div class="til-headline-wrapper text-center mb-16" data-til-headline-wrapper>
            <h2 class="til-headline text-[56px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-[1.05] mb-4"
                data-material="${sectionId}.headline">${headline}</h2>
            ${subheadline ? `<p class="til-subheadline text-[21px] ${theme === 'dark' ? 'text-text-muted' : 'text-text-primaryLight/70'} leading-[1.4] max-w-[980px] mx-auto"
                data-material="${sectionId}.subheadline">${subheadline}</p>` : ''}
          </div>
          ` : ''}
          
          <!-- Main Content Container -->
          <div class="til-container w-full h-[600px] relative"
               data-til-section-id="${sectionId}"
               data-til-active-index="0"
               data-til-detail-state="collapsed"
               data-til-layout="mirrored"
               data-til-theme="${theme}"
               data-til-has-items="${hasItemsArray ? 'true' : 'false'}"
               data-til-items="${itemsForSwitcherJson}">
            
            <!-- Left Content Area (mirrored to right) -->
            <div class="til-left-area absolute right-0 top-0 w-[500px] h-full flex flex-col transition-all duration-500"
                 data-til-left-area>
              
              <!-- Section Switcher (fixed at top) -->
              <div class="til-switcher-container mb-8 transition-opacity duration-300" data-til-switcher-container>
                <div class="til-switcher flex flex-wrap gap-2 items-center" data-til-switcher data-collection-container="true" data-collection-type="text-image-right" data-collection-path="${sectionId}.items">
                  ${switcherButtons}
                </div>
              </div>
              
              <!-- Content Wrapper (slides as a whole) -->
              <div class="til-content-wrapper flex-1 relative overflow-hidden" data-til-content-wrapper>
                <!-- Title/Description (shown when collapsed) -->
                <div class="til-collapsed-content absolute inset-0 transition-all duration-400 flex flex-col"
                     data-til-collapsed-content>
                  <div class="flex-1 flex flex-col justify-center overflow-y-auto">
                    <h2 class="til-title text-[64px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-[1.05] mb-6" 
                        data-material="${materialPrefix}.title"
                        data-til-title>${first.title || ''}</h2>
                    <p class="til-description text-[24px] font-normal text-text-muted leading-[1.4]" 
                       data-material="${materialPrefix}.description"
                       data-til-description>${first.description || ''}</p>
                  </div>
                  <button class="til-learn-more-btn w-fit px-6 py-3 rounded-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-black/80'} font-medium transition-colors flex items-center gap-2"
                          data-til-learn-more
                          data-material="${materialPrefix}.cta">
                    ${first.cta || 'Learn more'}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                
                <!-- Detail Content (shown when expanded) -->
                <div class="til-detail-content absolute inset-0 opacity-0 pointer-events-none transition-all duration-400 flex flex-col overflow-hidden"
                     data-til-detail-content>
                  <div class="flex flex-col gap-6 h-full">
                    <div class="flex items-start justify-between">
                      <h3 class="text-[40px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-text-primaryLight'} leading-tight"
                          data-til-detail-title>${first.title || ''}</h3>
                      <button class="til-close-btn w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} transition-colors flex items-center justify-center flex-shrink-0 ml-4"
                              data-til-close>
                        <svg class="w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <div class="w-16 h-[2px] ${theme === 'dark' ? 'bg-accent-blue' : 'bg-black'} flex-shrink-0"></div>
                    <div class="til-detail-text text-[17px] ${theme === 'dark' ? 'text-white/80' : 'text-text-primaryLight/80'} font-normal leading-relaxed latex-content overflow-y-auto pr-2 flex-1"
                         data-til-detail-text
                         data-material="${materialPrefix}.detail">${first.detail || 'Detail content goes here.'}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Image Area Wrapper (mirrored to left) -->
            <div class="til-right-wrapper absolute left-0 top-0 h-full transition-all duration-500 overflow-hidden"
                 style="width: calc(100% - 500px - 60px);"
                 data-til-right-wrapper>
              <div class="til-right-area w-full h-full relative" data-til-right-area>
                <div class="til-image-wrapper w-full h-full ${theme === 'dark' ? 'bg-surface-dark' : 'bg-white shadow-xl shadow-black/5'} rounded-[32px] relative overflow-hidden bg-cover bg-center transition-all duration-500" 
                     style="${bgStyle0}"
                     data-material-img="${materialPrefix}.images.main"
                     data-til-image-wrapper>
                  ${videoLayer0}
                  <div class="absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'text-white/20' : 'text-black/20'} text-3xl font-semibold til-image-label" 
                       data-material="${materialPrefix}.imageLabel">${first.imageLabel || ''}</div>
                </div>
              </div>
            </div>
          </div>
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
        const detailEndImageUrl = getImageUrl(feature.detailEndImage, material);
        const showDetailBanner = feature.showDetailBanner !== false;
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
              showBanner: showDetailBanner,
              wrapperClass: 'h-[220px] rounded-2xl',
              frontHtml,
              title: feature.title || '',
              titlePath: `closerLook.features.${i}.title`,
              detail: feature.detail || '',
              detailPath: `closerLook.features.${i}.detail`,
              detailBlocks: feature.detailBlocks,
              detailBlocksPath: `closerLook.features.${i}.detailBlocks`,
              bannerImageUrl: imgUrl,
              bannerImagePath: 'closerLook.images.reactor',
              detailBannerPath: `closerLook.features.${i}.showDetailBanner`,
              detailEndImageUrl,
              detailEndImagePath: `closerLook.features.${i}.detailEndImage`,
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

  // Interactive Details Template (Dark)
  function interactiveDetailsTemplate(sectionId, data, material) {
    const items = data.items || [];

    const itemsHtml = items.map((item, i) => {
      const isFirst = i === 0;
      return `
        <div class="id-item group cursor-pointer border-b border-white/10 py-6 ${isFirst ? 'active' : ''}"
             data-id-item="${i}"
             data-collection-item="true"
             data-collection-type="interactive-details"
             data-collection-path="${sectionId}.items"
             data-item-index="${i}">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[28px] font-semibold ${isFirst ? 'text-white' : 'text-white/50'} group-hover:text-white transition-colors duration-300"
                data-material="${sectionId}.items.${i}.title">${item.title || ''}</h3>
            <i data-lucide="${isFirst ? 'chevron-down' : 'chevron-right'}"
               class="w-6 h-6 ${isFirst ? 'text-white' : 'text-white/30'} group-hover:text-white/70 transition-all duration-300 flex-shrink-0"></i>
          </div>
          <div class="id-item-desc text-[17px] text-white/60 leading-relaxed ${isFirst ? 'id-item-desc--open' : ''}"
               data-material="${sectionId}.items.${i}.description">
            ${item.description || ''}
          </div>
        </div>
      `;
    }).join('\n');

    // Build detail panels for the right side - each has its own background
    const detailPanelsHtml = items.map((item, i) => {
      const isFirst = i === 0;
      
      // Render detail content - support both detailBlocks and plain detail
      let detailContent;
      if (Array.isArray(item.detailBlocks) && item.detailBlocks.length > 0) {
        detailContent = renderDetailBlocks(item.detailBlocks, `${sectionId}.items.${i}.detailBlocks`);
      } else {
        detailContent = item.detail || 'Detail content goes here.';
      }

      // Cover image (optional) for the front face
      const coverImgUrl = getImageUrl(item.coverImage, material);
      const coverBgStyle = coverImgUrl
        ? `background-image: url('${coverImgUrl}'); background-size: cover; background-position: center;`
        : '';
      
      return `
        <div class="id-detail-panel ${isFirst ? 'id-detail-panel--active' : ''} rounded-[32px]"
             data-id-detail="${i}"
             data-panel-index="${i}">
          <!-- Flip card wrapper -->
          <div class="id-panel-flipper">
            <div class="id-panel-inner">

              <!-- FRONT: Cover face -->
              <div class="id-panel-face id-panel-front bg-surface-dark">
                <div class="w-full h-full relative" style="${coverBgStyle}"
                     data-material-img="${sectionId}.items.${i}.coverImage">
                  <!-- Gradient overlay for bottom legibility -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                  <!-- Learn More button -->
                  <div class="absolute bottom-0 left-0 right-0 p-[52px]">
                    <button class="id-panel-learn-more px-7 py-3.5 rounded-full bg-white text-black text-[17px] font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                      Learn More
                      <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- BACK: Text detail face -->
              <div class="id-panel-face id-panel-back bg-surface-dark">
                <!-- Back button -->
                <button class="id-panel-back-btn absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center z-10">
                  <i data-lucide="x" class="w-5 h-5 text-white"></i>
                </button>
                <div class="w-full h-full p-[60px] flex flex-col gap-6">
                  <h3 class="text-[40px] font-semibold text-white leading-tight flex-shrink-0"
                      data-material="${sectionId}.items.${i}.title">${item.title || ''}</h3>
                  <div class="w-16 h-[2px] bg-accent-blue flex-shrink-0"></div>
                  <div class="detail-rich-text text-[19px] text-white/80 font-normal leading-[1.6] latex-content flex-1 min-h-0 overflow-y-auto pr-2"
                       data-material="${sectionId}.items.${i}.detail">
                    ${detailContent}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;
    }).join('\n');

    return `
      <section id="${sectionId}" class="w-full bg-black py-[120px]">
        <div class="max-w-[1440px] mx-auto px-[120px]">
          ${(data.headline || data.subheadline) ? `
          <div class="text-center mb-[80px] fade-in-up">
            ${data.headline ? `<h2 class="text-[64px] font-semibold text-white leading-[1.05]" data-material="${sectionId}.headline">${data.headline}</h2>` : ''}
            ${data.subheadline ? `<p class="text-[21px] text-white/50 leading-[1.5] mt-4 max-w-[720px] mx-auto font-normal" data-material="${sectionId}.subheadline">${data.subheadline}</p>` : ''}
          </div>` : ''}
          <div class="flex gap-[80px] items-start">
            <div class="w-[500px] flex flex-col fade-in-up"
                 data-id-list="${sectionId}"
                 data-collection-container="true"
                 data-collection-type="interactive-details"
                 data-collection-path="${sectionId}.items">
              ${itemsHtml}
            </div>

            <div class="flex-1 h-[600px] relative overflow-visible fade-in-up id-detail-container-wrapper"
                 style="transition-delay: 0.2s;">
              <div class="id-detail-container w-full h-full shadow-2xl shadow-black/40 rounded-[32px] relative overflow-hidden"
                   data-id-detail-container="${sectionId}"
                   data-current-index="0"
                   data-total-panels="${items.length}">
                  ${detailPanelsHtml}
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
    const questions = data.questions || [];
    const isCollapsed = data.collapsed !== false;
    const collapsedLabel = data.collapsedLabel || 'Quick Quiz';
    
    // Render individual question cards with data-material attributes
    const questionsHtml = questions.map((q, qIdx) => {
      const optionsHtml = (q.options || []).map((opt, optIdx) => `
        <button 
          class="quiz-option-btn w-full text-left p-5 rounded-2xl bg-surface-darker border-2 border-white/10 text-white transition-all duration-300 hover:border-accent-cyan/50 hover:bg-white/5 relative overflow-hidden"
          data-question-index="${qIdx}"
          data-option-index="${optIdx}"
        >
          <span class="relative z-10" data-material="${sectionId}.questions.${qIdx}.options.${optIdx}">${opt}</span>
          <div class="quiz-option-checkmark absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="quiz-option-particles absolute inset-0 pointer-events-none"></div>
        </button>
      `).join('');
      
      return `
        <div class="quiz-question-card ${qIdx === 0 ? 'active' : ''}" data-question-index="${qIdx}">
          <div class="mb-4 flex items-center gap-3 text-white/60">
            <span class="text-sm font-medium">Question ${qIdx + 1} of ${questions.length}</span>
            <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-accent-cyan rounded-full transition-all duration-300" style="width: ${((qIdx) / questions.length) * 100}%"></div>
            </div>
          </div>
          <h3 class="text-2xl md:text-3xl font-semibold text-white mb-8" data-material="${sectionId}.questions.${qIdx}.question">
            ${q.question || ''}
          </h3>
          <div class="quiz-options-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            ${optionsHtml}
          </div>
          <div class="quiz-explanation-panel hidden mt-6 p-6 rounded-2xl bg-white/5 border border-white/10">
            <div class="flex items-start gap-3">
              <div class="quiz-explanation-icon flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1">
                <i data-lucide="lightbulb" class="w-5 h-5"></i>
              </div>
              <div class="flex-1">
                <h4 class="text-lg font-semibold text-white mb-2">Explanation</h4>
                <p class="text-text-muted leading-relaxed" data-material="${sectionId}.questions.${qIdx}.explanation">${q.explanation || ''}</p>
              </div>
            </div>
          </div>
          <div class="quiz-next-btn-container hidden mt-8 flex justify-end">
            <button class="quiz-next-btn px-8 py-4 rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-all duration-300 flex items-center gap-2">
              <span>${qIdx < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
              <i data-lucide="arrow-right" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <section id="${sectionId}" class="w-full bg-black py-12 md:py-20 quiz-section ${isCollapsed ? 'quiz-collapsed' : 'quiz-expanded'}" data-quiz-id="${sectionId}">
        <!-- Collapsed Strip -->
        <div class="quiz-collapsed-strip max-w-[1000px] mx-auto px-6 md:px-[120px] cursor-pointer" onclick="QuizEngine.toggleCollapse('${sectionId}')">
          <div class="flex items-center justify-center gap-4 py-6 px-8 rounded-full bg-surface-dark border border-white/10 hover:border-accent-cyan/50 transition-all duration-300 hover:bg-white/5">
            <i data-lucide="help-circle" class="w-6 h-6 text-accent-cyan"></i>
            <span class="text-xl font-semibold text-white" data-material="${sectionId}.collapsedLabel">${collapsedLabel}</span>
            <i data-lucide="chevron-down" class="w-6 h-6 text-white/60 quiz-chevron transition-transform duration-300"></i>
          </div>
        </div>
        
        <!-- Expanded Content -->
        <div class="quiz-expanded-content max-w-[1000px] mx-auto px-6 md:px-[120px]">
          <div class="bg-surface-dark rounded-[32px] p-8 md:p-12 border border-white/10">
            <!-- Header -->
            <div class="flex items-start justify-between mb-8">
              <div class="flex-1">
                <h2 class="text-[32px] md:text-[48px] font-semibold text-white mb-4" data-material="${sectionId}.title">${data.title || 'Quiz'}</h2>
                <p class="text-lg md:text-xl text-text-muted mb-4" data-material="${sectionId}.description">${data.description || ''}</p>
              </div>
              <button 
                onclick="QuizEngine.toggleCollapse('${sectionId}')"
                class="flex-shrink-0 ml-4 p-2 rounded-full hover:bg-white/5 transition-colors"
                aria-label="Collapse quiz"
              >
                <i data-lucide="x" class="w-6 h-6 text-white/60"></i>
              </button>
            </div>
            
            <!-- Questions Container (only one visible at a time) -->
            <div id="quiz-questions-${sectionId}" class="quiz-questions-container relative min-h-[500px]">
              ${questionsHtml}
            </div>
            
            <!-- Score Summary (hidden initially) -->
            <div class="quiz-score-summary hidden mt-8 p-8 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 border border-accent-cyan/30">
              <div class="text-center">
                <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent-cyan/20 mb-4">
                  <i data-lucide="trophy" class="w-10 h-10 text-accent-cyan"></i>
                </div>
                <h3 class="text-3xl font-bold text-white mb-2">Quiz Complete!</h3>
                <p class="text-xl text-white/80 mb-4">You scored <span class="quiz-final-score font-bold text-accent-cyan">0</span> out of <span class="font-bold">${questions.length}</span></p>
                <button onclick="QuizEngine.reset('${sectionId}')" class="px-6 py-3 rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors">
                  Try Again
                </button>
              </div>
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
    'interactive-details': interactiveDetailsTemplate,
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
    buildTextImageLeftItemsCompat: buildTextImageLeftItemsCompat,
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
