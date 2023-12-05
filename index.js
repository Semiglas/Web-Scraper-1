const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
//u can specify the block type
fs.mkdirSync("stitches", { recursive: true });

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://codestich.login", [
    "clipboard-read",
  ]);
  const initialPage = "https://codestitch.app/app";
  await page.goto("https://codestitch.app/login", {
    waitUntil: "domcontentloaded",
  });
  //TODO login with your acc, find a link with multiple stitches
  //then create a code to come back to this stitch after each iteration
  await page.waitForSelector("#email");
  await page.type("#email", "semiglas.production@gmail.com"),
    await page.type("#pass", "Danilkovoron2"),
    await Promise.all([page.waitForNavigation(), page.click("#rename-folder")]);

  // doing one section by one
  const initialSectionPage =
    "https://codestitch.app/app/dashboard/catalog/sections/55";
  await page.goto(initialSectionPage);

  const stitches = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".stitch"), (e) => {
      return {
        codeBlocks: e
          .querySelector("button.get-code-btn")
          .getAttribute("data-href"),
        figmaLink: e.querySelector("a.show-figma-btn")?.href,
        preview: e.querySelector("a.preview-btn").href,
      };
    })
  );

  for (let i = 0; i < stitches.length; i++) {
    await page.goto(initialSectionPage);
    stitches[i].figmaLink
      ? fs.writeFileSync("figma-link.txt", stitches[i].figmaLink)
      : fs.writeFileSync("figma-link.txt", "undefined");
    // here i move to a page with code
    await page.goto(stitches[i].codeBlocks);

    const page2 = await browser.newPage();
    await page2.goto(stitches[i].preview, { waitUntil: "networkidle2" });
    await page2.bringToFront();
    // Take a screenshot of the new tab
    await page2.setViewport({ width: 1366, height: 300 });
    await page2.screenshot({ path: "screenshot.png", fullPage: true });

    // Switch back to the previous tab
    await page.bringToFront();
    await page2.close();

    const SCSSButton = (await page.$("[data-css-type='SCSS']")) || undefined;

    (await SCSSButton?.click())
      ? console.log("all good")
      : page.click("[data-css-type='CSS']");

    let copyToClip = await page.$(".btn--copy");
    await copyToClip.click();
    const SCSSCode = await page.evaluate(() => navigator.clipboard.readText());
    fs.writeFileSync("styles.scss", SCSSCode);
    const HTMLButton = await page.$("[data-codetype='html']");
    await HTMLButton.click();
    copyToClip = await page.$(".btn--copy");
    await copyToClip.click();
    const HTMLCode = await page.evaluate(() => navigator.clipboard.readText());
    fs.writeFileSync("index.html", HTMLCode);

    const previewScreenshot = fs.readFileSync("screenshot.png");

    const readyHtml = fs.readFileSync("index.html", "utf-8");
    const readyCSS = fs.readFileSync("styles.scss", "utf-8");
    let readyFigma = "undefined";
    try {
      readyFigma = fs.readFile("figma-link.txt", "utf-8");
    } catch (err) {
      console.log(err);
    }

    // Move the files to the new directory
    const newDir = path.join("stitches", String(i));
    fs.mkdirSync(newDir, { recursive: true });
    const files = [
      "index.html",
      "styles.scss",
      "figma-link.txt",
      "screenshot.png",
    ];
    files.forEach((file) => {
      const oldPath = path.join(__dirname, file);
      const newPath = path.join(__dirname, newDir, file);
      fs.renameSync(oldPath, newPath);
    });

    // Move back to the original directory
    process.chdir(__dirname);
  }

  //avoid closing the browser to not face issues with permissions
  await browser.close();
}
run();

// TODO SO what i need now. i need to start a loop, so the browser does all that,then goes to initial page and does all that again, without aborting the session. I will need to write code to log in at the beginning as well.
