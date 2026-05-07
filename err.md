error ketika menjalankan "npm run dev"

[DB] Initialization error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
D:\Data_Aziz\2_Project_Web\Projects_JavaScript\unifi-middleware-app\node_modules\pg-pool\index.js:45
    Error.captureStackTrace(err)
          ^

Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
    at D:\Data_Aziz\2_Project_Web\Projects_JavaScript\unifi-middleware-app\node_modules\pg-pool\index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async initDatabase (file:///D:/Data_Aziz/2_Project_Web/Projects_JavaScript/unifi-middleware-app/src/db/database.js:22:5)
    at async file:///D:/Data_Aziz/2_Project_Web/Projects_JavaScript/unifi-middleware-app/src/index.js:20:1

Node.js v24.11.0
Failed running 'src/index.js'. Waiting for file changes before restarting...