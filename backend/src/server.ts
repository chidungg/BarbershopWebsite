import {app} from './app';
import {env} from './config/env';

const server = app.listen(env.port, ()=>{
    console.log(`Server is running on port ${env.port}`);
});

function shutdown(signal: string) : void {
    console.log(`Received ${signal}. Shutting down server...`);
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));