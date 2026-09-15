const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log("Launching puppeteer...");
        const browser = await puppeteer.launch({headless: "new"});
        const page = await browser.newPage();
        
        const imgUrl = 'file:///C:/Users/Zakarya/.gemini/antigravity/brain/e2b240fc-9543-40b7-b905-c5d30f25589b/media__1789168939801.png';
        
        const html = `
            <html>
                <body>
                    <img id="source" src="${imgUrl}" crossorigin="anonymous">
                </body>
            </html>
        `;
        
        await page.setContent(html);
        
        console.log("Evaluating image...");
        const result = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const img = document.getElementById('source');
                if (!img) return resolve('No image found');
                
                if (img.complete) {
                    processImage();
                } else {
                    img.onload = processImage;
                    img.onerror = () => resolve('Image load error');
                }

                function processImage() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imgData.data;
                    
                    let minX = canvas.width;
                    let minY = canvas.height;
                    let maxX = 0;
                    let maxY = 0;
                    
                    for (let y = 0; y < canvas.height / 2; y++) {
                        for (let x = Math.floor(canvas.width / 2); x < canvas.width; x++) {
                            const idx = (y * canvas.width + x) * 4;
                            const r = data[idx];
                            const g = data[idx+1];
                            const b = data[idx+2];
                            
                            if (b > r + 15 && b > g + 5 && b < 240 && r < 200 && r > 50) {
                                if (x < minX) minX = x;
                                if (y < minY) minY = y;
                                if (x > maxX) maxX = x;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                    
                    if (minX > maxX || minY > maxY) {
                        resolve('No blue pixels found');
                        return;
                    }
                    
                    minX = Math.max(0, minX - 5);
                    minY = Math.max(0, minY - 5);
                    maxX = Math.min(canvas.width, maxX + 5);
                    maxY = Math.min(canvas.height, maxY + 5);
                    
                    const width = maxX - minX;
                    const height = maxY - minY;
                    
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = width;
                    cropCanvas.height = height;
                    const cropCtx = cropCanvas.getContext('2d');
                    
                    cropCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                    
                    const cropData = cropCtx.getImageData(0, 0, width, height);
                    for (let i = 0; i < cropData.data.length; i += 4) {
                        const r = cropData.data[i];
                        const g = cropData.data[i+1];
                        const b = cropData.data[i+2];
                        if (r > 240 && g > 240 && b > 240) {
                            cropData.data[i+3] = 0; 
                        }
                    }
                    cropCtx.putImageData(cropData, 0, 0);
                    
                    resolve(cropCanvas.toDataURL('image/png'));
                }
            });
        });
        
        await browser.close();
        
        if (result && result.startsWith('data:image')) {
            let serverJs = fs.readFileSync('z:/إجازات مرضية/seha-sickleave-app/server.js', 'utf8');
            const targetRegex = /<svg [^>]*style="position:absolute;top:(15|20)px;right:0px;[^>]*>.*?<\/svg>/s;
            const newImg = '<img src="' + result + '" style="position:absolute;top:15px;right:15px;width:260px;height:auto;opacity:0.8;">';
            
            if (targetRegex.test(serverJs)) {
                serverJs = serverJs.replace(targetRegex, newImg);
                fs.writeFileSync('z:/إجازات مرضية/seha-sickleave-app/server.js', serverJs, 'utf8');
                console.log("Successfully extracted image and updated server.js!");
            } else {
                console.log("Could not find the SVG tag to replace.");
            }
        } else {
            console.log("Failed: " + result);
        }
    } catch (e) {
        console.error("Error: " + e.message);
    }
})();
