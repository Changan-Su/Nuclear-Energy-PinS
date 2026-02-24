/**
 * LLMClient — OpenAI-compatible chat completion client.
 *
 * Reads baseURL, model, apiKey, temperature, and maxTokens from the
 * aiChat section of material.json (passed in via init()).
 *
 * Usage:
 *   window.LLMClient.init(config);
 *   const { content, error } = await window.LLMClient.chat(messages);
 */
window.LLMClient = (function () {
  'use strict';

  let _config = {
    baseURL:     'https://api.openai.com/v1',
    endpointPath: '/chat/completions',
    model:       'gpt-4o-mini',
    apiKey:      '',
    allowNoApiKey: false,
    sendAuthorizationHeader: true,
    temperature: 0.3,
    maxTokens:   800,
  };

  // ── Initialisation ─────────────────────────────────────────────────────────

  function init(config) {
    if (!config) return;
    if (config.baseURL)     _config.baseURL     = config.baseURL.replace(/\/$/, '');
    if (typeof config.endpointPath === 'string' && config.endpointPath.trim()) _config.endpointPath = config.endpointPath.trim();
    if (config.model)       _config.model       = config.model;
    if (config.apiKey)      _config.apiKey      = config.apiKey;
    if (typeof config.allowNoApiKey === 'boolean') _config.allowNoApiKey = config.allowNoApiKey;
    if (typeof config.sendAuthorizationHeader === 'boolean') _config.sendAuthorizationHeader = config.sendAuthorizationHeader;
    if (typeof config.temperature === 'number') _config.temperature = config.temperature;
    if (typeof config.maxTokens   === 'number') _config.maxTokens   = config.maxTokens;
  }

  function isConfigured() {
    return Boolean(_config.baseURL && (_config.apiKey || _config.allowNoApiKey));
  }

  function buildEndpoint() {
    if (!_config.endpointPath.startsWith('/')) {
      return `${_config.baseURL}/${_config.endpointPath}`;
    }
    return `${_config.baseURL}${_config.endpointPath}`;
  }

  function extractTextValue(value) {
    if (typeof value === 'string') return value;
    if (!Array.isArray(value)) return '';
    return value.map(part => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      if (part && typeof part.content === 'string') return part.content;
      return '';
    }).join('');
  }

  function extractReasoningFromMessage(message) {
    if (!message || typeof message !== 'object') return '';
    const fields = [
      message.reasoning,
      message.reasoning_content,
      message.thinking,
      message.reasoningText,
    ];
    return fields.map(extractTextValue).join('').trim();
  }

  // ── Chat completion ────────────────────────────────────────────────────────

  /**
   * Send messages to the LLM and return the assistant's reply.
   * @param {Array<{role, content}>} messages
   * @returns {Promise<{content: string, error: string|null, usage: object|null}>}
   */
  async function chat(messages) {
    if (!isConfigured()) {
      return {
        content: null,
        error: 'API key is not configured. Set aiChat.apiKey, or set aiChat.allowNoApiKey=true when using a proxy.',
        usage: null,
      };
    }

    const endpoint = buildEndpoint();
    const body = JSON.stringify({
      model:       _config.model,
      messages,
      temperature: _config.temperature,
      max_tokens:  _config.maxTokens,
    });

    try {
      const headers = { 'Content-Type':  'application/json' };
      if (_config.sendAuthorizationHeader && _config.apiKey) {
        headers.Authorization = `Bearer ${_config.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method:  'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        let hint = `HTTP ${response.status}`;
        if (response.status === 401) hint = 'Invalid API key (401 Unauthorized).';
        if (response.status === 429) hint = 'Rate limit exceeded (429). Please try again shortly.';
        if (response.status === 400) hint = `Bad request (400). ${errBody.slice(0, 200)}`;
        return { content: null, error: hint, usage: null };
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message || {};
      const content = extractTextValue(message.content || '');
      const reasoning = extractReasoningFromMessage(message);
      const usage   = data.usage || null;
      return { content: content.trim(), reasoning, error: null, usage };

    } catch (e) {
      let error = 'Network error. Please check your connection.';
      if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
        error = 'Cannot reach the API. This may be a CORS restriction or network issue.';
      }
      return { content: null, reasoning: '', error, usage: null };
    }
  }

  async function chatStream(messages, handlers) {
    if (!isConfigured()) {
      return {
        content: null,
        reasoning: '',
        error: 'API key is not configured. Set aiChat.apiKey, or set aiChat.allowNoApiKey=true when using a proxy.',
        usage: null,
      };
    }

    const endpoint = buildEndpoint();
    const body = JSON.stringify({
      model:       _config.model,
      messages,
      temperature: _config.temperature,
      max_tokens:  _config.maxTokens,
      stream: true,
    });

    let contentBuffer = '';
    let reasoningBuffer = '';
    let usage = null;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (_config.sendAuthorizationHeader && _config.apiKey) {
        headers.Authorization = `Bearer ${_config.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        let hint = `HTTP ${response.status}`;
        if (response.status === 401) hint = 'Invalid API key (401 Unauthorized).';
        if (response.status === 429) hint = 'Rate limit exceeded (429). Please try again shortly.';
        if (response.status === 400) hint = `Bad request (400). ${errBody.slice(0, 200)}`;
        return { content: null, reasoning: '', error: hint, usage: null };
      }

      if (!response.body) {
        return { content: null, reasoning: '', error: 'Streaming is not supported by this browser/provider response.', usage: null };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') continue;

          let eventData;
          try {
            eventData = JSON.parse(payload);
          } catch (e) {
            continue;
          }

          if (eventData.usage) usage = eventData.usage;

          const delta = eventData.choices?.[0]?.delta || {};

          const contentDelta = extractTextValue(delta.content);
          if (contentDelta) {
            contentBuffer += contentDelta;
            if (handlers && typeof handlers.onContentDelta === 'function') {
              handlers.onContentDelta(contentDelta, contentBuffer);
            }
          }

          const reasoningDelta = [
            extractTextValue(delta.reasoning),
            extractTextValue(delta.reasoning_content),
            extractTextValue(delta.thinking),
          ].join('');

          if (reasoningDelta) {
            reasoningBuffer += reasoningDelta;
            if (handlers && typeof handlers.onReasoningDelta === 'function') {
              handlers.onReasoningDelta(reasoningDelta, reasoningBuffer);
            }
          }
        }
      }

      if (handlers && typeof handlers.onDone === 'function') {
        handlers.onDone({ content: contentBuffer, reasoning: reasoningBuffer, usage });
      }

      return {
        content: contentBuffer.trim(),
        reasoning: reasoningBuffer,
        error: null,
        usage,
      };
    } catch (e) {
      let error = 'Network error. Please check your connection.';
      if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
        error = 'Cannot reach the API. This may be a CORS restriction or network issue.';
      }
      return { content: null, reasoning: '', error, usage: null };
    }
  }

  return { init, chat, chatStream, isConfigured };
})();
