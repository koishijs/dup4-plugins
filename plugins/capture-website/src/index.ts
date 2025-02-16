// @ts-nocheck
import { Context, Schema, segment, Logger } from "koishi";
import captureWebsite from "capture-website";
import findChrome from "chrome-finder";

const logger = new Logger("capture-website");

if (process.env.NODE_ENV === "development") {
  logger.level = Logger.DEBUG;
}

export const name = "capture-website";

interface BrowserConfig {
  defaultViewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  proxyServer?: string;
}

export interface Config {
  browser: BrowserConfig;
}

export const defaultConfig = {
  browser: {
    defaultViewport: {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
    },
  },
} as Config;

export const Config: Schema<Config> = Schema.object({
  browser: Schema.object({
    defaultViewport: Schema.object({
      width: Schema.natural()
        .description("默认的视图宽度。")
        .default(defaultConfig.browser.defaultViewport.width),
      height: Schema.natural()
        .description("默认的视图高度。")
        .default(defaultConfig.browser.defaultViewport.height),
      deviceScaleFactor: Schema.number()
        .min(0)
        .description("默认的设备缩放比率。")
        .default(2),
    }),
    proxyServer: Schema.string().description("使用的代理服务器的地址"),
  }).description("浏览器设置"),
});

export const using = [] as const;

export interface Options {
  viewport?: string;
  fullPage?: boolean;
  darkMode?: boolean;
  type?: "png" | "jpeg" | "webp";
  quality?: number;
  scaleFactor?: number;
  timeout?: number;
  delay?: number;
  waitForElement?: string;
  element?: string;
  hideElements?: string;
  removeElements?: string;
  clickElement?: string;
  scrollToElement?: string;
  disableAnimations?: boolean;
  noJavascript?: boolean;
  script?: string;
  style?: string;
  header?: string;
  userAgent?: string;
  cookie?: string;
  authentication?: string;
  clip?: string;
  inset?: string;
}

const isUrl = (s: string) => /^(https?|file):\/\/|^data:/.test(s);

function makeOptions(options: Options, config: Config) {
  if (!options.viewport) {
    options.viewport = `${config.browser.defaultViewport.width}x${config.browser.defaultViewport.height}`;
  }

  if (!options.scaleFactor) {
    options.scaleFactor = config.browser.defaultViewport.deviceScaleFactor;
  }

  if (!options.type) {
    options.type = "png";
  }

  if (!options.quality && options.type !== "png") {
    options.quality = 1;
  }

  if (!options.timeout) {
    options.timeout = 60;
  }

  if (!options.delay) {
    options.delay = 0;
  }

  if (!options.disableAnimations) {
    options.disableAnimations = false;
  }

  options.launchOptions = {
    args: [],
    executablePath: findChrome(),
    defaultViewport: config.browser.defaultViewport,
  };

  if (config.browser.proxyServer) {
    options.launchOptions.args.push(
      `--proxy-server=${config.browser.proxyServer}`
    );
  }

  if (options.viewport) {
    const viewport = options.viewport.split("x");
    const width = +viewport[0];
    const height = +viewport[1];
    options.width = width;
    options.height = height;
  }
}

export async function render(
  urlOrContent: string,
  options: Options,
  config?: Config
): Promise<Buffer> {
  if (!config) {
    config = defaultConfig;
  }

  makeOptions(options, config);

  if (!isUrl(urlOrContent)) {
    options.inputType = "html";
  }

  logger.debug(`capture-website options:`, options);

  try {
    const image = await captureWebsite.buffer(urlOrContent, options);
    return image;
  } catch (error) {
    logger.debug(error);
    throw new Error("capture website failed.");
  }
}

export function apply(ctx: Context, config: Config) {
  ctx
    .command("capture-website <url>", "Capture Website", { authority: 2 })
    .alias("cw")
    .option("viewport", "-v <viewport:string> ViewPort")
    .option(
      "fullPage",
      "-f Capture the full scrollable page, not just the viewport"
    )
    .option("darkMode", "-d Emulate preference of dark color scheme")
    .option("type", "<type:string> Image type: png|jpeg|webp  [default: png]")
    .option(
      "quality",
      "-q <quality:number> Image quality: 0...1 (Only for JPEG and WebP)  [default: 1]"
    )
    .option(
      "scaleFactor",
      "-s <scaleFactor:number> Scale the webpage `n` times  [default: 2]"
    )
    .option("listDevices", "Output a list of supported devices to emulate")
    .option(
      "emulateDevice",
      "Capture as if it were captured on the given device"
    )
    .option("noDefaultBackground", "Make the default background transparent")
    .option(
      "timeout",
      "<timeout:number> Seconds before giving up trying to load the page. Specify `0` to disable.  [default: 60]"
    )
    .option(
      "delay",
      "<delay:number> Seconds to wait after the page finished loading before capturing the screenshot  [default: 0]"
    )
    .option(
      "waitForElement",
      "<waitForElement:string> Wait for a DOM element matching the CSS selector to appear in the page and to be visible before capturing the screenshot"
    )
    .option(
      "element",
      "<element:string> Capture the DOM element matching the CSS selector. It will wait for the element to appear in the page and to be visible."
    )
    .option(
      "hideElements",
      "<hideElements:string> Hide DOM elements matching the CSS selector (Can be set multiple times)"
    )
    .option(
      "removeElements",
      "<removeElements:string> Remove DOM elements matching the CSS selector (Can be set multiple times)"
    )
    .option(
      "clickElement",
      "<clickElement:string> Click the DOM element matching the CSS selector"
    )
    .option(
      "scrollToElement",
      "<scrollToElement:string> Scroll to the DOM element matching the CSS selector"
    )
    .option(
      "disableAnimations",
      "Disable CSS animations and transitions  [default: false]"
    )
    .option(
      "noJavascript",
      "Disable JavaScript execution (does not affect --module/--script)"
    )
    .option(
      "module",
      "Inject a JavaScript module into the page. Can be inline code, absolute URL, and local file path with `.js` extension. (Can be set multiple times)"
    )
    .option(
      "script",
      "<script:string> Same as `--module`, but instead injects the code as a classic script"
    )
    .option(
      "style",
      "<style:string> Inject CSS styles into the page. Can be inline code, absolute URL, and local file path with `.css` extension. (Can be set multiple times)"
    )
    .option(
      "header",
      "<header:string> Set a custom HTTP header (Can be set multiple times)"
    )
    .option("userAgent", "<userAgent:string> Set the user agent")
    .option(
      "cookie",
      "<cookie:string> Set a cookie (Can be set multiple times)"
    )
    .option(
      "authentication",
      "<authentication:string> Credentials for HTTP authentication"
    )
    .option(
      "inset",
      "<inset:string> Inset the screenshot relative to the viewport or `--element`. Accepts a number or four comma-separated numbers for top, right, left, and bottom."
    )
    .option(
      "clip",
      "<clip:string> Position and size in the website (clipping region). Accepts comma-separated numbers for x, y, width, and height."
    )
    .option("noBlockAds", "Disable ad blocking")
    .action(async ({ session, options }, url: string) => {
      if (!url) {
        return "Please enter URL.";
      }

      const scheme = /^(\w+):\/\//.exec(url);
      if (!scheme) {
        url = "https://" + url;
      }

      try {
        const image = await render(url, options, config);
        return segment.image(image);
      } catch (error) {
        return error.message;
      }
    });
}
