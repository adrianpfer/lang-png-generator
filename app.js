const puppeteer = require('puppeteer');
const fs = require('fs');
const XLSX = require('xlsx');

const generatePNG = async (page, outputPath) => {
	try {
		await page.screenshot({
			path: outputPath,
			fullPage: true,
			omitBackground: true,
		});
	} catch (error) {
		console.error('❌ Error generando PNG:', error);
		throw error;
	}
};

const generateAndSavePNG = async (
	page,
	htmlContent,
	outputPath,
	viewportWidth,
	viewportHeight,
	className
) => {
	try {
		await page.setViewport({ width: viewportWidth, height: viewportHeight });
		if (viewportHeight > viewportWidth) {
			htmlContent = htmlContent.replace(
				'<body class="ltr">',
				'<body class="ltr portrait">'
			);
		} else {
			htmlContent = htmlContent.replace(
				'<body class="ltr">',
				'<body class="ltr landscape">'
			);
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
		let htmlWithCSS = htmlTemplate.replace(
			/<link\s+rel="stylesheet"\s+href="css\/styles\.css"\s*\/??>/i,
			`<style>${cssContent}</style>`
		);
		htmlWithCSS = htmlWithCSS.replace(/<!--[\s\S]*?-->/g, '');

		const workbook = XLSX.readFile('i18n/hora_planeta_2025_CMS.xlsx');
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

		const headers = data[0];
		const translations = data.slice(1);

		if (!fs.existsSync('png')) fs.mkdirSync('png');
		if (!fs.existsSync('png/landscape')) fs.mkdirSync('png/landscape');
		if (!fs.existsSync('png/portrait')) fs.mkdirSync('png/portrait');

		const languageKeys = headers.slice(1);

		for (const lang of languageKeys) {
			const langData = translations.map((row) => row[headers.indexOf(lang)]);

			if (!langData.some((text) => text && text.trim())) {
				console.log(`⚠️ No se generó PNG para el idioma ${lang}`);
				continue;
			}

			let htmlContent = htmlWithCSS;
			const placeholders = {
				'{T1}': langData[0] || '',
				'{T2}': langData[1] || '',
				'{T3}': langData[2] || '',
				'{T4}': langData[3] || '',
				'{T5}': langData[4] || '',
			};

			for (const [key, value] of Object.entries(placeholders)) {
				htmlContent = htmlContent.replace(new RegExp(key, 'g'), value);
			}

			const landscapePath = `png/landscape/${lang}.png`;
			const portraitPath = `png/portrait/${lang}.png`;

			await generateAndSavePNG(
				page,
				htmlContent,
				landscapePath,
				2560,
				1600,
				'landscape'
			);
			await generateAndSavePNG(
				page,
				htmlContent,
				portraitPath,
				1920,
				2864,
				'portrait'
			);
		}
	} catch (error) {
		console.error('❌ Error en el proceso principal:', error);
	} finally {
		if (browser) await browser.close();
	}
})();
