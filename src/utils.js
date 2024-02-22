const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const config = require('../config');

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

module.exports = {
	timestr,
	setupDir,
	makeFilePath,
	validateMd5
}