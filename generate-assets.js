const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function createIcon() {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#020612';
  ctx.fillRect(0, 0, 1024, 1024);

  // Outer glow ring - Gold
  ctx.strokeStyle = '#FFB800';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(512, 512, 470, 0, Math.PI * 2);
  ctx.stroke();

  // Middle ring - Blue
  ctx.strokeStyle = '#1E64FF';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(512, 512, 445, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle background
  ctx.fillStyle = '#060f2e';
  ctx.beginPath();
  ctx.arc(512, 512, 420, 0, Math.PI * 2);
  ctx.fill();

  // Motorcycle emoji
  ctx.font = '240px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏍️', 512, 400);

  // NEW badge
  ctx.fillStyle = '#1E64FF';
  ctx.beginPath();
  ctx.roundRect(362, 555, 300, 55, 28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N  E  W', 512, 592);

  // RAHUL - Big Gold
  ctx.fillStyle = '#FFB800';
  ctx.font = 'bold 110px Arial';
  ctx.fillText('RAHUL', 512, 700);

  // AUTO SPARES - Smaller Gold
  ctx.fillStyle = '#FFB800';
  ctx.font = 'bold 58px Arial';
  ctx.fillText('AUTO SPARES', 512, 775);

  // Divider line
  ctx.strokeStyle = 'rgba(255,184,0,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(312, 800);
  ctx.lineTo(712, 800);
  ctx.stroke();

  // Nandyal text
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '36px Arial';
  ctx.fillText('NANDYAL · AP', 512, 840);

  return canvas;
}

function createSplash() {
  const canvas = createCanvas(1284, 2778);
  const ctx = canvas.getContext('2d');

  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 2778);
  gradient.addColorStop(0, '#020612');
  gradient.addColorStop(0.4, '#060f2e');
  gradient.addColorStop(0.6, '#060f2e');
  gradient.addColorStop(1, '#020612');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1284, 2778);

  // Decorative top dots
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(30,100,255,${0.1 + i * 0.05})`;
    ctx.beginPath();
    ctx.arc(200 + i * 220, 400, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer gold ring
  ctx.strokeStyle = '#FFB800';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(642, 1200, 360, 0, Math.PI * 2);
  ctx.stroke();

  // Blue ring
  ctx.strokeStyle = '#1E64FF';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(642, 1200, 335, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle
  ctx.fillStyle = '#060f2e';
  ctx.beginPath();
  ctx.arc(642, 1200, 310, 0, Math.PI * 2);
  ctx.fill();

  // Motorcycle
  ctx.font = '220px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏍️', 642, 1190);

  // NEW badge
  ctx.fillStyle = '#1E64FF';
  ctx.beginPath();
  ctx.roundRect(492, 1560, 300, 65, 32);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N  E  W', 642, 1604);

  // RAHUL - Large Gold
  ctx.fillStyle = '#FFB800';
  ctx.font = 'bold 160px Arial';
  ctx.fillText('RAHUL', 642, 1740);

  // Divider
  ctx.strokeStyle = 'rgba(255,184,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(342, 1790);
  ctx.lineTo(942, 1790);
  ctx.stroke();

  // AUTO SPARES
  ctx.fillStyle = '#FFB800';
  ctx.font = 'bold 90px Arial';
  ctx.fillText('AUTO SPARES', 642, 1880);

  // Location
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '52px Arial';
  ctx.fillText('📍 Telugu Peta, Nandyal', 642, 1980);

  // Telugu welcome
  ctx.fillStyle = 'rgba(30,100,255,0.7)';
  ctx.font = '48px Arial';
  ctx.fillText('స్వాగతం · Welcome · स्वागत', 642, 2060);

  // Bottom decorative line
  ctx.strokeStyle = 'rgba(255,184,0,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(242, 2200);
  ctx.lineTo(1042, 2200);
  ctx.stroke();

  // Phone number
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '40px Arial';
  ctx.fillText('📞 08514-244944', 642, 2260);

  return canvas;
}

// Save files
const assetsDir = path.join(__dirname, 'assets');

const iconCanvas = createIcon();
const iconBuffer = iconCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuffer);
console.log('✅ icon.png created!');

const splashCanvas = createSplash();
const splashBuffer = splashCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), splashBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), iconBuffer);
console.log('✅ splash-icon.png created!');
console.log('✅ adaptive-icon.png created!');
console.log('\n🎉 NEW RAHUL AUTO SPARES branding done!');
console.log('🏍️ Professional look activated!');