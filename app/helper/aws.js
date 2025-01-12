const AWS = require("aws-sdk");
const { S3 } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const path = require("path");
const { v4 } = require("uuid");
const fs = require("fs");
const QRCode = require('qrcode');

module.exports = {
  aws: async (file, folderName = null) => {
    try {
      if (process.env.AWS == "true") {
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_KEY,
          region: process.env.AWS_BUCKET_REGION || "ap-south-1",
        });

        const ext = path.extname(file.name);
        let imgPath = "";

        if (folderName) {
          imgPath = "mvikas/" + folderName + "/" + Date.now() + ext;
        } else {
          imgPath = "mvikas/" + Date.now() + ext;
        }

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: imgPath,
          Body: file.data,
        };

        return new Promise((resolve, reject) => {
          s3.upload(params, function (err, data) {
            if (err) {
              console.log("Error uploading to S3:", err);
              return reject(err);
            }
            console.log("File uploaded successfully:", data.Location);
            resolve(data);
          });
        });
      } else {
        var ext = path.extname(file.name);

        let fileName = v4() + Date.now() + ext;
        var base_path = __basedir;
        const folderPath = path.join(
          base_path,
          "uploads",
          "images",
          folderName
        );

        // Check if the folder exists, and create it if it doesn't
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        file.mv(base_path + `/uploads/images/${folderName}/` + fileName);
        // file.mv(base_path + "/storage/images/" + fileName);

        return {
          Key: folderName + "/" + fileName,
        };
      }
      // const getObjectResult = await client.getObject({
      //     Bucket: process.env.AWS_BUCKET_NAME,
      //     Key: "svr/" + Date.now() + ext,
      //     Body: file.data
      // });
      // return new Promise((resolve, reject) => {
      //     s3.upload(params, function (err, data) {
      //         if (err) {
      //             return Promise.reject(err);
      //         }
      //         return resolve(data);
      //     });
      // }).catch((err) => {
      //     console.log(err);
      //     return Promise.reject(err);
      // });
    } catch (error) {
      console.log("error", error);
    }
  },
  uploadPdfToS3: async (pdfBuffer, folderPath, fileName = null) => {
    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_BUCKET_REGION || "ap-south-1",
        correctClockSkew: true,
      });

      const contentType = "application/pdf";
      fileName = fileName ? `${fileName}.pdf` : `${Date.now()}.pdf`;
      const key = `m-vikas/${folderPath}/${fileName}`;

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: pdfBuffer,
        ContentType: contentType,
      };

      const result = await s3.upload(params).promise();
      return { key: result.Key, url: result.Location };
    } catch (error) {
      throw error;
    }
  },
  generateQr: async (data, qrcode_name) => {
    const color = {
      dark: '#EB5A11', // Dark color (foreground)
      light: '#FFF' // Light color (background)
    };
    let qrcode = await QRCode.toDataURL(data);
    var base64Data = qrcode.replace('data:image/png;base64,', "");
    const buffer = Buffer.from(base64Data, "base64");

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_BUCKET_REGION,
    });
    let imgPath = "mv-load/" + qrcode_name + ".png";
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imgPath,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png'
    };

    return new Promise((resolve, reject) => {
      s3.upload(params, function (err, data) {
        if (err) {
          console.log("error", err);
          return Promise.reject(err);
        }

        return resolve(data.Location);
      });
    });

  },
  uploadExcelfile: async (bufferData, folderPath, fileName = null) => {
    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_BUCKET_REGION || "ap-south-1",
        correctClockSkew: true,
      });

      const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileName = fileName ? `${fileName}.xlsx` : `${Date.now()}.xlsx`;
      const key = `m-vikas/${folderPath}/${fileName}`;

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: bufferData,
        ContentType: contentType,
      };

      const result = await s3.upload(params).promise();
      return { key: result.Key, url: result.Location };
    } catch (error) {
      throw error;
    }
  }
};
