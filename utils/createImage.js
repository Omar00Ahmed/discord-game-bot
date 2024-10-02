const {AttachmentBuilder} = require("discord.js")

const { createCanvas,registerFont } = require('canvas');


const path = require('path');

// Register the custom Google font
registerFont(path.join(__dirname, '../public/fonts', 'Rubik-SemiBold.ttf'), { family: 'Rubik' });

async function createImage(text) {
    const canvas = createCanvas(500, 250);
    const ctx = canvas.getContext('2d');

    // Set background to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Function to wrap text and calculate font size
    function wrapTextAndCalculateFontSize(context, text, x, y, maxWidth, maxHeight) {
        let fontSize = 40;
        let lineHeight = fontSize * 1.2;
        let lines = [];

        // Reduce font size until text fits
        while (fontSize > 10) {
            context.font = `bold ${fontSize}px Rubik`;
            lines = [];
            let line = '';
            const words = text.split(' ');

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            if (lines.length * lineHeight <= maxHeight) {
                break;
            }

            fontSize--;
            lineHeight = fontSize * 1.2;
        }

        return { lines, fontSize, lineHeight };
    }

    // Calculate font size and wrap text
    const maxWidth = 450;
    const maxHeight = 230;
    const { lines, fontSize, lineHeight } = wrapTextAndCalculateFontSize(ctx, text, canvas.width / 2, canvas.height / 2, maxWidth, maxHeight);

    // Set text properties
    ctx.font = `bold ${fontSize}px Rubik`;
    ctx.fillStyle = '#ffffff'; // White text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    const totalHeight = lines.length * lineHeight;
    const startY = canvas.height / 2 - (totalHeight / 2) + (lineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], canvas.width / 2, startY + (i * lineHeight));
    }

    // Convert the canvas to a buffer
    const buffer = canvas.toBuffer();

    // Create an attachment with the buffer
    const attachment = new AttachmentBuilder(buffer, { name: 'image.png' });
    
    return attachment;
}

module.exports = {
    createImage
};