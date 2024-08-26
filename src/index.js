const Fastify = require("fastify");
const fs = require("fs");
const Axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const os = require("os");
// const HImageCache = require("./Utility/h_image_cache");

class WebServer {
  constructor(opts = {}) {
    this.$opts = opts;
    this.$webServer = Fastify({
      trustProxy: true,
    });

    this.$initRoute();
  }

  $initRoute() {
    this.$webServer.post("/image", async function (req, rep) {
      const { url } = req.body;
      console.log(url);

      if (!url) {
        return rep.status(400).send("url is empty");
      }

      const hash = crypto.createHash("sha256").update(url).digest("hex");
      const imageDirPath =
        os.platform() === "linux" ? "/mnt/data" : path.join(__dirname, "image");
      const cachedImagePath = path.join(imageDirPath, `${hash}`);

      try {
        // TODO : 이미지 저장 디렉토리가 없으면 생성
        if (!fs.existsSync(imageDirPath)) {
          fs.mkdirSync(imageDirPath, { recursive: true });
        }

        const cachedFile = fs
          .readdirSync(imageDirPath)
          .find((file) => file.startsWith(hash));

        if (cachedFile) {
          console.log(
            `[${new Date().toLocaleString()}] return cached Image...`
          );
          const cachedImage = fs.readFileSync(
            path.join(imageDirPath, cachedFile)
          );
          return rep
            .type(`image/${cachedFile.split(".").pop()}`)
            .send(cachedImage);
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

        const fileExtension = contentType.split("/").pop();
        const fullPath = `${cachedImagePath}.${fileExtension}`;
        const writer = fs.createWriteStream(fullPath);

        await new Promise((resolve, reject) => {
          imageStream.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        console.log(`[${new Date().toLocaleString()}] Image download complete`);
        const imageData = fs.readFileSync(fullPath);
        return rep.type(`image/${fileExtension}`).send(imageData);
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
