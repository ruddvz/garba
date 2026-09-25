const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/ruddvz/garba/pulls?state=all',
  headers: {
    'User-Agent': 'Node.js',
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const prs = JSON.parse(data);
    prs.forEach(pr => {
      console.log(`PR #${pr.number}: ${pr.title}`);
      console.log('BODY:', JSON.stringify(pr.body));
    });
  });
}).on('error', (e) => {
  console.error(e);
});
