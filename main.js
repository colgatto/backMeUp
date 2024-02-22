const utils = require('./src/utils');
const Job = require('./src/Job');
const config = require('./config');

utils.setupDir(config.backup_dir);

const backups = Object.keys(config.backups);
const jobs = [];

for (let i = 0; i < backups.length; i++) {
	const job = new Job(backups[i]);
	job.start();
	jobs.push(job);
}