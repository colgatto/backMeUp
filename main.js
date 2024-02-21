const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const cron = require('node-cron');
const { Client } = require('ssh2');
const config = require('./config');

const validType = ['sql','file','exec'];

//#region PATH UTILS

const timestr = () => {
	const now = new Date();
	return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
		+ `_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
		+ `.${now.getMilliseconds().toString().padStart(3, '0')}`;
}

const setupDir = (name) => {
	if(!fs.existsSync(name)){
		fs.mkdirSync(name);
	}else if(!fs.statSync(name).isDirectory()){
		throw new Error(`[${name}] is not a directory`);
	}
};

const makeFilePath = (dir, filename) => {
	const dirPath = path.join(config.backup_dir, dir);
	setupDir(dirPath);
	return path.join(dirPath, filename);
};

//#endregion

//#region TAR UTILS

const validateMd5 = (filepath, md5) => new Promise((resolve, reject) => {
	const hash = createHash('md5');		  
	const rs = fs.createReadStream(filepath);
	rs.on('data', (data) => {
		hash.update(data);
	});
	rs.on('end', () => {
		resolve(hash.digest('hex') === md5);
	});
});

const get = (conn, name, filename, tarDefName = null) => new Promise(async (resolve, reject) => {

	const conf = config.backups[name];
	const tarName = tarDefName === null ? `${filename}.tar.gz` : tarDefName;
	if(conf.sudo) await exec(conn, `echo "${conf.sudo}" | sudo -S chmod 666 "/tmp/backMeUp/${filename}"`);
	await exec(conn, `cd /tmp/backMeUp && tar -zcf "${tarName}" "${filename}"`);
	await exec(conn, `rm "/tmp/backMeUp/${filename}"`);
	const std = await exec(conn, `md5sum "/tmp/backMeUp/${tarName}"`);
	const remoteMd5 = std.out.split(' ')[0];
	if(!remoteMd5.match(/^[a-f0-9]{32}$/)) return reject('Invalid MD5');
	conn.sftp((err, sftp) => {
		if (err) return reject(err);
		const localePath = makeFilePath(name, tarName); 
		sftp.fastGet(`/tmp/backMeUp/${tarName}`, localePath, async (err) => {
			if (err) return reject(err);
			if(!(await validateMd5(localePath, remoteMd5))) return reject('MD5 mismatch');
			await exec(conn, `rm "/tmp/backMeUp/${tarName}"`);
			resolve();
		});
	});
});

//#endregion

//#region MAIN TYPE

const exec = (conn, com) => new Promise((resolve, reject) => {
	const std = {
		out: '',
		err: '',
		code: null,
		signal: null
	};
	conn.exec(com, (err, stream) => {
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

const execToFile = async (conn, name) => {

	const conf = config.backups[name];
	const filename = `${name}_${timestr()}.log`;
	
	const command = typeof conf.sudo == 'undefined' ? conf.command : `echo "${conf.sudo}" | sudo -S ${conf.command}`;

	await exec(conn, `${command} > "/tmp/backMeUp/${filename}"`);
	await get(conn, name, filename);
};

const fileToFile = async (conn, name) => {

	const conf = config.backups[name];
	const filename = path.basename(conf.path);
	
	const command = `cp "${conf.path}" "/tmp/backMeUp/${filename}"`;

	await exec(conn, typeof conf.sudo == 'undefined' ? command : `echo "${conf.sudo}" | sudo -S ${command}`);
	await get(conn, name, filename, `${name}_${timestr()}.tar.gz`);

};

const sqldump = async (conn, name) => {

	const conf = config.backups[name];
	const filename = `${name}_${timestr()}.sql`;

	let ignore = '';
	if(conf.ignore){
		if(!(conf.ignore instanceof Array)){
			conf.ignore = [conf.ignore];
		}
		ignore = conf.ignore.map(v => `--ignore-table=${v}`).join(' ');
	}
	let command = `mysqldump ${conf.database} -u ${conf.auth.username} -p'${conf.auth.password}'${conf.skipTriggers?' --skip-triggers': ''} ${ignore} > "/tmp/backMeUp/${filename}"`;
	if(typeof conf.sudo != 'undefined'){
		command = `echo "${conf.sudo}" | sudo -S ${command}`;
	}

	await exec(conn, command);
	await get(conn, name, filename);

};

//#endregion

//#region ENGINE

const run = (name) => {
	
	if(config.verbose) console.log(`[${new Date().toLocaleString()}] Start ${name}`);

	const conf = config.backups[name];

	if(!validType.includes(conf.type)) throw new Error('invalid type for ' + name);

	const conn = new Client();
	conn.on('ready', async () => {
		await exec(conn, 'mkdir -p /tmp/backMeUp');

		switch (conf.type) {
			case 'sql':
				await sqldump(conn, name);
				break;
			case 'exec':
				await execToFile(conn, name);
				break;
			case 'file':
				await fileToFile(conn, name);
				break;
			default:
				throw new Error(`Can't find type for ${name} config.js`);
		}

		conn.end();
		
		if(config.verbose) console.log(`[${new Date().toLocaleString()}] End ${name}`);

	}).connect(conf.host);
	
}

//#endregion

//#region CODE

/**
run('skill_sql');
run('test_file');
run('test_exec');
/**/

setupDir(config.backup_dir);

const backups = Object.keys(config.backups);
for (let i = 0; i < backups.length; i++) {
	const bname = backups[i];

	if(!bname.match(/^[a-zA-Z0-9_]+$/)) throw new Error('backup name must contain only letter, number and underscore');
	const bdata = config.backups[bname];

	if(!bdata.cron) throw new Error('config must have cron');

	if(config.verbose) console.log(`[${new Date().toLocaleString()}] Add job ${bname} [${bdata.cron}]`);
	cron.schedule(bdata.cron, () => {
		run(bname);
	});

}

//#endregion