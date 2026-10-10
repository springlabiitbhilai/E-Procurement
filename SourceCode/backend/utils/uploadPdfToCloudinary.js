import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const uploadPdfToCloudinary = async (pdfBuffer, folderName,fileName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: folderName,
        public_id: fileName,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );

    streamifier.createReadStream(pdfBuffer).pipe(stream);
  });
};

export default uploadPdfToCloudinary;
