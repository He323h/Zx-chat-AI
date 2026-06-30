import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "app.vercel.zx_chat_ai.twa",
      sha256_cert_fingerprints: [
        "EF:AF:1D:B9:84:A6:3B:24:9E:ED:E5:63:7F:E7:5B:13:A4:94:DD:91:58:94:09:CA:6B:87:29:2C:7D:75:AB:7B",
      ],
    },
  },
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.zxchat.ai",
      sha256_cert_fingerprints: [
        "FE:03:EA:69:20:84:9C:37:5D:3A:AD:42:45:A8:AD:F6:19:06:35:66:4C:02:24:B2:1B:EB:A8:48:12:28:E0:F8",
      ],
    },
  },
];

app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(ASSET_LINKS);
});

export default app;
