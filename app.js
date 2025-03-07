const puppeteer = require('puppeteer');
const fs = require('fs');
const XLSX = require('xlsx');

const generatePNG = async (page, outputPath) => {
    try {
        await page.screenshot({ path: outputPath, fullPage: true, omitBackground: true });
    } catch (error) {
        console.error('❌ Error generando PNG:', error);
        throw error;
    }
};

const generateAndSavePNG = async (page, htmlContent, outputPath, viewportWidth, viewportHeight, className) => {
    try {
        await page.setViewport({ width: viewportWidth, height: viewportHeight });
        if (viewportHeight > viewportWidth) {
            htmlContent = htmlContent.replace('<body class="ltr">', '<body class="ltr portrait">');
        } else {
            htmlContent = htmlContent.replace('<body class="ltr">', '<body class="ltr landscape">');
        }
        await page.setContent(htmlContent, { waitUntil: 'load' });
        await generatePNG(page, outputPath);
        console.log(`✅ PNG generado (${className}): ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error generando el PNG para ${outputPath}:`, error);
    }
};

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const htmlTemplate = fs.readFileSync('html/index.html', 'utf-8');
        const cssContent = fs.readFileSync('css/styles.css', 'utf-8');
        let htmlWithCSS = htmlTemplate.replace('<link rel="stylesheet" href="css/styles.css">', `<style>${cssContent}</style>`);
        htmlWithCSS = htmlWithCSS.replace(/<!--[\s\S]*?-->/g, '');

        const workbook = XLSX.readFile('i18n/ramadan.xlsx');
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!fs.existsSync('png')) fs.mkdirSync('png');
        if (!fs.existsSync('png/landscape')) fs.mkdirSync('png/landscape');
        if (!fs.existsSync('png/portrait')) fs.mkdirSync('png/portrait');

        for (const row of data) {
            if (!row.T1 && !row.T2) {
                console.log(`⚠️ No se generó PNG para el idioma ${row.Idioma}`);
                continue;
            }
            
            let htmlContent = htmlWithCSS;
            const placeholders = {
                '{T1}': row.T1 || '',
                '{T2}': row.T2 || ''
            };

            for (const [key, value] of Object.entries(placeholders)) {
                htmlContent = htmlContent.replace(new RegExp(key, 'g'), value);
            }

            const landscapePath = `png/landscape/${row.Idioma}.png`;
            const portraitPath = `png/portrait/${row.Idioma}.png`;

            await generateAndSavePNG(page, htmlContent, landscapePath, 2560, 1600, 'landscape');
            await generateAndSavePNG(page, htmlContent, portraitPath, 1920, 2864, 'portrait');
        }
    } catch (error) {
        console.error('❌ Error en el proceso principal:', error);
    } finally {
        if (browser) await browser.close();
    }
})();
