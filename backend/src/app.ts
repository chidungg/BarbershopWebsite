import cookieParser from "cookie-parser";
import cors from "cors";
import express, {type NextFunction,type Request,type Response} from "express";
import { env } from "./config/env";
import { supabase } from "./lib/supabase";
import adminRouter from "./modules/admin/adminRoute";
import { authRouter } from "./modules/auth/auth.route";
import { publicRouter } from "./modules/public/public.route";
export const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(authRouter);
app.use(publicRouter);
app.use("/api/administrator", adminRouter);

app.get("/",(_request: Request, response: Response) => {
    return response.status(200).json({
      success: true,
      message: "Barbershop API is running",
    });
  },
);
app.get("/api/health",async ( _request: Request, response: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("id, shop_name, timezone, currency")
        .limit(1)
        .single();
      if (error) {
        throw error;
      }
      return response.status(200).json({
        success: true,
        message: "Connected to the database successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);
app.use((request: Request, response: Response) => {
    return response.status(404).json({
      success: false,
      message:
        `Route ${request.method} ${request.originalUrl} not found`,
    });
  },
);
app.use(( error: unknown, _request: Request, response: Response, next: NextFunction) => {
    console.error("Backend error:", error);

    if (response.headersSent) {
      return next(error);
    }

    const message = error instanceof Error ? error.message : "Internal server error";
    return response.status(500).json({
      success: false,
      message:"Database connection error. Please check the backend logs for more details.",
      error: message,
    });
  },
);
