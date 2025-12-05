const CONFIG = {
    mqtt: {
        broker: 'ws://localhost:9001',
        options: {
            clientId: 'lampu_4led_web_client_' + Math.random().toString(16).substr(2, 8),
            username: '',
            password: '',
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        }
    },
    topics: {
        commandPrefix: 'lampu/led',
        allCommand: 'lampu/all/command',
        intensityPrefix: 'lampu/intensity/',
        colorPrefix: 'lampu/color/',
        status: 'lampu/status',
        config: 'lampu/config'
    },
    numLEDs: 4,
    statusTimeout: 5000
};

