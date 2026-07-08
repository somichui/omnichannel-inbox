const fetch = require('node-fetch');

async function check() {
  const res = await fetch('https://omnichannel-inbox-1.onrender.com/inbox');
  const data = await res.json();
  const lastMessages = data.slice(-5);
  console.log(JSON.stringify(lastMessages.map(m => ({ text: m.text, direction: m.direction })), null, 2));
}

check();
