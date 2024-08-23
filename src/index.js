const Fastify = require("fastify");
const fs = require("fs");
const Axios = require("axios");
const crypto = require("crypto");
const path = require("path");

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

      const result = await Axios({
        method: "get",
        url: url,
        responseType: "stream",
      })
        .then(async (response) => {
          const contentType = response.headers["content-type"];

          // TODO : Add content type check
          console.log("contentType", contentType);

          const saveType = contentType.split("/")[1];

          const hash = crypto.createHash("sha256").update(url).digest("hex");
          const filePath = path.join(__dirname, `/image/${hash}.${saveType}`);
          console.log(filePath);
          //  해당 경로에 hash와 같은 값의 파일이 존재하는지 확인 후 있으면 해당 파일을 반환
          if (fs.existsSync(filePath)) {
            return filePath;
          } else {
            await response.data.pipe(fs.createWriteStream(filePath));
          }

          return filePath;
        })
        .catch((error) => {
          console.log(error);
        });
      const readFile = fs.readFileSync(result);
      rep.type("image/png").send(readFile);
      //   return {
      //     image: readFile,
      //   };
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
