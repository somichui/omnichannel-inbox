const fetch = require('node-fetch');

async function checkVercel() {
  const url = 'https://omnichannel-inbox-one.vercel.app';
  const res = await fetch(url);
  const html = await res.text();
  
  // Find script tags
  const scriptRegex = /<script src="([^"]+)"/g;
  let match;
  let found = false;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptUrl = url + (match[1].startsWith('/') ? '' : '/') + match[1];
    const scriptRes = await fetch(scriptUrl);
    const scriptContent = await scriptRes.text();
    
    if (scriptContent.includes('direction==="OUTBOUND"') || scriptContent.includes('direction==="OUTGOING"')) {
      console.log(`Found direction logic in ${scriptUrl}`);
      if (scriptContent.includes('direction==="OUTBOUND"')) {
        console.log('✅ It has OUTBOUND');
      }
      if (scriptContent.includes('direction==="OUTGOING"')) {
        console.log('❌ It still has OUTGOING');
      }
      found = true;
    }
  }
  if (!found) console.log('Could not find the direction logic in the scripts.');
}

checkVercel();
