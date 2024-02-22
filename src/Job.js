const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const cronstrue = require('cronstrue');
const { Client } = require('ssh2');
const config = require('../config');
const utils = require('./utils');

const validType = ['sql','file','exec'];

class Job{
	
	constructor(name){

		this.name = name;
		this.conf = config.backups[name];
		this.host = this.conf.host;
		this.type = this.conf.type;
		this.cron = this.conf.cron;

		this.#validateConf();
	}

	#validateConf(){
		if(!this.name.match(/^[a-zA-Z0-9_]+$/)) throw new Error('backup name must contain only letter, number and underscore');
		if(!validType.includes(this.type)) throw new Error('invalid type for ' + this.name);
		if(!this.cron) throw new Error('config must have cron');
		if(!this.host) throw new Error('config must have host data');
		if(!this.host.username) throw new Error('host data must have username');
		if(!this.host.password && !this.host.privateKey) throw new Error('host data must have password or privateKey');
	}

	start(){
		if(config.verbose) console.log(`[${new Date().toLocaleString()}] Add job ${this.name} [${cronstrue.toString(this.cron)}]`);
		cron.schedule(this.cron, () => {
			this.#run();
		});
	}

	#run(){

		if(config.verbose) console.log(`[${new Date().toLocaleString()}] Start ${this.name}`);

		this.conn = new Client();

		this.conn.on('ready', async () => {

			await this.#exec('mkdir -p /tmp/backMeUp');

			switch (this.type) {
				case 'sql':
					await this.#sqldump();
					break;
				case 'exec':
					await this.#execToFile();
					break;
				case 'file':
					await this.#fileToFile();
					break;
			}
			
			this.conn.end();

			this.#deleteOlder();

			if(config.verbose) console.log(`[${new Date().toLocaleString()}] End ${this.name}`);

		}).connect(this.host);
	}

	#exec(command){
		return new Promise(async (resolve, reject) => {
			const std = {
				out: '',
				err: '',
				code: null,
				signal: null
			};
			this.conn.exec(command, (err, stream) => {
				if (err) reject(err);
				stream.on('close', (code, signal) => {
					std.code = code;
					std.signal = signal;
					resolve(std);
				}).on('data', (data) => {
					std.out += data;
				}).stderr.on('data', (data) => {
					std.err += data;
				});
			});
		});
	}

	async #sqldump(){
		const filename = `${this.name}_${utils.timestr()}.sql`;

		let ignore = [];
		if(this.conf.ignore){
			ignore = this.conf.ignore instanceof Array ? this.conf.ignore : [this.conf.ignore];
		}
		ignore = ignore.map(v => `--ignore-table=${v}`).join(' ');

		let command = `mysqldump ${this.conf.database} -u ${this.conf.auth.username} -p'${this.conf.auth.password}'${this.conf.skipTriggers?' --skip-triggers': ''} ${ignore} > "/tmp/backMeUp/${filename}"`;
		if(typeof this.conf.sudo != 'undefined'){
			command = `echo "${this.conf.sudo}" | sudo -S ${command}`;
		}

		await this.#exec(command);
		await this.#get(filename);
	}

	async #execToFile(){
		const filename = `${this.name}_${utils.timestr()}.log`;

		const command = typeof this.conf.sudo == 'undefined' ? this.conf.command : `echo "${this.conf.sudo}" | sudo -S ${this.conf.command}`;

		await this.#exec(`${command} > "/tmp/backMeUp/${filename}"`);
		await this.#get(filename);
	}

	async #fileToFile(){
		const filename = path.basename(this.conf.path);
		
		const command = `cp "${this.conf.path}" "/tmp/backMeUp/${filename}"`;

		await this.#exec(typeof this.conf.sudo == 'undefined' ? command : `echo "${this.conf.sudo}" | sudo -S ${command}`);
		await this.#get(filename, `${this.name}_${utils.timestr()}.tar.gz`);
	}

	#get(filename, tarDefName = null){
		return new Promise(async (resolve, reject) => {

			const tarName = tarDefName === null ? `${filename}.tar.gz` : tarDefName;
			if(this.conf.sudo) await this.#exec(`echo "${this.conf.sudo}" | sudo -S chmod 666 "/tmp/backMeUp/${filename}"`);
			await this.#exec(`cd /tmp/backMeUp && tar -zcf "${tarName}" "${filename}"`);
			await this.#exec(`rm "/tmp/backMeUp/${filename}"`);
			const std = await this.#exec(`md5sum "/tmp/backMeUp/${tarName}"`);
			const remoteMd5 = std.out.split(' ')[0];
			if(!remoteMd5.match(/^[a-f0-9]{32}$/)) return reject('Invalid MD5');
			this.conn.sftp((err, sftp) => {
				if (err) return reject(err);
				const localePath = utils.makeFilePath(this.name, tarName); 
				sftp.fastGet(`/tmp/backMeUp/${tarName}`, localePath, async (err) => {
					if (err) return reject(err);
					if(!(await utils.validateMd5(localePath, remoteMd5))) return reject('MD5 mismatch');
					await this.#exec(`rm "/tmp/backMeUp/${tarName}"`);
					resolve();
				});
			});

		});
	}

	async #deleteOlder(){
		if(!this.conf.retentionDays) return;
		if(typeof this.conf.retentionDays != 'number' || this.conf.retentionDays < 0) throw new Error('retentionDays must be positive number');
		const dirPath = path.join(config.backup_dir, this.name);

		const files = fs.readdirSync(dirPath);
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const filepath = path.join(dirPath, file);
			if (fs.statSync(filepath).ctime < Date.now() - this.conf.retentionDays * 24 * 60 * 60 * 1000) fs.unlinkSync(filepath);
		}
	}

}

module.exports = Job;