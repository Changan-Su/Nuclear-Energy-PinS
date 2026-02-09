// AI Chat module - exposed for re-initialization after dynamic rendering
window.AIChat = (function() {
  'use strict';

  let initialized = false;

  function init() {
    if (initialized) return; // Prevent double initialization
    
    const chatContainer = document.getElementById('chat-messages');
    const inputField = document.querySelector('#ai-chat input');
    const sendBtn = document.querySelector('#ai-chat button i[data-lucide="arrow-up"]')?.parentElement;
    const navChatBtn = document.getElementById('nav-chat-btn');

    if (!chatContainer || !inputField || !sendBtn) {
      // AI chat section not rendered yet
      return;
    }

    initialized = true;

    // Scroll to bottom of chat
    const scrollToBottom = () => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    // Add Message Function
    const addMessage = (content, isUser = false) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = isUser ? 'flex gap-4 items-start justify-end' : 'flex gap-4 items-start';
      
      const avatar = isUser ? '' : `
        <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
        </div>
      `;

      const bubbleClass = isUser 
        ? 'bg-accent-blue p-5 rounded-l-[20px] rounded-br-[20px] max-w-[600px] border border-white/5' 
        : 'bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5';

      messageDiv.innerHTML = `
        ${!isUser ? avatar : ''}
        <div class="${bubbleClass}">
          <p class="text-white text-base leading-relaxed">${content}</p>
        </div>
      `;

      chatContainer.appendChild(messageDiv);
      if (window.lucide) {
        window.lucide.createIcons();
      }
      scrollToBottom();
    };

    // Handle Send
    const handleSend = async () => {
      const text = inputField.value.trim();
      if (!text) return;

      // User Message
      addMessage(text, true);
      inputField.value = '';

      // Simulate AI Thinking/Response
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'flex gap-4 items-start';
      typingIndicator.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-accent-cyan flex items-center justify-center flex-shrink-0">
          <i data-lucide="sparkles" class="w-5 h-5 text-black"></i>
        </div>
        <div class="bg-surface-darker p-5 rounded-r-[20px] rounded-bl-[20px] max-w-[600px] border border-white/5 flex items-center gap-2">
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
          <span class="w-2 h-2 bg-white/60 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
        </div>
      `;
      chatContainer.appendChild(typingIndicator);
      if (window.lucide) {
        window.lucide.createIcons();
      }
      scrollToBottom();

      // Simulate API delay
      setTimeout(() => {
        chatContainer.removeChild(typingIndicator);
        addMessage("I am a simulation of the Nuclear Physics Expert AI. I can answer questions about SMRs, fusion, and reactor safety mechanisms.");
      }, 1500);
    };

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Nav Button Scroll to Chat
    if (navChatBtn) {
      navChatBtn.addEventListener('click', () => {
        const aiChatSection = document.getElementById('ai-chat');
        if (aiChatSection) {
          aiChatSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  function reset() {
    initialized = false;
  }

  return {
    init,
    reset
  };
})();

// Don't auto-initialize - let section-renderer handle it after DOM is rendered
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => {
//     window.AIChat.init();
//   });
// } else {
//   window.AIChat.init();
// }
