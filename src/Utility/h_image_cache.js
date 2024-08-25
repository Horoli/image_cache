// const fs = require("fs");
// const Axios = require("axios");
// const crypto = require("crypto");
// const path = require("path");

// class HImageCache {
//   static async getImage(url) {
//     const hash = crypto.createHash("sha256").update(url).digest("hex");

//     const getImageDirPath = path.join(__dirname, "image");

//     const fileList = fs.readdirSync(getImageDirPath);

//     const fileObjects = fileList.reduce((acc, file) => {
//       const [filename, fileType] = file.split(".");
//       let fileObject = {};

//       fileObject["name"] = filename;
//       fileObject["type"] = fileType;

//       acc.push(fileObject);
//       return acc;
//     }, []);

//     const getFileInfo = fileObjects.filter((file) => file.name.includes(hash));

//     // TODO : getFileInfo가 비어있으면 axios.get으로 이미지를 받아와서 fs에 저장
//     if (getFileInfo.length === 0) {
//       try {
//         const result = await Axios({
//           method: "get",
//           url: url,
//           responseType: "stream",
//         }).then(async (response) => {
//           return response;
//         });
//         const contentType = result.headers["content-type"];
//         const saveType = contentType.split("/")[1];

//         const filePath = path.join(__dirname, `/image/${hash}.${saveType}`);
//         const writer = fs.createWriteStream(filePath);

//         await new Promise((resolve, reject) => {
//           result.data.pipe(writer);

//           writer.on("finish", resolve);
//           writer.on("error", reject);
//         });

//         const readFile = fs.readFileSync(filePath);
//         rep.type(`image/${saveType}`).send(readFile);
//       } catch {
//         console.error("Error during image download or save:", error);
//         rep.status(500).send("Failed to download or save the image.");
//       }

//       return;
//     }

//     const file = `${getFileInfo[0].name}.${getFileInfo[0].type}`;
//     const filePath = path.join(__dirname, `/image/${file}`);
//     const readFile = fs.readFileSync(filePath);
//     rep.type(`image/${getFileInfo[0].type}`).send(readFile);
//   }
// }

// module.exports = HImageCache;
