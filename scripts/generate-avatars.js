// Script to generate avatar SVGs
const fs = require('fs');
const path = require('path');

const colors = [
  '#6c63ff','#8b5cf6','#ec4899','#22d3a0','#fbbf24',
  '#38bdf8','#f87171','#a78bfa','#34d399','#fb923c',
  '#06b6d4','#d946ef','#10b981','#f59e0b','#3b82f6',
  '#ef4444','#14b8a6','#f97316','#84cc16','#e879f9'
];

const avatarDir = path.join(__dirname, '..', 'public', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

for (let i = 1; i < 20; i++) {
  const color = colors[i % colors.length];
  const letter = String.fromCharCode(65 + i);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="50" fill="${color}"/>
  <circle cx="50" cy="38" r="18" fill="white" opacity="0.85"/>
  <ellipse cx="50" cy="80" rx="28" ry="20" fill="white" opacity="0.85"/>
  <text x="50" y="46" font-family="Arial" font-size="16" fill="${color}" text-anchor="middle" font-weight="bold">${letter}</text>
</svg>`;
  fs.writeFileSync(path.join(avatarDir, `avatar_${i}.svg`), svg);
}
console.log('Generated 19 avatars (avatar_1 through avatar_19)');
