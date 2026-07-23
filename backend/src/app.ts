import cors from "cors";
import express, {
    type NextFunction,
    type Request,
    type Response
} from "express";

export const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_request: Request, response: Response) => {
    response.status(200).json({
        success: true,
        message: "Barbershop backend is running"
    });
});

app.get("/api/health", (_request: Request, response: Response) => {
    response.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

app.use((request: Request, response: Response) => {
    response.status(404).json({
        success: false,
        message: `Route ${request.method} ${request.originalUrl} not found`
    });
});

app.use(
    (
        error: unknown,
        _request: Request,
        response: Response,
        _next: NextFunction
    ) => {
        console.error(error);

        response.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
);