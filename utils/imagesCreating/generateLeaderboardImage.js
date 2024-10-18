const {createCanvas,registerFont,loadImage} = require('canvas');
const path = require('path'); // Import path to handle local file paths
const {AttachmentBuilder} = require("discord.js")
// Independent function to generate leaderboard image
registerFont(path.join(__dirname, '../../public/fonts',"Noto-sans.ttf"), { family: 'myCustomFont' });
async function generateBalancedLeaderboardImage(users) {
    const width = 900; // Canvas width
    const height = 150 + (users.length * 80) + 100; // Adjust height based on users and space for logo
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0e2620'); // Very dark blue
    gradient.addColorStop(1, '#0f2526'); // Black
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Title Styling
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px myCustomFont';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillText('🏆 Top Players', width / 2 - ctx.measureText('🏆 Top Players').width / 2, 80);

    // Reset shadow for following elements
    ctx.shadowBlur = 0;

    // Player display variables
    const avatarSize = 60;
    const startY = 150;
    const spacing = 80;

    // X positions for rank, name, and points
    const rankX = 50;
    const avatarX = 150;
    const pointsX = 700; // Right-side for points

    // Loop through each user and display their data
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const yPos = startY + i * spacing;

        // Draw user's rank with bold font
        ctx.fillStyle = '#ffd700'; // Gold color for the rank
        ctx.font = 'bold 35px myCustomFont';
        ctx.fillText(`#${i + 1}`, rankX, yPos + avatarSize / 2 + 15);

        // Draw user's avatar (loading it from the avatar URL)
        const avatar = await loadImage(user.avatarURL);
        ctx.save(); // Save current context state
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, yPos + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); // Circular avatar
        ctx.closePath();
        ctx.clip(); // Clip the avatar within the circle
        ctx.drawImage(avatar, avatarX, yPos, avatarSize, avatarSize);
        ctx.restore(); // Restore context state

        // Center the username between rank and points
        const nameXStart = avatarX + avatarSize + 30; // Space after avatar
        const nameXEnd = pointsX - 30; // Space before points
        const nameXCenter = (nameXStart + nameXEnd) / 2;

        // Measure the width of the username to center it
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px myCustomFont';
        const nameWidth = ctx.measureText(user.username).width;
        const nameXPosition = nameXCenter - nameWidth / 2; // Center the name

        // Draw user's name
        ctx.fillText(user.username, nameXPosition, yPos + avatarSize / 2 + 15);

        // Draw subtle divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nameXStart, yPos + avatarSize / 2 + 25);
        ctx.lineTo(nameXEnd, yPos + avatarSize / 2 + 25);
        ctx.stroke();

        // Draw user's points with a brighter color for contrast
        ctx.fillStyle = '#00ff99'; // Neon green for points
        ctx.font = 'bold 30px myCustomFont';
        ctx.fillText(`${user.points} P`, pointsX, yPos + avatarSize / 2 + 15);
    }

    console.log(users)

    // Get the bot logo from the public folder
    const path = require('path');
    const botLogoPath = path.join(__dirname, '..', '..', 'public', 'images', 'logo.jpg');
    

    // Load and draw the bot logo at the bottom center
    const botLogo = await loadImage(botLogoPath);
    const logoWidth = 80;
    const logoHeight = 80;
    const logoX = width / 2 - logoWidth / 2; // Center the logo horizontally
    const logoY = height - logoHeight - 20; // 20px padding from the bottom

    // Draw the bot logo as a circular image
    ctx.save(); // Save current context state
    ctx.beginPath();
    ctx.arc(logoX + logoWidth / 2, logoY + logoHeight / 2, logoWidth / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip(); // Clip the logo within the circle
    ctx.drawImage(botLogo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore(); // Restore context state

    // Return the image buffer
    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'image.png' });
    return attachment;
}




module.exports = { generateBalancedLeaderboardImage };