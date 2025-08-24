const puppeteer = require('puppeteer');

async function debugTest() {
  console.log('🔍 Starting debug test...');
  
  try {
    console.log('1. Testing Puppeteer launch with headless mode...');
    const browser = await puppeteer.launch({
      headless: true, // Use headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    console.log('✅ Browser launched successfully');
    
    console.log('2. Testing page creation...');
    const page = await browser.newPage();
    console.log('✅ Page created successfully');
    
    console.log('3. Testing navigation...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✅ Navigation successful');
    
    console.log('4. Testing screenshot...');
    await page.screenshot({ path: './debug-screenshot.png' });
    console.log('✅ Screenshot taken successfully');
    
    console.log('5. Closing browser...');
    await browser.close();
    console.log('✅ Browser closed successfully');
    
    console.log('🎉 All debug tests passed!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Try alternative approach
    console.log('\n🔄 Trying alternative browser configuration...');
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('✅ Alternative browser launch successful');
      await browser.close();
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError.message);
    }
  }
}

debugTest();
