const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');

const replies = [
  '嗯，我懂。',
  '你说得对。',
  '我在听。',
  '明白了。',
  '继续说吧。'
];

function addMessage(text, sender) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${sender}`;
  messageEl.innerHTML = `<p>${text}</p>`;
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function getRandomReply() {
  return replies[Math.floor(Math.random() * replies.length)];
}

sendBtn.addEventListener('click', () => {
  const text = userInput.value.trim();
  if (!text) return;
  
  addMessage(text, 'user');
  userInput.value = '';
  
  setTimeout(() => {
    addMessage(getRandomReply(), 'bot');
  }, 300);
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});