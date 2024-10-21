function getRandomPattern(length) {
    const availableNumbers = {
      1: [4, 5, 2],
      2: [1, 3, 4, 5, 6],
      3: [2, 5, 6],
      4: [1, 2, 5, 7, 8],
      5: [1, 2, 3, 4, 6, 7, 8, 9],
      6: [2, 3, 5, 8, 9],
      7: [4, 5, 8],
      8: [4, 5, 6, 7, 9],
      9: [5, 6, 8]
    };
    
    const pattern = [];
    while (pattern.length < length) {
      const lastNumber = pattern[pattern.length - 1];
      const availableJumps = lastNumber ? availableNumbers[lastNumber].filter(num => !pattern.includes(num)) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      
      if (availableJumps.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableJumps.length);
        pattern.push(availableJumps[randomIndex]);
      } else if (pattern.length > 0) {
        pattern.pop(); // Backtrack
      }
    }
    return pattern;
  }
  
  function createPatternImage(pattern) {
    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext("2d");
  
    // Set background
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, 300, 300);
  
    // Draw grid
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(i * 100, 0);
      ctx.lineTo(i * 100, 300);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 100);
      ctx.lineTo(300, i * 100);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  
    // Add rounded corners to grid cells with gaps
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 3;
    const radius = 20;
    const gap = 10;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = i * 100;
        const y = j * 100;
        ctx.beginPath();
        // Top-left corner
        ctx.moveTo(x + gap, y + radius);
        ctx.arcTo(x + gap, y + gap, x + radius, y + gap, radius);
        // Top-right corner
        ctx.moveTo(x + 100 - radius, y + gap);
        ctx.arcTo(x + 100 - gap, y + gap, x + 100 - gap, y + radius, radius);
        // Bottom-right corner
        ctx.moveTo(x + 100 - gap, y + 100 - radius);
        ctx.arcTo(x + 100 - gap, y + 100 - gap, x + 100 - radius, y + 100 - gap, radius);
        // Bottom-left corner
        ctx.moveTo(x + radius, y + 100 - gap);
        ctx.arcTo(x + gap, y + 100 - gap, x + gap, y + 100 - radius, radius);
        ctx.stroke();
      }
    }
  
    // Draw pattern
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < pattern.length; i++) {
      const x = ((pattern[i] - 1) % 3) * 100 + 50;
      const y = Math.floor((pattern[i] - 1) / 3) * 100 + 50;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  
    // Draw dots
    ctx.fillStyle = "#007bff";
    for (let i = 0; i < pattern.length; i++) {
      if(i === 0) {
          ctx.fillStyle = "#ff7b00";
      }else{
          ctx.fillStyle = "#007bff";
      }
      const x = ((pattern[i] - 1) % 3) * 100 + 50;
      const y = Math.floor((pattern[i] - 1) / 3) * 100 + 50;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  
    return canvas.toBuffer();
  }

module.exports = {
    getRandomPattern,
    createPatternImage
};