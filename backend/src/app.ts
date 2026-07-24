import cors from "cors";
import express,{type NextFunction, type Request, type Response} from "express";
import { env } from "./config/env";

import {createSupabaseAuthClient, supabase} from "./lib/supabase";

export const app = express();


app.disable("x-powered-by");

app.use(
    cors({

        origin: env.frontendUrl,
        credentials: true
    })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_request: Request, respond: Response)=>{
    respond.status(200).json({
        success: true,
        message: "Barbershop API is running"
    })
});

app.get("/api/health", async (_request: Request, respond: Response, next: NextFunction)=>{
    try {
        const { data, error } = await supabase.from("shop_settings").select("id, shop_name, timezone, currency").limit(1).single();

        if (error) {
            throw error;
        }

        respond.status(200).json({
            success: true,
            message: "Connected to the database successfully",
            data
        });
    } catch (error) {
        next(error);
    }
});

app.post("/api/auth/login", async (request: Request, respond: Response)=>{
    const body = request.body as{
        email?: unknown;
        password?: unknown;
    };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    if (!email || !password) {
        return respond.status(400).json({
            success: false,
            code: "missing_credentials",
            message: "Email and password are required"
        });
    }
    try {
        const supabaseAuthClient = createSupabaseAuthClient();
        const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            console.error("Login error:", {
                name: error.name,
                code: error.code,
                message: error.message,
                status: error.status,
            }
            );
            if(error.code === "invalid_credentials") {
                return respond.status(401).json({
                    success: false,
                    code: "invalid_credentials",
                    message: "Invalid email or password"
                });
            }
            return respond.status(503).json({
                success: false,
                code: "supabase_service_unavailable",
                message: "Supabase service unavailable. Please try again later.",
            });
        }
        
        
        if (!data.user|| !data.session) {
            return respond.status(503).json({
                success: false,
                code: "supabase_service_unavailable",
                message: "Supabase service unavailable. Please try again later."
            });
        }

        const isProduction = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax" as const,
            path: "/",
        };
        respond.cookie("sb-access-token", data.session.access_token, {
            ...cookieOptions,
            maxAge: data.session.expires_in * 1000,
        });
        respond.cookie("sb-refresh-token", data.session.refresh_token, {
            ...cookieOptions,
            maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
        });
        return respond.status(200).json({
            success: true,
            code: "login_success",
            message: "Login successful",
            data:{
                id: data.user.id,
                email: data.user.email,
            }
        });


    } catch (error) {
        console.error("Cannot connect to Supabase Authentication:", error);
        return respond.status(503).json({
            success: false,
            code: "supabase_service_unavailable",
            message: "Supabase service unavailable. Please try again later.",
        });
    }
});
app.use((request: Request, respond: Response, )=>{
    respond.status(404).json({
        success: false,
        message: `Route ${request.method} ${request.originalUrl} not found`
    });
});

app.use((error: unknown, _request: Request, respond: Response, _next: NextFunction)=>{
    console.error("Backend error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    respond.status(500).json({
        success: false,
        message: "Database connection error. Please check the backend logs for more details.",
        error: message
    });

});