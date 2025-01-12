const express = require("express");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const redoc = require("redoc-express");
const db = require("./models");
const app = express();
const fileUpload = require("express-fileupload");
require("dotenv").config();
const port = process.env.PORT;
const cors = require("cors");
const expressWinston = require("express-winston");
const winston = require("winston");
const acceptLanguageParser = require("accept-language-parser");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const cron = require("node-cron");
const { sendMIS } = require("./app/v1/mvload/Service/CronService");
const {
  ewayExpiry,
  orderApprovalPending,
  generatePoApproval,
} = require("./cron/cronmanager");
global.__basedir = __dirname;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(cors());
// app.use(async (req, res, next) => {
//   const languages = acceptLanguageParser.parse(req.headers["accept-language"]);

//   const language = languages && languages.length ? languages[0].code : "en";
//   console.log(language);
//   // Set the locale for the request
//   await i18n.configure({
//     locales: ["en", "hi", "ass"],
//     directory: __dirname + "/locales",
//     defaultLocale: language,
//   });

//   next(); // Proceed to the next middleware
// });
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

//Start logger code
const requestLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console(), // Log to the console for development
    new DailyRotateFile({
      filename: "logs/%DATE%/info.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),
    new DailyRotateFile({
      filename: "logs/%DATE%/error.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    new DailyRotateFile({
      filename: "logs/%DATE%/warn.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "warn",
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true, // Disable logging metadata (such as response time)
  msg: "HTTP {{req.method}} {{res.statusCode}} {{res.responseTime}}ms {{req.url}}",
  expressFormat: true,
  colorize: false,
  // skip: skipLoggerForBaseURL, // Skip logging for base URL
});

// Attach the request logger middleware to all routes
if (process.env.NODE_ENV != "development")
  app.use(requestLogger);
//end logger code

// Configure i18n

app.get("/", (req, res) => {
  res.send("hello");
});
// Set the views folder and use EJS as the template engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

require("./routes/index")(app);
//app.use('/admin/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinitionOfAdmin));

app.use("/uploads", express.static("uploads"));

global.__basedir = __dirname;
let environment = process.env.NODE_ENV;
db.sequelize
  .authenticate()
  .then(function () {
    if (environment == "test" || environment == "development") {
      app.listen(port, () => {
        cron.schedule("* * * * *", function () {
          // console.log("Cron is working");
        });
        cron.schedule("0 6 * * *", function () {
          sendMIS();
        });

        //Every 8 hour
        cron.schedule("0 */8 * * *", function () {
          ewayExpiry();
        });

        //Everyday 12 am
        cron.schedule("0 0 * * *", function () {
          orderApprovalPending();
          generatePoApproval();
        });

        console.log(`Local/Development environment listening on port ${port}`);
      });
    } else if (environment == "production") {
      var privateKey = fs.readFileSync("./ssl/privkey.pem");
      var certificate = fs.readFileSync("./ssl/fullchain.pem");
      // var ca = fs.readFileSync('gd_bundle-g2-g1.crt');
      var credentials = {
        key: privateKey,
        cert: certificate,
        // ca: ca
      };
      var server = require("https").createServer(credentials, app);

      server.listen(port, () => {
        //send mis evry day at 10:00 AM
        cron.schedule("0 10 * * *", function () {
          sendMIS();
        });

        console.log(`Live environment listening on port ${port}`);
      });
    }
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
