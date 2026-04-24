 

 const job = require('node-schedule');

export function scheduleCronJob(cronExpression: string, callback: () => void) {
    job.scheduleJob(cronExpression, callback);
}
