const WebSocket = require('ws');
let wss;

function initializeWebSocket(server) {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log('New client connected');
        
        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
}

function broadcastInventoryUpdate(item) {
    if (wss) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'inventory_update',
                    data: item
                }));
            }
        });
    }
}

module.exports = {
    initializeWebSocket,
    broadcastInventoryUpdate
};
