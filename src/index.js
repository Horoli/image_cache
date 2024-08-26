const Fastify = require("fastify");
const fs = require("fs");
const Axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const os = require("os");
const Stream = require("stream");
// const HImageCache = require("./Utility/h_image_cache");

class StreamDuplicater extends Stream.Readable {
  constructor(stream) {
    super({
      read() {},
    });

    stream.on("data", (chunk) => {
      this.push(chunk);
    });
    stream.on("end", (_) => {
      this.push(null);
    });
    stream.on("error", (err) => {
      this.emit("error", err);
    });
  }
}

class WebServer {
  constructor(opts = {}) {
    this.$opts = opts;
    this.$webServer = Fastify({
      trustProxy: true,
    });

    this.$initRoute();
  }

  $initRoute() {
    const imageDirPath =
      os.platform() === "linux" ? "/mnt/data" : path.join(__dirname, "image");

    this.$webServer.get("/image/:hash", async function (req, rep) {
      const { hash } = req.params;
      const cachedImagePath = path.join(imageDirPath, hash);
      const chacedImageMetaPath = path.join(imageDirPath, `${hash}.meta`);

      if (!fs.existsSync(cachedImagePath)) {
        return rep.status(404).send("Image not found");
      }

      const cachedImage = fs.readFileSync(cachedImagePath);
      const metadata = JSON.parse(
        fs.readFileSync(chacedImageMetaPath, "utf-8")
      );
      rep.headers(metadata);
      return rep.send(cachedImage);
    });

    this.$webServer.post("/image", async function (req, rep) {
      const { url } = req.body;
      console.log(url);

      if (!url) {
        return rep.status(400).send("url is empty");
      }

      const hash = crypto.createHash("sha256").update(url).digest("hex");
      const cachedImagePath = path.join(imageDirPath, hash);
      const chacedImageMetaPath = path.join(imageDirPath, `${hash}.meta`);
      rep.header("image-hash", hash);

      try {
        if (!fs.existsSync(imageDirPath)) {
          fs.mkdirSync(imageDirPath, { recursive: true });
        }

        const cacheExists = fs.existsSync(cachedImagePath);
        /// 이미지가 캐시되어 있는 경우
        /// metadata를 headers에 추가하고 캐시된 이미지를 반환
        if (cacheExists) {
          console.log(
            `[${new Date().toLocaleString()}] return cached Image...`
          );
          const metadata = JSON.parse(
            fs.readFileSync(chacedImageMetaPath, "utf-8")
          );
          rep.headers(metadata);
          if (req.headers["hash-only"] === "true") {
            return rep.send("ok");
          }
          const cachedImage = fs.readFileSync(cachedImagePath);
          return rep.send(cachedImage);
        }

        console.log(`[${new Date().toLocaleString()}] Downloading image...`);
        const { data: imageStream, headers } = await Axios({
          method: "get",
          url: url,
          responseType: "stream",
        });

        const contentType = headers["content-type"];
        if (!contentType.startsWith("image/")) {
          return rep.status(400).send("Content type is not an image");
        }

        const imgStream1 = new StreamDuplicater(imageStream);
        const imgStream2 = new StreamDuplicater(imageStream);

        const writeStream = fs.createWriteStream(cachedImagePath);
        fs.writeFileSync(chacedImageMetaPath, JSON.stringify(headers));

        await new Promise((resolve, reject) => {
          imgStream1.pipe(writeStream);
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });

        console.log(`[${new Date().toLocaleString()}] Image download complete`);
        rep.headers(headers);
        if (req.headers["hash-only"] === "true") {
          imgStream2.destroy();
          return rep.send("ok");
        }
        return rep.send(imgStream2);
      } catch (err) {
        //
        console.error("Error during image processing:", err);
        return rep.status(500).send("Failed to download or serve the image.");
      }
    });
  }

  async start() {
    this.$webServer.listen({
      host: this.$opts.host,
      port: this.$opts.port,
    });
    console.log(`[${new Date().toLocaleString()}] Server Started`);
  }
}

module.exports = WebServer;
