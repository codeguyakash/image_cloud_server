import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const checkFileType = (file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).array("file", 25);

app.get("/images", (req, res) => {
  async function getAllImages() {
    try {
      const result = await cloudinary.search
        .expression("enermaxx_solar/resource_type:jpg")
        .execute();

      console.log(result.resources);
    } catch (error) {
      console.error("Error fetching images from Cloudinary:", error);
      throw error;
    }
  }
  getAllImages()
    .then((images) => {
      console.log("All images:", images);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

////
app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send({ message: err });
    }
    if (req.files === undefined || req.files.length === 0) {
      return res.status(400).send({ message: "No files selected!" });
    }
    try {
      const uploadPromises = req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "uploads",
        });
        fs.unlinkSync(file.path);
        return result.secure_url;
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      res.send({
        message: "Files uploaded successfully!",
        files: uploadedFiles,
      });
    } catch (uploadError) {
      res
        .status(500)
        .send({ message: "Cloudinary upload failed", error: uploadError });
    }
  });
});

// app.get("/delete_folder", (req, res) => {
//   cloudinary.api.delete_folder("uploads").then((ress) => console.log(ress));

//   res.status(200).json({ msg: "ddd" });
// });

app.listen(PORT, () => console.log(`[Server Running...${PORT}]`));
