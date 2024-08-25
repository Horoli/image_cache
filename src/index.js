const Fastify = require("fastify");
const fs = require("fs");
const Axios = require("axios");
const crypto = require("crypto");
const path = require("path");
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
        throw Error("url is empty");
      }

      const hash = crypto.createHash("sha256").update(url).digest("hex");

      const getImageDirPath = path.join(__dirname, "image");

      const fileList = fs.readdirSync(getImageDirPath);

      const fileObjects = fileList.reduce((acc, file) => {
        const [filename, fileType] = file.split(".");
        let fileObject = {};

        fileObject["name"] = filename;
        fileObject["type"] = fileType;

        acc.push(fileObject);
        return acc;
      }, []);

      const getFileInfo = fileObjects.filter((file) =>
        file.name.includes(hash)
      );
      //
      //

      // TODO : getFileInfo가 비어있으면 axios.get으로 이미지를 받아와서 fs에 저장
      if (getFileInfo.length === 0) {
        console.log(`[${new Date().toLocaleString()}] getting Image...`);
        try {
          const result = await Axios({
            method: "get",
            url: url,
            responseType: "stream",
          }).then(async (response) => {
            return response;
          });
          const contentType = result.headers["content-type"];
          const saveType = contentType.split("/")[1];

          const filePath = path.join(__dirname, `/image/${hash}.${saveType}`);
          const writer = fs.createWriteStream(filePath);

          await new Promise((resolve, reject) => {
            result.data.pipe(writer);

            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          const readFile = fs.readFileSync(filePath);
          rep.type(`image/${saveType}`).send(readFile);
        } catch {
          console.error("Error during image download or save:", error);
          rep.status(500).send("Failed to download or save the image.");
        }

        return;
      }

      const file = `${getFileInfo[0].name}.${getFileInfo[0].type}`;
      const filePath = path.join(__dirname, `/image/${file}`);
      const readFile = fs.readFileSync(filePath);
      rep.type(`image/${getFileInfo[0].type}`).send(readFile);
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
