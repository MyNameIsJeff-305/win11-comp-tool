const AWS = require("aws-sdk");
const multer = require("multer");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const NAME_OF_BUCKET = "win11comptool";

const singleFileUpload = async ({ file, public = false }) => {
    const { originalname, buffer } = file;
    const path = require("path");

    const Key = new Date().getTime().toString() + path.extname(originalname);
    const uploadParams = {
        Bucket: NAME_OF_BUCKET,
        Key: public ? `public/${Key}` : Key,
        Body: buffer
    };
    const result = await s3.upload(uploadParams).promise();

    return public ? result.Location : result.Key;
};

const multipleFilesUpload = async ({ files, public = false }) => {
    return await Promise.all(
        files.map((file) => {
            return singleFileUpload({ file, public });
        })
    );
};

const retrievePrivateFile = (key) => {
    let fileUrl;
    if (key) {
        fileUrl = s3.getSignedUrl("getObject", {
            Bucket: NAME_OF_BUCKET,
            Key: key
        });
    }
    return fileUrl || key;
};

const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, "");
    },
});

const singleMulterUpload = (nameOfKey) =>
    multer({ storage: storage }).single(nameOfKey);
const multipleMulterUpload = (nameOfKey) =>
    multer({ storage: storage }).array(nameOfKey);

module.exports = {
    s3,
    singleFileUpload,
    multipleFilesUpload,
    retrievePrivateFile,
    singleMulterUpload,
    multipleMulterUpload
};