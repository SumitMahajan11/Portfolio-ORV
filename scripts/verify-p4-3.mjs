import http from 'node:http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('====================================================');
  console.log('PHASE 4-3 VERIFICATION SUITE');
  console.log('====================================================\n');

  const results = {};

  // 1. Robots.txt
  const robots = await get('http://localhost:3005/robots.txt');
  console.log(`[1] robots.txt (status ${robots.status})`);
  console.log(robots.body.trim());
  const robotsValid = robots.status === 200 &&
    robots.body.includes('Allow: /') &&
    robots.body.includes('Allow: /skip') &&
    robots.body.includes('Allow: /wanted') &&
    robots.body.includes('Disallow: /true-ending') &&
    robots.body.includes('Disallow: /dev/') &&
    robots.body.includes('Disallow: /style-test') &&
    robots.body.includes('Disallow: /api/') &&
    robots.body.includes('sitemap.xml');
  results.robots = robotsValid ? 'PASS' : 'FAIL';

  // 2. Sitemap.xml
  const sitemap = await get('http://localhost:3005/sitemap.xml');
  console.log(`\n[2] sitemap.xml (status ${sitemap.status})`);
  console.log(sitemap.body.trim());
  const sitemapValid = sitemap.status === 200 &&
    sitemap.body.includes('<loc>http://localhost:3000</loc>') &&
    sitemap.body.includes('<loc>http://localhost:3000/skip</loc>') &&
    sitemap.body.includes('<loc>http://localhost:3000/wanted</loc>') &&
    !sitemap.body.includes('/true-ending') &&
    !sitemap.body.includes('/dev') &&
    !sitemap.body.includes('/style-test') &&
    !sitemap.body.includes('/api');
  results.sitemap = sitemapValid ? 'PASS' : 'FAIL';

  // 3. icon.svg
  const icon = await get('http://localhost:3005/icon.svg');
  console.log(`\n[3] icon.svg (status ${icon.status}, type: ${icon.headers['content-type']})`);
  results.iconSvg = (icon.status === 200 && icon.headers['content-type']?.includes('image/svg')) ? 'PASS' : 'FAIL';

  // 4. /favicon.ico rewrite
  const favicon = await get('http://localhost:3005/favicon.ico');
  console.log(`\n[4] /favicon.ico (status ${favicon.status}, type: ${favicon.headers['content-type']})`);
  results.faviconIco = (favicon.status === 200 && favicon.headers['content-type']?.includes('image/svg')) ? 'PASS' : 'FAIL';

  // 5. apple-icon
  const appleIcon = await get('http://localhost:3005/apple-icon');
  console.log(`\n[5] apple-icon (status ${appleIcon.status}, type: ${appleIcon.headers['content-type']})`);
  results.appleIcon = (appleIcon.status === 200 && appleIcon.headers['content-type']?.includes('image/png')) ? 'PASS' : 'FAIL';

  // 6. opengraph-image
  const ogImg = await get('http://localhost:3005/opengraph-image');
  console.log(`\n[6] opengraph-image (status ${ogImg.status}, type: ${ogImg.headers['content-type']})`);
  results.opengraphImage = (ogImg.status === 200 && ogImg.headers['content-type']?.includes('image/png')) ? 'PASS' : 'FAIL';

  // 7. Root HTML Metadata and JSON-LD
  const root = await get('http://localhost:3005/');
  console.log(`\n[7] Root HTML metadata check (status ${root.status})`);
  
  const hasTitle = root.body.includes('<title>Sumit Mahajan — Distributed Systems &amp; Correctness</title>');
  const hasDesc = root.body.includes('name="description"') && root.body.includes('Pimpri Chinchwad University');
  const hasCanonical = root.body.includes('<link rel="canonical" href="http://localhost:3000"/>');
  const hasOgTitle = root.body.includes('property="og:title"');
  const hasOgDesc = root.body.includes('property="og:description"');
  const hasOgImage = root.body.includes('property="og:image"');
  const hasTwitterCard = root.body.includes('name="twitter:card"');
  const hasTwitterTitle = root.body.includes('name="twitter:title"');
  const hasTwitterImage = root.body.includes('name="twitter:image"');
  const hasIconLink = root.body.includes('rel="icon" href="/icon.svg"');
  const hasAppleIconLink = root.body.includes('rel="apple-touch-icon" href="/apple-icon"');

  console.log(`  hasTitle: ${hasTitle}`);
  console.log(`  hasDesc: ${hasDesc}`);
  console.log(`  hasCanonical: ${hasCanonical}`);
  console.log(`  hasOgTitle: ${hasOgTitle}`);
  console.log(`  hasOgDesc: ${hasOgDesc}`);
  console.log(`  hasOgImage: ${hasOgImage}`);
  console.log(`  hasTwitterCard: ${hasTwitterCard}`);
  console.log(`  hasTwitterTitle: ${hasTwitterTitle}`);
  console.log(`  hasTwitterImage: ${hasTwitterImage}`);
  console.log(`  hasIconLink: ${hasIconLink}`);
  console.log(`  hasAppleIconLink: ${hasAppleIconLink}`);

  // JSON-LD Person schema check
  let personSchemaValid = false;
  const jsonLdMatch = root.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      console.log('\nParsed JSON-LD Schema:');
      console.log(JSON.stringify(parsed, null, 2));

      const noPrivacyLeak = !parsed.email && !parsed.telephone && !parsed.address &&
        !jsonLdMatch[1].toLowerCase().includes('email') &&
        !jsonLdMatch[1].toLowerCase().includes('phone') &&
        !jsonLdMatch[1].toLowerCase().includes('address');

      const correctFields = parsed['@type'] === 'Person' &&
        parsed.name === 'Sumit Mahajan' &&
        parsed.url === 'http://localhost:3000' &&
        Array.isArray(parsed.sameAs) &&
        parsed.sameAs.includes('https://github.com/SumitMahajan11');

      personSchemaValid = noPrivacyLeak && correctFields;
    } catch (err) {
      console.error('Failed to parse JSON-LD:', err);
    }
  }
  console.log(`  personSchemaValid: ${personSchemaValid}`);

  results.meta = (hasTitle && hasDesc && hasCanonical && hasOgTitle && hasOgDesc &&
                  hasOgImage && hasTwitterCard && hasTwitterTitle && hasTwitterImage &&
                  hasIconLink && hasAppleIconLink && personSchemaValid) ? 'PASS' : 'FAIL';

  // 8. 404 Page (Biyoo ORV voice)
  const notFound = await get('http://localhost:3005/some-non-existent-scenario-slug');
  console.log(`\n[8] 404 Page (status ${notFound.status})`);
  const notFoundValid = notFound.status === 404 &&
    notFound.body.includes('[SYSTEM: SCENARIO_404]') &&
    notFound.body.includes('This page does not exist in any Scenario.');
  console.log(`  notFoundValid: ${notFoundValid}`);
  results.notFound = notFoundValid ? 'PASS' : 'FAIL';

  console.log('\n====================================================');
  console.log('RESULTS SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');

  const allPassed = Object.values(results).every(v => v === 'PASS');
  if (allPassed) {
    console.log('\n>>> ALL CHECKS PASSED SUCCESSFULLY! <<<');
    process.exit(0);
  } else {
    console.error('\n>>> SOME CHECKS FAILED! <<<');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
