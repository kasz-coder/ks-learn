const QUIZ_SCRIPT = `<script>
(function(){
  var quizzes = document.querySelectorAll('.quiz');
  quizzes.forEach(function(quiz) {
    var options = quiz.querySelectorAll('.q');
    var feedback = quiz.querySelector('.quiz-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'quiz-feedback';
      feedback.style.cssText = 'margin-top:0.75rem;padding:0.75rem;border-radius:6px;font-size:0.9rem;display:none;';
      quiz.appendChild(feedback);
    }
    var answered = false;
    options.forEach(function(opt) {
      opt.style.cursor = 'pointer';
      opt.addEventListener('click', function() {
        if (answered) return;
        answered = true;
        var isCorrect = opt.getAttribute('data-correct') === 'true';
        options.forEach(function(o) {
          if (o.getAttribute('data-correct') === 'true') {
            o.style.background = '#f0fdf4';
            o.style.borderColor = '#22c55e';
            o.style.color = '#166534';
          } else {
            o.style.opacity = '0.5';
          }
        });
        if (isCorrect) {
          feedback.textContent = 'Correct!';
          feedback.style.background = '#f0fdf4';
          feedback.style.color = '#166534';
          feedback.style.border = '1px solid #bbf7d0';
        } else {
          feedback.textContent = 'Not quite. The correct answer is highlighted in green.';
          feedback.style.background = '#fef2f2';
          feedback.style.color = '#991b1b';
          feedback.style.border = '1px solid #fecaca';
        }
        feedback.style.display = 'block';
      });
    });
  });
})();
</script>`

export function injectQuizScript(html: string): string {
  if (!html.includes('class="quiz"') && !html.includes("class='quiz'")) {
    return html
  }
  if (html.includes('quiz-feedback')) {
    return html
  }
  const scriptIndex = html.lastIndexOf('</body>')
  if (scriptIndex === -1) return html + QUIZ_SCRIPT
  return html.slice(0, scriptIndex) + QUIZ_SCRIPT + html.slice(scriptIndex)
}
