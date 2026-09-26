const { server, startServer } = require('./backend/server');
const net = require('net');

const PREFERRED_PORT = Number(process.env.PORT || 3000);

function listenOnAvailablePort(port, attemptsLeft = 20) {
    server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
            console.warn(`Port ${port} is already in use; trying port ${port + 1}...`);
            listenOnAvailablePort(port + 1, attemptsLeft - 1);
            return;
        }
        console.error('Could not start the server:', error.message);
        process.exitCode = 1;
    });

    server.listen(port, '0.0.0.0', () => {
        const actualPort = server.address().port;
        console.log(`Beacon Light School System API and frontend server running at http://localhost:${actualPort}.`);
        startServer().catch((err) => {
            console.error('Startup background initialization failed:', err?.message || err);
        });
    });
}

listenOnAvailablePort(PREFERRED_PORT);
