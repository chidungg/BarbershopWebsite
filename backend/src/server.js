import "dotenv/config";
import { app } from "./app";
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
    console.log(`Barbershop backend is running at http://localhost:${port}`);
});
const shutdown = (signal) => {
    console.log(`${signal} received. Closing HTTP server...`);
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
