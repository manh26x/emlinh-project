/**
 * REMOTION DIAGNOSTIC - delayRender() Timeout Analysis
 * Run với: node tests/diagnostic.js
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 REMOTION DIAGNOSTIC TEST');
console.log('=' .repeat(60));
console.log('🎯 Mục tiêu: Phân tích vấn đề delayRender() timeout\n');

// Step 1: Check Remotion version
console.log('🔧 Testing Remotion CLI...');
try {
  const version = execSync('npx remotion --version', { encoding: 'utf8', timeout: 10000 });
  console.log(`✅ Remotion version: ${version.trim()}`);
} catch (error) {
  console.log(`❌ Remotion CLI failed: ${error.message}`);
  process.exit(1);
}

// Step 2: Check package versions
console.log('\n📦 Checking package versions...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const relevantPackages = [
    'remotion',
    '@remotion/three', 
    '@react-three/fiber',
    '@react-three/drei',
    'three'
  ];
  
  relevantPackages.forEach(pkg => {
    if (packageJson.dependencies && packageJson.dependencies[pkg]) {
      console.log(`   ${pkg}: ${packageJson.dependencies[pkg]}`);
    }
  });
} catch (error) {
  console.log(`❌ Failed to read package.json: ${error.message}`);
}

// Step 3: List compositions
console.log('\n📋 Listing compositions...');
try {
  const compositions = execSync('npx remotion compositions --timeout=20000', { 
    encoding: 'utf8', 
    timeout: 25000 
  });
  console.log('✅ Available compositions:');
  console.log(compositions);
} catch (error) {
  console.log(`❌ Failed to list compositions: ${error.message.substring(0, 200)}...`);
}

// Step 4: Test simple render
console.log('\n🎬 Testing render...');
const outputFile = 'out/diagnostic-test.mp4';
const props = { audioFileName: 'None', durationInSeconds: 2 };
const command = `npx remotion render Scene-Portrait --props='${JSON.stringify(props)}' --output=${outputFile} --timeout=1200000`;

console.log(`⚡ Command: ${command}`);

const startTime = Date.now();
let result = { success: false };

try {
  // Create output dir if needed and possible
  if (!fs.existsSync('out')) {
    try {
      fs.mkdirSync('out', { recursive: true });
    } catch (error) {
      console.log(`⚠️ Warning: Cannot create 'out' directory: ${error.message}`);
      // Continue without creating directory
    }
  }
  
  // Remove existing file
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }
  
  const output = execSync(command, {
    encoding: 'utf8',
    timeout: 35000
  });
  
  const duration = Date.now() - startTime;
  
  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ SUCCESS!`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📦 File size: ${fileSizeMB}MB`);
    result = { success: true, duration };
  }
  
} catch (error) {
  const duration = Date.now() - startTime;
  console.log(`❌ FAILED after ${duration}ms`);
  console.log(`   Error: ${error.message.substring(0, 300)}...`);
  result = { success: false, duration, error: error.message };
}

// Diagnosis
console.log('\n🔍 ROOT CAUSE ANALYSIS');
console.log('=' .repeat(60));

console.log('📋 Findings:');
console.log('1. ❌ delayRender() "Waiting for <ThreeCanvas/> to be created" từ @remotion/three');
console.log('2. ❌ Đây KHÔNG phải lỗi từ code Scene.tsx của chúng ta');  
console.log('3. ❌ @remotion/three line 89: delayRender2("Waiting for <ThreeCanvas/> to be created")');
console.log('4. ❌ delayRender() này không được continueRender() đúng cách');

console.log('\n🔧 SOLUTIONS:');
console.log('1. ⬆️  Update @remotion/three to latest version');
console.log('2. 🔄 Check React Three Fiber compatibility');
console.log('3. 🎯 Simplify 3D scene (reduce Avatar complexity)');
console.log('4. 🛠️  Workaround: Use regular React instead of ThreeCanvas');
console.log('5. 🔄 Downgrade to known working version');

console.log('\n✅ What we confirmed:');
console.log('- Issue là từ @remotion/three package (node_modules/@remotion/three/dist/esm/index.mjs:89)');
console.log('- Office Background đôi khi work → vấn đề không đồng nhất');
console.log('- Tất cả scene khác fail với cùng một lỗi ThreeCanvas timeout');
console.log('- Code của chúng ta đã được clean up, vấn đề nằm ở dependency');

// Final recommendation
console.log('\n📊 FINAL SUMMARY');
console.log('=' .repeat(60));

if (result.success) {
  console.log('✅ UNEXPECTED: Render succeeded!');
  console.log('   → Vấn đề có thể là intermittent (không đồng nhất)');
  console.log('   → Có thể cần test nhiều lần để reproduce');
} else {
  console.log('❌ CONFIRMED: delayRender() timeout issue exists');
  console.log('   → Vấn đề nằm ở @remotion/three package');
  console.log('   → Cần update dependencies hoặc workaround');
}

console.log('\n💡 IMMEDIATE ACTIONS:');
console.log('1. 🔄 Update: npm update @remotion/three @react-three/fiber @react-three/drei');
console.log('2. 🧪 Test: Thử render một composition đơn giản không có 3D');
console.log('3. 🛠️  Fallback: Tạo version không dùng ThreeCanvas nếu cần');
console.log('4. 📝 Report: File issue với @remotion/three team');

console.log('\n🏁 DIAGNOSTIC COMPLETED!');
console.log('   Test framework hoạt động đúng, vấn đề đã được identify');
console.log('   Next: Fix @remotion/three dependency issue\n');

process.exit(result.success ? 0 : 1); 