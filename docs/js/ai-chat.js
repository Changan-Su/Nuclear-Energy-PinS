/**
 * AI Chat module — orchestrates the full Energy Physics RAG pipeline:
 *   ScopeGuard → Retriever → LLMClient → ResponseGuard → render
 *
 * Exposed as window.AIChat with init() / reset() for section-renderer lifecycle.
 */
window.AIChat = (function () {
  'use strict';

  let initialized = false;

  // ── Initialisation guard ───────────────────────────────────────────────────

  function init() {
    if (initialized) return;

    const chatContainer = document.getElementById('chat-messages');
    const inputField    = document.querySelector('#ai-chat input');
    const chatPanel     = document.querySelector('#ai-chat > div');
    const sendBtn       = document.querySelector('#ai-chat button[aria-label="Send message"]')
      || document.querySelector('#ai-chat .h-\\[100px\\] button')
      || document.querySelector('#ai-chat button:last-of-type');
    const expandBtn     = document.querySelector('#ai-chat button[aria-label="Toggle chat size"]')
      || document.querySelector('#ai-chat .h-20 button');
    const navChatBtn    = document.getElementById('nav-chat-btn');

    if (!chatContainer || !inputField || !sendBtn || !chatPanel) return;
    initialized = true;

    // Pull runtime config from material.json
    const material  = window.SectionRenderer && window.SectionRenderer.getMaterial
      ? window.SectionRenderer.getMaterial()
      : null;
    const aiChatCfg = material?.index?.aiChat || {};
    const retriCfg  = aiChatCfg.retrieval || {};
    const streamEnabled = aiChatCfg.stream !== false;
    const showReasoningFold = aiChatCfg.showReasoningFold !== false;

    // Init LLM client with material config
    if (window.LLMClient) {
      window.LLMClient.init({
        baseURL:     aiChatCfg.baseURL     || 'https://api.openai.com/v1',
        endpointPath: aiChatCfg.endpointPath || '/chat/completions',
        model:       aiChatCfg.model       || 'gpt-4o-mini',
        apiKey:      aiChatCfg.apiKey      || '',
        allowNoApiKey: aiChatCfg.allowNoApiKey === true,
        sendAuthorizationHeader: aiChatCfg.sendAuthorizationHeader !== false,
        temperature: aiChatCfg.temperature ?? 0.3,
        maxTokens:   aiChatCfg.maxTokens   ?? 800,
      });
    }

    // Build knowledge index if material is available and not yet built
    if (material && window.KnowledgeIndex && !window.KnowledgeIndex.isBuilt()) {
      window.KnowledgeIndex.build(material);
    }

    // ── UI helpers ─────────────────────────────────────────────────────────

    const scrollToBottom = () => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const BASE_HEIGHT  = 700;
    const EXPAND_EXTRA = 800;   // expanded = base + this, capped at 92vh

    function updateResizeButtonIcon(isExpanded) {
      if (!expandBtn) return;
      const icon = isExpanded ? 'minimize-2' : 'maximize-2';
      const tip  = isExpanded ? 'Restore chat size' : 'Expand chat';
      expandBtn.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i>`;
      expandBtn.setAttribute('title', tip);
      if (window.lucide) window.lucide.createIcons();
    }

    function setGlowExpanded(on) {
      if (!chatPanel) return;
      if (on) {
        chatPanel.style.boxShadow = '0 0 60px 8px rgba(34,211,238,0.18), 0 30px 80px rgba(0,0,0,0.6)';
      } else {
        chatPanel.style.boxShadow = '';
      }
    }

    function getExpandedHeight() {
      const base   = Number(chatPanel.dataset.baseHeightPx) || BASE_HEIGHT;
      const target = base + EXPAND_EXTRA;
      const cap    = Math.floor(window.innerHeight * 0.92);
      return Math.min(target, cap);
    }

    function setupResizeToggle() {
      const baseHeight = Number(chatPanel.getBoundingClientRect().height) || BASE_HEIGHT;
      chatPanel.dataset.baseHeightPx = String(baseHeight);
      chatPanel.dataset.expanded     = 'false';
      chatPanel.style.height         = `${baseHeight}px`;
      updateResizeButtonIcon(false);
      setGlowExpanded(false);

      if (!expandBtn) return;
      expandBtn.addEventListener('click', () => {
        const isExpanded = chatPanel.dataset.expanded === 'true';
        if (isExpanded) {
          chatPanel.style.height     = `${chatPanel.dataset.baseHeightPx}px`;
          chatPanel.dataset.expanded = 'false';
          updateResizeButtonIcon(false);
          setGlowExpanded(false);
          setTimeout(scrollToBottom, 520);
        } else {
          chatPanel.style.height     = `${getExpandedHeight()}px`;
          chatPanel.dataset.expanded = 'true';
          updateResizeButtonIcon(true);
          setGlowExpanded(true);
          setTimeout(scrollToBottom, 520);
        }
      });
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderMathWithRetry(containerEl) {
      if (!containerEl || !window.LatexRenderer) return;
      const tryRender = () => {
        if (typeof window.LatexRenderer.renderElement === 'function') {
          window.LatexRenderer.renderElement(containerEl);
        }
        // renderAll has built-in katex-ready waiting logic.
        if (typeof window.LatexRenderer.renderAll === 'function') {
          window.LatexRenderer.renderAll();
        }
      };
      tryRender();
      setTimeout(tryRender, 120);
      setTimeout(tryRender, 420);
    }

    function buildCitationHtml(citations, sectionCitations) {
      if ((!citations || citations.length === 0) && (!sectionCitations || sectionCitations.length === 0)) return '';
      const extractUrl = (citation) => {
        if (citation && citation.url) return citation.url;
        const text = citation && citation.text ? citation.text : '';
        const match = text.match(/https?:\/\/[^\s)]+/i);
        return match ? match[0] : '';
      };
      const refItems = (citations || []).map(c => {
        const idLabel = c.id ? `[${c.id}] ` : '';
        const text = c.text ? c.text.slice(0, 160) + (c.text.length > 160 ? '...' : '') : '';
        const parsedUrl = extractUrl(c);
        const jumpLink = c.id
          ? `<a href="#ref-${c.id}" class="ref-cite underline text-accent-cyan/80 hover:text-accent-cyan transition-colors"
              data-ref-id="${c.id}" title="Jump to Reference [${c.id}]">${escapeHtml(idLabel + text)}</a>`
          : `<span>${escapeHtml(idLabel + text)}</span>`;
        const externalLink = parsedUrl
          ? `<a href="${parsedUrl}" target="_blank" rel="noopener noreferrer"
              class="ml-2 text-white/40 hover:text-white/70 transition-colors" title="${escapeHtml(parsedUrl)}">[open]</a>`
          : '';
        return `<li class="leading-snug">${jumpLink}${externalLink}</li>`;
      }).join('');
      const sectionItems = (sectionCitations || []).map(s => {
        const label = `${s.sectionName}: ${s.title}`;
        return `<li class="leading-snug">
          <a href="#${escapeHtml(s.anchor)}" class="underline text-accent-cyan/80 hover:text-accent-cyan transition-colors">
            ${escapeHtml(label)}
          </a>
        </li>`;
      }).join('');
      return `
        <div class="mt-3 pt-3 border-t border-white/10">
          <p class="text-white/40 text-xs mb-1 uppercase tracking-wide">Sources</p>
          ${sectionItems ? `<p class="text-white/35 text-[11px] mt-1 mb-1 uppercase tracking-wide">Sections</p><ul class="text-white/50 text-xs space-y-1 list-none">${sectionItems}</ul>` : ''}
          ${refItems ? `<p class="text-white/35 text-[11px] mt-2 mb-1 uppercase tracking-wide">References</p><ul class="text-white/50 text-xs space-y-1 list-none">${refItems}</ul>` : ''}
        </div>`;
    }

    function buildReasoningHtml(reasoningText) {
      if (!reasoningText || !showReasoningFold) return '';
      return `
        <details class="mt-3 pt-3 border-t border-white/10">
          <summary class="text-white/40 text-xs uppercase tracking-wide cursor-pointer">Model thinking (raw)</summary>
          <pre class="text-white/55 text-xs leading-relaxed whitespace-pre-wrap mt-2">${escapeHtml(reasoningText)}</pre>
        </details>`;
    }

    function addMessage(content, isUser, citations, reasoningText, isHtml, sectionCitations) {
      const msgDiv = document.createElement('div');
      msgDiv.className = isUser
        ? 'flex gap-4 items-start justify-end'
        : 'flex gap-4 items-start';

      const avatar = isUser ? '' : `
        <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
        </div>`;

      const bubbleClass = isUser
        ? 'bg-accent-blue p-5 rounded-l-[20px] rounded-br-[20px] max-w-[600px] border border-white/5'
        : 'bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5';

      const bodyHtml = isHtml
        ? String(content || '')
        : escapeHtml(content || '').replace(/\n/g, '<br>');
      const citationHtml = buildCitationHtml(citations, sectionCitations);
      const reasoningHtml = buildReasoningHtml(reasoningText);

      msgDiv.innerHTML = `
        ${!isUser ? avatar : ''}
        <div class="${bubbleClass}">
          <p class="text-white text-base leading-relaxed">${bodyHtml}</p>
          ${citationHtml}
          ${reasoningHtml}
        </div>`;

      chatContainer.appendChild(msgDiv);
      if (!isUser) {
        renderMathWithRetry(msgDiv);
      }
      if (window.lucide) window.lucide.createIcons();
      scrollToBottom();
    }

    function createStreamingAssistantMessage() {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'flex gap-4 items-start';
      msgDiv.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
        </div>
        <div class="bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5">
          <p class="text-white text-base leading-relaxed"></p>
          <div class="chat-assistant-footers"></div>
        </div>`;

      const bodyEl = msgDiv.querySelector('p');
      const footersEl = msgDiv.querySelector('.chat-assistant-footers');
      chatContainer.appendChild(msgDiv);
      if (window.lucide) window.lucide.createIcons();
      scrollToBottom();

      return {
        updatePlainText(fullText) {
          bodyEl.innerHTML = escapeHtml(fullText || '').replace(/\n/g, '<br>');
          scrollToBottom();
        },
        finalize(finalHtml, citations, reasoningText, sectionCitations) {
          bodyEl.innerHTML = finalHtml || '';
          footersEl.innerHTML = `${buildCitationHtml(citations, sectionCitations)}${buildReasoningHtml(reasoningText)}`;
          renderMathWithRetry(msgDiv);
          scrollToBottom();
        },
        remove() {
          msgDiv.remove();
        },
      };
    }

    function showTyping() {
      const indicator = document.createElement('div');
      indicator.id = 'chat-typing-indicator';
      indicator.className = 'flex gap-4 items-start';
      indicator.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
        </div>
        <div class="bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5 flex items-center gap-2">
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay:0.4s"></span>
        </div>`;
      chatContainer.appendChild(indicator);
      if (window.lucide) window.lucide.createIcons();
      scrollToBottom();
    }

    function hideTyping() {
      const indicator = document.getElementById('chat-typing-indicator');
      if (indicator) indicator.remove();
    }

    // ── Pipeline ───────────────────────────────────────────────────────────

    const handleSend = async () => {
      const text = inputField.value.trim();
      if (!text) return;

      // Display user message and clear input
      addMessage(text, true);
      inputField.value = '';
      showTyping();

      try {
        // Step 1: Domain scope check
        if (window.ScopeGuard) {
          const scopeResult = window.ScopeGuard.checkScope(text);
          if (!scopeResult.inScope) {
            hideTyping();
            addMessage(window.PromptPolicy.REFUSAL_MESSAGE, false);
            return;
          }
        }

        // Step 2: Retrieve relevant evidence
        let evidenceChunks = [];
        if (window.Retriever) {
          const { chunks } = await window.Retriever.retrieve(text, {
            topK:      retriCfg.topK      ?? 4,
            useNeural: retriCfg.useEmbeddings ?? false,
            minScore:  retriCfg.minKeywordScore ?? 0.05,
          });
          evidenceChunks = chunks;
        }

        // Step 3: Build prompt and call LLM
        let responseText = null;
        let reasoningText = '';
        let apiError = null;
        let liveAssistant = null;

        if (window.LLMClient && window.LLMClient.isConfigured()) {
          const messages = window.PromptPolicy.buildMessages(text, evidenceChunks);
          if (streamEnabled && typeof window.LLMClient.chatStream === 'function') {
            hideTyping();
            liveAssistant = createStreamingAssistantMessage();
            const result = await window.LLMClient.chatStream(messages, {
              onContentDelta: (delta, full) => {
                liveAssistant.updatePlainText(full);
              },
            });
            responseText = result.content;
            reasoningText = result.reasoning || '';
            apiError = result.error;
          } else {
            const result = await window.LLMClient.chat(messages);
            responseText = result.content;
            reasoningText = result.reasoning || '';
            apiError = result.error;
          }
        } else {
          // LLM not configured — show demo response with evidence preview
          apiError = window.LLMClient && !window.LLMClient.isConfigured()
            ? 'Set <code>aiChat.apiKey</code> in material.json to enable live answers.'
            : null;
        }

        // Step 4: Guard and display response
        hideTyping();

        if (apiError) {
          if (liveAssistant) liveAssistant.remove();
          addMessage(
            `<span class="text-yellow-400">⚠ ${apiError}</span>`,
            false,
            null,
            '',
            true
          );
          // Show retrieved evidence preview so the user can see what was found
          if (evidenceChunks.length > 0) {
            const preview = evidenceChunks.map(c =>
              `<strong>${c.title}</strong> (${c.sectionName})`
            ).join('<br>');
            addMessage(
              `<span class="text-white/60 text-sm">Relevant sections found:<br>${preview}</span>`,
              false,
              null,
              '',
              true
            );
          }
          return;
        }

        const refMap = window.KnowledgeIndex ? window.KnowledgeIndex.getRefMap() : {};
        const guarded = window.ResponseGuard.guard(responseText, evidenceChunks, refMap);
        if (liveAssistant) {
          liveAssistant.finalize(
            guarded.text,
            guarded.isRefusal ? [] : guarded.citations,
            reasoningText,
            guarded.sectionCitations || []
          );
        } else {
          addMessage(
            guarded.text,
            false,
            guarded.isRefusal ? [] : guarded.citations,
            reasoningText,
            true,
            guarded.sectionCitations || []
          );
        }

      } catch (err) {
        hideTyping();
        console.error('[AIChat] Pipeline error:', err);
        addMessage(
          'Something went wrong. Please try again in a moment.',
          false
        );
      }
    };

    // ── Event bindings ─────────────────────────────────────────────────────

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleSend();
    });
    setupResizeToggle();

    if (navChatBtn) {
      navChatBtn.addEventListener('click', () => {
        const section = document.getElementById('ai-chat');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  function reset() { initialized = false; }

  return { init, reset };
})();
