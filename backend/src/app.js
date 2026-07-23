import cors from "cors";
import express from "express";
export const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (_request, response) => {
    response.status(200).json({
        success: true,
        message: "Barbershop backend is running"
    });
});
app.get("/api/health", (_request, response) => {
    response.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});
app.use((request, response) => {
    response.status(404).json({
        success: false,
        message: `Route ${request.method} ${request.originalUrl} not found`
    });
});
app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
        success: false,
        message: "Internal server error"
    });
});
