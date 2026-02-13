/**
 * Quiz Engine - Handles quiz rendering, interaction, and scoring
 * Supports: Multiple Choice, True/False, Fill-in-blank, Short Answer
 */

window.QuizEngine = (function() {
  'use strict';

  const quizzes = new Map();

  function initAll() {
    const containers = document.querySelectorAll('[data-quiz-id]');
    containers.forEach(container => {
      const quizId = container.getAttribute('data-quiz-id');
      init(quizId, container);
    });
  }

  function init(quizId, container) {
    const material = window.SectionRenderer ? window.SectionRenderer.getMaterial() : null;
    if (!material) {
      console.warn('Material not available for quiz');
      return;
    }

    const quizData = material.index?.[quizId];
    if (!quizData || !quizData.questions) {
      console.warn(`No quiz data found for ${quizId}`);
      return;
    }

    const quiz = {
      id: quizId,
      data: quizData,
      container,
      answers: {},
      submitted: false
    };

    quizzes.set(quizId, quiz);
    render(quiz);
  }

  function render(quiz) {
    const { data, container } = quiz;
    const { questions } = data;

    let html = '<div class="quiz-questions flex flex-col gap-8">';

    questions.forEach((q, i) => {
      html += renderQuestion(q, i, quiz);
    });

    html += `
      </div>
      <div class="mt-12 flex items-center justify-between">
        <button class="quiz-submit px-8 py-4 rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors" onclick="QuizEngine.submit('${quiz.id}')">
          Submit Answers
        </button>
        <div class="quiz-score hidden">
          <span class="text-2xl font-semibold text-white"></span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderQuestion(question, index, quiz) {
    const qNum = index + 1;
    
    switch (question.type) {
      case 'mc':
        return renderMultipleChoice(question, qNum, quiz.id);
      case 'tf':
        return renderTrueFalse(question, qNum, quiz.id);
      case 'fill':
        return renderFillInBlank(question, qNum, quiz.id);
      case 'short':
        return renderShortAnswer(question, qNum, quiz.id);
      default:
        return '';
    }
  }

  function renderMultipleChoice(q, qNum, quizId) {
    const options = q.options || [];
    
    const optionsHtml = options.map((opt, i) => `
      <label class="flex items-center gap-3 p-4 rounded-lg bg-surface-darker border border-white/10 cursor-pointer hover:border-accent-cyan/50 transition-colors quiz-option">
        <input type="radio" name="q${qNum}" value="${i}" class="w-5 h-5 accent-accent-cyan" onchange="QuizEngine.recordAnswer('${quizId}', ${qNum - 1}, ${i})">
        <span class="text-white">${opt}</span>
      </label>
    `).join('');

    return `
      <div class="quiz-question" data-question="${qNum - 1}">
        <h3 class="text-2xl font-semibold text-white mb-4">${qNum}. ${q.question}</h3>
        <div class="flex flex-col gap-3">
          ${optionsHtml}
        </div>
        <div class="quiz-feedback hidden mt-4 p-4 rounded-lg"></div>
      </div>
    `;
  }

  function renderTrueFalse(q, qNum, quizId) {
    return `
      <div class="quiz-question" data-question="${qNum - 1}">
        <h3 class="text-2xl font-semibold text-white mb-4">${qNum}. ${q.question}</h3>
        <div class="flex gap-4">
          <label class="flex items-center gap-3 p-4 rounded-lg bg-surface-darker border border-white/10 cursor-pointer hover:border-accent-cyan/50 transition-colors flex-1 quiz-option">
            <input type="radio" name="q${qNum}" value="true" class="w-5 h-5 accent-accent-cyan" onchange="QuizEngine.recordAnswer('${quizId}', ${qNum - 1}, true)">
            <span class="text-white">True</span>
          </label>
          <label class="flex items-center gap-3 p-4 rounded-lg bg-surface-darker border border-white/10 cursor-pointer hover:border-accent-cyan/50 transition-colors flex-1 quiz-option">
            <input type="radio" name="q${qNum}" value="false" class="w-5 h-5 accent-accent-cyan" onchange="QuizEngine.recordAnswer('${quizId}', ${qNum - 1}, false)">
            <span class="text-white">False</span>
          </label>
        </div>
        <div class="quiz-feedback hidden mt-4 p-4 rounded-lg"></div>
      </div>
    `;
  }

  function renderFillInBlank(q, qNum, quizId) {
    return `
      <div class="quiz-question" data-question="${qNum - 1}">
        <h3 class="text-2xl font-semibold text-white mb-4">${qNum}. ${q.question}</h3>
        <input 
          type="text" 
          class="w-full p-4 rounded-lg bg-surface-darker border border-white/10 text-white placeholder-white/40 focus:border-accent-cyan/50 outline-none transition-colors"
          placeholder="Your answer"
          onchange="QuizEngine.recordAnswer('${quizId}', ${qNum - 1}, this.value)"
        >
        <div class="quiz-feedback hidden mt-4 p-4 rounded-lg"></div>
      </div>
    `;
  }

  function renderShortAnswer(q, qNum, quizId) {
    return `
      <div class="quiz-question" data-question="${qNum - 1}">
        <h3 class="text-2xl font-semibold text-white mb-4">${qNum}. ${q.question}</h3>
        <textarea 
          class="w-full p-4 rounded-lg bg-surface-darker border border-white/10 text-white placeholder-white/40 focus:border-accent-cyan/50 outline-none transition-colors resize-none"
          rows="4"
          placeholder="Your answer"
          onchange="QuizEngine.recordAnswer('${quizId}', ${qNum - 1}, this.value)"
        ></textarea>
        <div class="quiz-feedback hidden mt-4 p-4 rounded-lg"></div>
      </div>
    `;
  }

  function recordAnswer(quizId, questionIndex, answer) {
    const quiz = quizzes.get(quizId);
    if (quiz) {
      quiz.answers[questionIndex] = answer;
    }
  }

  function submit(quizId) {
    const quiz = quizzes.get(quizId);
    if (!quiz || quiz.submitted) return;

    quiz.submitted = true;
    
    const { data, answers, container } = quiz;
    const { questions } = data;
    
    let correct = 0;
    let total = questions.length;

    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      const isCorrect = checkAnswer(q, userAnswer);
      
      if (isCorrect) correct++;
      
      // Show feedback
      showFeedback(container, i, isCorrect, q);
    });

    // Show score
    const scoreEl = container.querySelector('.quiz-score');
    const submitBtn = container.querySelector('.quiz-submit');
    
    if (scoreEl) {
      scoreEl.classList.remove('hidden');
      scoreEl.querySelector('span').textContent = `Score: ${correct}/${total}`;
    }
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Disable all inputs
    container.querySelectorAll('input, textarea').forEach(input => {
      input.disabled = true;
    });
  }

  function checkAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return false;
    }

    switch (question.type) {
      case 'mc':
        return userAnswer === question.answer;
      
      case 'tf':
        const userBool = userAnswer === true || userAnswer === 'true';
        return userBool === question.answer;
      
      case 'fill':
        const correct = question.answer.toLowerCase().trim();
        const user = String(userAnswer).toLowerCase().trim();
        return user === correct;
      
      case 'short':
        // Check for keywords
        if (question.keywords && Array.isArray(question.keywords)) {
          const userText = String(userAnswer).toLowerCase();
          const matches = question.keywords.filter(kw => 
            userText.includes(kw.toLowerCase())
          );
          return matches.length >= Math.ceil(question.keywords.length / 2);
        }
        return true; // Manual grading needed
      
      default:
        return false;
    }
  }

  function showFeedback(container, questionIndex, isCorrect, question) {
    const questionEl = container.querySelector(`[data-question="${questionIndex}"]`);
    if (!questionEl) return;

    const feedbackEl = questionEl.querySelector('.quiz-feedback');
    if (!feedbackEl) return;

    feedbackEl.classList.remove('hidden');
    
    if (isCorrect) {
      feedbackEl.classList.add('bg-green-900/30', 'border', 'border-green-500/50', 'text-green-400');
      feedbackEl.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5 inline mr-2"></i>Correct!';
    } else {
      feedbackEl.classList.add('bg-red-900/30', 'border', 'border-red-500/50', 'text-red-400');
      
      let correctAnswer = '';
      if (question.type === 'mc') {
        correctAnswer = question.options[question.answer];
      } else if (question.type === 'tf') {
        correctAnswer = question.answer ? 'True' : 'False';
      } else if (question.type === 'fill') {
        correctAnswer = question.answer;
      }
      
      feedbackEl.innerHTML = `<i data-lucide="x-circle" class="w-5 h-5 inline mr-2"></i>Incorrect. ${correctAnswer ? `Correct answer: ${correctAnswer}` : ''}`;
    }

    // Highlight the option
    const options = questionEl.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      if (isCorrect) {
        const input = opt.querySelector('input');
        if (input && input.checked) {
          opt.classList.add('border-green-500', 'bg-green-900/20');
        }
      } else {
        const input = opt.querySelector('input');
        if (input && input.checked) {
          opt.classList.add('border-red-500', 'bg-red-900/20');
        }
      }
    });

    // Reinitialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Public API
  return {
    initAll,
    init,
    recordAnswer,
    submit
  };
})();
